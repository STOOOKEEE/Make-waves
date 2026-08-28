import {
  assertValidAddress,
  buildBadgeAcceptOffer,
  type NftIssuer,
} from "@tide/xrpl";
import type { NFTokenAcceptOffer } from "xrpl";
import {
  BadgeAlreadyClaimedError,
  type BadgeStore,
} from "../store/badge-store";
import { BADGE_CATALOG, badgeByCode } from "../badges/catalog";
import { earnedCodes, type BadgeActivity } from "../badges/merit";

export type BadgeUiStatus = "unclaimed" | "offer_pending" | "claimed";

/** Statut d'un badge pour un utilisateur (mérite dérivé + éventuel claim). */
export interface BadgeStatus {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly earned: boolean;
  readonly status: BadgeUiStatus;
  readonly nftTokenId: string | null;
  readonly claimMode: "external_wallet" | "paper_reward";
}

/** Code de badge inconnu (→ 404). */
export class BadgeUnknownError extends Error {
  constructor(code: string) {
    super(`Badge inconnu: ${code}`);
    this.name = "BadgeUnknownError";
  }
}

/** Badge non mérité par l'utilisateur (→ 400). */
export class BadgeNotEarnedError extends Error {
  constructor(code: string) {
    super(`Badge ${code} non mérité`);
    this.name = "BadgeNotEarnedError";
  }
}

/** Claim on-chain indisponible : aucun issuer NFT configuré (→ 503). */
export class BadgeClaimUnavailableError extends Error {
  constructor() {
    super("Claim on-chain indisponible (issuer NFT non configuré)");
    this.name = "BadgeClaimUnavailableError";
  }
}

/** Ce badge appartient au funnel custodial à deux wallets. */
export class BadgeClaimManagedError extends Error {
  constructor(code: string) {
    super(`Le badge ${code} se réclame depuis le compte NFT du terminal Paper`);
    this.name = "BadgeClaimManagedError";
  }
}

/** Base publique par défaut des URI de métadonnées NFT. */
const DEFAULT_METADATA_BASE_URL = "http://localhost:3000";

/** Source de l'activité de trading (implémentée par `PaperService`). */
export interface BadgeOrdersSource {
  ordersOf(userId: string): readonly unknown[];
  /** Inclut les ordres spot et les ouvertures de positions perp. */
  tradeCountOf?(userId: string): number;
}

/** Source des compétitions (implémentée par `CompetitionService`). */
export interface BadgeCompetitionSource {
  list(): readonly { readonly id: string }[];
  participants(competitionId: string): readonly string[];
}

export interface BadgeServiceDeps {
  readonly paper: BadgeOrdersSource;
  readonly competition: BadgeCompetitionSource;
  readonly store: BadgeStore;
  /** Issuer NFT (signature serveur). Absent → l'affichage marche, le claim renvoie 503. */
  readonly issuer?: NftIssuer;
  /** SourceTag d'attribution (requis avec l'issuer). */
  readonly sourceTag?: number;
  /** Base publique des URI de métadonnées (sans slash final). */
  readonly metadataBaseUrl?: string;
  /** Badges réclamés sur le wallet NFT secondaire, jamais vers une adresse libre. */
  readonly managedClaimCodes?: ReadonlySet<string>;
  /**
   * Option B : lève si le claim d'un badge managed vers le wallet connecté est
   * refusé (anti-farming). Absent → les badges managed restent funnel-only.
   */
  readonly managedExternalGuard?: (
    userId: string,
    walletAddress: string,
    code: string,
  ) => Promise<void>;
}

/**
 * Orchestration des badges : dérive le mérite depuis l'état paper, et exécute
 * le claim (mint + sell-offer via l'issuer) de façon idempotente. Ne signe rien
 * côté user — renvoie l'`sellOfferId` que le front fait accepter (signer).
 */
export class BadgeService {
  constructor(private readonly deps: BadgeServiceDeps) {}

  /** Valide le mérite et les règles de routage avant tout mint ou reprise. */
  private async validateClaim(
    userId: string,
    walletAddress: string,
    code: string,
  ): Promise<{ issuer: NftIssuer; sourceTag: number; badge: NonNullable<ReturnType<typeof badgeByCode>> }> {
    const { issuer, sourceTag } = this.deps;
    if (issuer === undefined || sourceTag === undefined) {
      throw new BadgeClaimUnavailableError();
    }
    assertValidAddress(walletAddress, "walletAddress");
    const badge = badgeByCode(code);
    if (!badge) {
      throw new BadgeUnknownError(code);
    }
    if (this.deps.managedClaimCodes?.has(code)) {
      if (this.deps.managedExternalGuard === undefined) {
        throw new BadgeClaimManagedError(code);
      }
      await this.deps.managedExternalGuard(userId, walletAddress, code);
    }
    const earned = new Set(earnedCodes(this.activityOf(userId)));
    if (!earned.has(code)) {
      throw new BadgeNotEarnedError(code);
    }
    return { issuer, sourceTag, badge };
  }

  private activityOf(userId: string): BadgeActivity {
    const competitionCount = this.deps.competition
      .list()
      .filter((c) => this.deps.competition.participants(c.id).includes(userId))
      .length;
    return { fillCount: this.fillCountOf(userId), competitionCount };
  }

  /**
   * Nombre de trades. Un compte Paper pas encore créé (nouveau visiteur) → 0.
   * Le fallback garde la compatibilité avec les sources de test/legacy qui ne
   * savent compter que les ordres spot.
   */
  private fillCountOf(userId: string): number {
    try {
      if (this.deps.paper.tradeCountOf !== undefined) {
        return this.deps.paper.tradeCountOf(userId);
      }
      return this.deps.paper.ordersOf(userId).length;
    } catch (err) {
      if (err instanceof Error && err.name === "AccountNotFoundError") {
        return 0;
      }
      throw err;
    }
  }

  /** Statut de tous les badges du catalogue pour un utilisateur. */
  async statusFor(userId: string): Promise<BadgeStatus[]> {
    const earned = new Set(earnedCodes(this.activityOf(userId)));
    const claims = await this.deps.store.listByUser(userId);
    const claimByCode = new Map(claims.map((c) => [c.badgeCode, c]));
    return BADGE_CATALOG.map((badge) => {
      const claim = claimByCode.get(badge.code);
      return {
        code: badge.code,
        title: badge.title,
        description: badge.description,
        imageUrl: badge.imageUrl,
        earned: earned.has(badge.code),
        status: claim ? claim.status : ("unclaimed" as BadgeUiStatus),
        nftTokenId: claim ? claim.nftTokenId : null,
        claimMode: this.deps.managedClaimCodes?.has(badge.code)
          ? "paper_reward" as const
          : "external_wallet" as const,
      };
    });
  }

  /**
   * Réclame un badge : mint on-demand + sell-offer vers `walletAddress`. Renvoie
   * l'`sellOfferId` que le user doit accepter. Idempotent (throw si déjà réclamé).
   */
  async claim(
    userId: string,
    walletAddress: string,
    code: string,
  ): Promise<{
    sellOfferId: string;
    nftTokenId: string;
    acceptTx: NFTokenAcceptOffer;
  }> {
    const { issuer, sourceTag, badge } = await this.validateClaim(
      userId,
      walletAddress,
      code,
    );
    const existing = await this.deps.store.get(userId, code);
    if (existing) {
      throw new BadgeAlreadyClaimedError(userId, code);
    }

    const base = this.deps.metadataBaseUrl ?? DEFAULT_METADATA_BASE_URL;
    const uri = `${base}/nft-metadata/${code}`;
    const issued = await issuer.issueBadge({
      uri,
      taxon: badge.taxon,
      destination: walletAddress,
    });

    await this.deps.store.create({
      userId,
      badgeCode: code,
      claimedAt: Date.now(),
      nftTokenId: issued.nftTokenId,
      sellOfferId: issued.sellOfferId,
      status: "offer_pending",
      claimTxHash: null,
    });

    // L'accept est taggé Tide : c'est le tx signé par un HUMAIN → il doit
    // compter pour l'attribution (compte actif) du hackathon.
    const acceptTx = buildBadgeAcceptOffer({
      account: walletAddress,
      sellOfferId: issued.sellOfferId,
      sourceTag,
    });

    return {
      sellOfferId: issued.sellOfferId,
      nftTokenId: issued.nftTokenId,
      acceptTx,
    };
  }

  /**
   * Variante du claim pour la signature Xaman (`/sign/badge-accept/:code`) :
   * résume une offre `offer_pending` déjà émise (signature abandonnée → on ne
   * re-mint pas) et ne lève que si le badge est déjà claimé. Le mint et la
   * sell-offer restent pilotés par `claim` ; ici on ne fait que reconstruire
   * l'accept à présenter au signataire.
   */
  async claimForSign(
    userId: string,
    walletAddress: string,
    code: string,
  ): Promise<{
    sellOfferId: string;
    nftTokenId: string;
    acceptTx: NFTokenAcceptOffer;
  }> {
    const { sourceTag } = await this.validateClaim(userId, walletAddress, code);
    const existing = await this.deps.store.get(userId, code);
    if (existing !== null) {
      if (existing.status === "claimed") {
        throw new BadgeAlreadyClaimedError(userId, code);
      }
      // offer_pending : l'offre existe déjà, on la reprend telle quelle.
      return {
        sellOfferId: existing.sellOfferId,
        nftTokenId: existing.nftTokenId,
        acceptTx: buildBadgeAcceptOffer({
          account: walletAddress,
          sellOfferId: existing.sellOfferId,
          sourceTag,
        }),
      };
    }
    return this.claim(userId, walletAddress, code);
  }

  /** Confirme le claim (le user a signé l'accept) → statut `claimed`. */
  async confirmClaim(
    userId: string,
    code: string,
    txHash: string | null,
  ): Promise<void> {
    await this.deps.store.markClaimed(userId, code, txHash);
  }
}
