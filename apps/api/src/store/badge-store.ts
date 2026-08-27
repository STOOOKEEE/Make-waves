// Claims de badges : on ne persiste QUE les réclamations on-chain (le mérite
// est dérivé de l'état paper, cf. badges/merit.ts). La clé (userId, badgeCode)
// garantit l'idempotence : un badge = un mint max par utilisateur.

export type BadgeClaimStatus = "offer_pending" | "claimed";

export interface BadgeClaim {
  readonly userId: string;
  readonly badgeCode: string;
  readonly claimedAt: number;
  readonly nftTokenId: string;
  readonly sellOfferId: string;
  readonly status: BadgeClaimStatus;
  /** Hash du `NFTokenAcceptOffer` une fois confirmé, sinon null. */
  readonly claimTxHash: string | null;
}

export interface BadgeStore {
  get(userId: string, badgeCode: string): Promise<BadgeClaim | null>;
  listByUser(userId: string): Promise<BadgeClaim[]>;
  create(claim: BadgeClaim): Promise<void>;
  markClaimed(
    userId: string,
    badgeCode: string,
    txHash: string | null,
  ): Promise<void>;
  /** Nombre de claims d'un badge depuis un timestamp (plafond journalier). */
  countByCodeSince(badgeCode: string, since: number): Promise<number>;
}

export class BadgeAlreadyClaimedError extends Error {
  constructor(userId: string, badgeCode: string) {
    super(`Badge ${badgeCode} déjà réclamé par ${userId}`);
    this.name = "BadgeAlreadyClaimedError";
  }
}

export class BadgeClaimNotFoundError extends Error {
  constructor(userId: string, badgeCode: string) {
    super(`Claim ${badgeCode} introuvable pour ${userId}`);
    this.name = "BadgeClaimNotFoundError";
  }
}

/** Clé composite de claim. */
function claimKey(userId: string, badgeCode: string): string {
  return `${userId}::${badgeCode}`;
}

export class InMemoryBadgeStore implements BadgeStore {
  private readonly claims = new Map<string, BadgeClaim>();

  async create(claim: BadgeClaim): Promise<void> {
    const key = claimKey(claim.userId, claim.badgeCode);
    if (this.claims.has(key)) {
      throw new BadgeAlreadyClaimedError(claim.userId, claim.badgeCode);
    }
    this.claims.set(key, claim);
  }

  async countByCodeSince(badgeCode: string, since: number): Promise<number> {
    return [...this.claims.values()].filter(
      (claim) => claim.badgeCode === badgeCode && claim.claimedAt >= since,
    ).length;
  }

  async get(userId: string, badgeCode: string): Promise<BadgeClaim | null> {
    return this.claims.get(claimKey(userId, badgeCode)) ?? null;
  }

  async listByUser(userId: string): Promise<BadgeClaim[]> {
    return [...this.claims.values()].filter((c) => c.userId === userId);
  }

  async markClaimed(
    userId: string,
    badgeCode: string,
    txHash: string | null,
  ): Promise<void> {
    const key = claimKey(userId, badgeCode);
    const current = this.claims.get(key);
    if (!current) {
      throw new BadgeClaimNotFoundError(userId, badgeCode);
    }
    this.claims.set(key, { ...current, status: "claimed", claimTxHash: txHash });
  }
}
