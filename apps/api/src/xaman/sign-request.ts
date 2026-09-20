import { buildBuyInPayment } from "@tide/xrpl";
import type { BuyInPaymentParams } from "@tide/xrpl";

/** Échec côté Xaman (création de payload refusée ou réponse inexploitable). */
export class XamanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XamanError";
  }
}

/** Sous-ensemble de la réponse de création de payload XUMM qu'on consomme. */
export interface XamanCreatedPayload {
  readonly uuid: string;
  readonly next: { readonly always: string };
  readonly refs: { readonly qr_png: string };
}

/** État d'un payload après consultation (résolu/signé + adresse signataire). */
export interface PayloadStatus {
  /** L'utilisateur a répondu (signé OU rejeté). */
  readonly resolved: boolean;
  /** Signé (vs rejeté). */
  readonly signed: boolean;
  /** Adresse XRPL du signataire, une fois résolu (sinon null). */
  readonly account: string | null;
  /** Hash de la transaction soumise, le cas échéant. */
  readonly txid: string | null;
}

/**
 * Sous-ensemble INJECTÉ de l'API XUMM (`sdk.payload`). Les clés API/secret vivent
 * dans l'instance du SDK construite côté runtime (depuis l'env), jamais lues ni
 * manipulées ici → l'adaptateur reste testable sans réseau ni secret.
 */
export interface XamanPayloadApi {
  create(payload: { txjson: object }): Promise<XamanCreatedPayload | null>;
  /** État d'un payload (suivi de signature). `null` si introuvable. */
  get(uuid: string): Promise<PayloadStatus | null>;
}

/** Requête de signature non-custodiale à présenter à l'utilisateur. */
export interface SignRequest {
  /** Identifiant du payload (pour suivre la signature). */
  readonly uuid: string;
  /** URL d'ouverture dans Xaman. */
  readonly signUrl: string;
  /** QR code (PNG) à scanner. */
  readonly qrPng: string;
}

/**
 * Crée une requête de signature Xaman pour une transaction non signée. La
 * signature reste **non-custodiale** : Tide ne voit jamais la clé, l'utilisateur
 * signe dans Xaman. Lève `XamanError` si XUMM refuse (null) ou répond mal.
 */
export async function createSignRequest(
  api: XamanPayloadApi,
  txjson: object,
): Promise<SignRequest> {
  const created = await api.create({ txjson });
  if (created === null) {
    throw new XamanError("Xaman a refusé de créer le payload (réponse null)");
  }
  // Le type ne garantit pas la forme d'une réponse réseau : garde runtime pour
  // transformer une réponse partielle en XamanError (jamais un TypeError nu).
  if (
    typeof created.uuid !== "string" ||
    typeof created.next?.always !== "string" ||
    typeof created.refs?.qr_png !== "string"
  ) {
    throw new XamanError(
      "Réponse Xaman incomplète (uuid/next.always/refs.qr_png manquant)",
    );
  }
  return {
    uuid: created.uuid,
    signUrl: created.next.always,
    qrPng: created.refs.qr_png,
  };
}

/**
 * Requête de signature d'un buy-in (Payment taggé). Construit la tx via le builder
 * audité (`buildBuyInPayment`, qui valide adresses/montant/tag) puis la passe à
 * Xaman. Une entrée invalide lève AVANT tout appel réseau.
 */
export async function createBuyInSignRequest(
  api: XamanPayloadApi,
  params: BuyInPaymentParams,
): Promise<SignRequest> {
  return createSignRequest(api, buildBuyInPayment(params));
}

/**
 * Requête de connexion de wallet : un payload `SignIn` (aucune transaction, juste
 * une preuve de contrôle de l'adresse). Une fois signé dans Xaman, on récupère
 * l'adresse XRPL via `getPayloadStatus`.
 */
export async function createConnectSignRequest(
  api: XamanPayloadApi,
): Promise<SignRequest> {
  return createSignRequest(api, { TransactionType: "SignIn" });
}

/** État d'un payload (suivi de signature). Lève `XamanError` s'il est introuvable. */
export async function getPayloadStatus(
  api: XamanPayloadApi,
  uuid: string,
): Promise<PayloadStatus> {
  const status = await api.get(uuid);
  if (status === null) {
    throw new XamanError(`Payload introuvable: ${uuid}`);
  }
  return status;
}
