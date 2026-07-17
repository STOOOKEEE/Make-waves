export type PaperBadgeRewardStatus = "eligible" | "minting" | "offer_pending" | "claimed";

export interface PaperBadgeReward {
  readonly userId: string;
  readonly badgeCode: string;
  readonly qualifiedAt: number;
  readonly status: PaperBadgeRewardStatus;
  readonly nftTokenId: string | null;
  readonly sellOfferId: string | null;
  readonly claimTxHash: string | null;
  readonly claimedAt: number | null;
}

export interface PaperBadgeRewardStore {
  get(userId: string, badgeCode: string): Promise<PaperBadgeReward | null>;
  ensureEligible(reward: PaperBadgeReward): Promise<void>;
  startMinting(userId: string, badgeCode: string): Promise<boolean>;
  markOfferPending(
    userId: string,
    badgeCode: string,
    nftTokenId: string,
    sellOfferId: string,
  ): Promise<void>;
  markClaimed(
    userId: string,
    badgeCode: string,
    claimTxHash: string,
    claimedAt: number,
  ): Promise<void>;
}

export class InMemoryPaperBadgeRewardStore implements PaperBadgeRewardStore {
  private readonly rewards = new Map<string, PaperBadgeReward>();
  private key(userId: string, badgeCode: string): string {
    return `${userId}:${badgeCode}`;
  }
  async get(userId: string, badgeCode: string): Promise<PaperBadgeReward | null> {
    return this.rewards.get(this.key(userId, badgeCode)) ?? null;
  }
  async ensureEligible(reward: PaperBadgeReward): Promise<void> {
    const key = this.key(reward.userId, reward.badgeCode);
    if (!this.rewards.has(key)) this.rewards.set(key, reward);
  }
  async startMinting(userId: string, badgeCode: string): Promise<boolean> {
    const current = await this.get(userId, badgeCode);
    if (current === null || current.status !== "eligible") return false;
    this.rewards.set(this.key(userId, badgeCode), { ...current, status: "minting" });
    return true;
  }
  async markOfferPending(
    userId: string,
    badgeCode: string,
    nftTokenId: string,
    sellOfferId: string,
  ): Promise<void> {
    const current = await this.required(userId, badgeCode);
    this.rewards.set(this.key(userId, badgeCode), {
      ...current,
      status: "offer_pending",
      nftTokenId,
      sellOfferId,
    });
  }
  async markClaimed(
    userId: string,
    badgeCode: string,
    claimTxHash: string,
    claimedAt: number,
  ): Promise<void> {
    const current = await this.required(userId, badgeCode);
    this.rewards.set(this.key(userId, badgeCode), {
      ...current,
      status: "claimed",
      claimTxHash,
      claimedAt,
    });
  }
  private async required(userId: string, badgeCode: string): Promise<PaperBadgeReward> {
    const reward = await this.get(userId, badgeCode);
    if (reward === null) throw new Error(`Paper badge introuvable: ${userId}/${badgeCode}`);
    return reward;
  }
}
