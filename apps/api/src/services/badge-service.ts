import { assertValidAddress, type NftIssuer } from "@tide/xrpl";
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

/** Source du nombre d'ordres exécutés (implémentée par `PaperService`). */
export interface BadgeOrdersSource {
  ordersOf(userId: string): readonly unknown[];
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
  readonly issuer: NftIssuer;
  readonly sourceTag: number;
  /** Base publique des URI de métadonnées (sans slash final). */
  readonly metadataBaseUrl: string;
}

/**
 * Orchestration des badges : dérive le mérite depuis l'état paper, et exécute
 * le claim (mint + sell-offer via l'issuer) de façon idempotente. Ne signe rien
 * côté user — renvoie l'`sellOfferId` que le front fait accepter (signer).
 */
export class BadgeService {
  constructor(private readonly deps: BadgeServiceDeps) {}

  private activityOf(userId: string): BadgeActivity {
    const fillCount = this.deps.paper.ordersOf(userId).length;
    const competitionCount = this.deps.competition
      .list()
      .filter((c) => this.deps.competition.participants(c.id).includes(userId))
      .length;
    return { fillCount, competitionCount };
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
  ): Promise<{ sellOfferId: string; nftTokenId: string }> {
    assertValidAddress(walletAddress, "walletAddress");
    const badge = badgeByCode(code);
    if (!badge) {
      throw new BadgeUnknownError(code);
    }
    const earned = new Set(earnedCodes(this.activityOf(userId)));
    if (!earned.has(code)) {
      throw new BadgeNotEarnedError(code);
    }
    const existing = await this.deps.store.get(userId, code);
    if (existing) {
      throw new BadgeAlreadyClaimedError(userId, code);
    }

    const uri = `${this.deps.metadataBaseUrl}/nft-metadata/${code}`;
    const issued = await this.deps.issuer.issueBadge({
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

    return { sellOfferId: issued.sellOfferId, nftTokenId: issued.nftTokenId };
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
