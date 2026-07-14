import { randomUUID } from "node:crypto";
import type { Mandate, MandateStore, MandateStyle } from "../store/mandate-store";
import { MandateInvalidError } from "./errors";

export interface CreateMandateInput {
  readonly agentId: string;
  readonly userId: string;
  readonly capitalMax: number;
  readonly perteMaxJour: number;
  readonly maxTradesPerDay: number;
  readonly maxLeverage: number;
  readonly pairesAutorisees: readonly string[];
  readonly style: MandateStyle | null;
  readonly validUntil: number;
}

/**
 * Surface minimale de l'API Xaman utilisée par le service.
 * L'implémentation concrète (`@tide/xrpl`) arrive dans une tâche ultérieure.
 */
export interface MandateXamanApi {
  createSignRequest(txJson: unknown): Promise<{ uuid: string; signUrl: string; qrPng: string }>;
  getPayloadStatus(uuid: string): Promise<{ meta: { signed: boolean; address?: string } }>;
}

/**
 * Service de gestion des mandats : crée, signe (callback Xaman), révoque.
 * `onSignCallback` n'accepte que les mandats en `pending` — toute autre
 * transition est refusée par `MandateInvalidError`.
 */
export class MandateService {
  constructor(
    private readonly store: MandateStore,
    private readonly xaman: MandateXamanApi,
    /** Vrai si l'agent trade en Live (fonds réels) → signature Xaman obligatoire. */
    private readonly agentIsLive: (agentId: string) => Promise<boolean> = async () => false,
  ) {}

  /** Crée un mandat en status `pending` (non signé). */
  async create(input: CreateMandateInput): Promise<Mandate> {
    const mandate: Mandate = {
      id: randomUUID(),
      agentId: input.agentId,
      userId: input.userId,
      capitalMax: input.capitalMax,
      perteMaxJour: input.perteMaxJour,
      maxTradesPerDay: input.maxTradesPerDay,
      maxLeverage: input.maxLeverage,
      pairesAutorisees: input.pairesAutorisees,
      style: input.style,
      validUntil: input.validUntil,
      signedAt: null,
      signature: null,
      status: "pending",
    };
    await this.store.create(mandate);
    return mandate;
  }

  /** Mandat actif courant d'un agent (validUntil non dépassé), ou null. */
  getActiveForAgent(agentId: string): Promise<Mandate | null> {
    return this.store.getActive(agentId);
  }

  /** Liste tous les mandats d'un agent (tous statuts). */
  listByAgent(agentId: string): Promise<Mandate[]> {
    return this.store.listByAgent(agentId);
  }

  /**
   * Callback Xaman : passe un mandat `pending` en `active`, enregistre la
   * signature et l'horodatage. Refuse tout autre état.
   */
  async onSignCallback(payload: {
    mandateId: string;
    signature: string;
    uuid?: string;
  }): Promise<Mandate> {
    const mandate = await this.store.get(payload.mandateId);
    if (!mandate) {
      throw new MandateInvalidError("mandate not found");
    }
    if (mandate.status !== "pending") {
      throw new MandateInvalidError(`status is ${mandate.status}`);
    }

    // Fonds RÉELS (agent Live) OU preuve Xaman fournie → vérification cryptographique
    // OBLIGATOIRE : le mandat doit être signé par le wallet propriétaire (fail-closed).
    // Sinon les garde-fous (capitalMax, maxLeverage, perteMaxJour) seraient
    // auto-déclarés par l'appelant → aucune protection des fonds réels.
    const live = await this.agentIsLive(mandate.agentId);
    if (live || payload.uuid !== undefined) {
      const signature = await this.verifyOwnerSignature(mandate, payload.uuid);
      return this.store.update(mandate.id, {
        signature,
        signedAt: Date.now(),
        status: "active",
      });
    }

    // Paper (simulation, pas de fonds réels) : l'activation par le propriétaire suffit
    // — l'appelant est déjà authentifié comme propriétaire par le garde (F1).
    return this.store.update(mandate.id, {
      signature: payload.signature,
      signedAt: Date.now(),
      status: "active",
    });
  }

  /**
   * Exige un payload Xaman `signed` dont l'adresse signataire est le propriétaire
   * du mandat. Lève sinon (payload absent, non signé, ou signé par un tiers).
   */
  private async verifyOwnerSignature(mandate: Mandate, uuid: string | undefined): Promise<string> {
    if (uuid === undefined) {
      throw new MandateInvalidError("mandat Live : payload Xaman signé requis");
    }
    const status = await this.xaman.getPayloadStatus(uuid);
    if (!status.meta.signed || status.meta.address !== mandate.userId) {
      throw new MandateInvalidError("signature du mandat non vérifiée pour le propriétaire");
    }
    return uuid;
  }

  /** Révoque tous les mandats actifs d'un agent. */
  async revoke(agentId: string): Promise<void> {
    const mandates = await this.store.listByAgent(agentId);
    await Promise.all(
      mandates
        .filter((m) => m.status === "active")
        .map((m) => this.store.update(m.id, { status: "revoked" })),
    );
  }
}