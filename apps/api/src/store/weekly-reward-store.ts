export type WeeklyRewardStatus = "eligible" | "minting" | "offer_pending" | "claimed";

export interface WeeklyReward {
  readonly userId: string;
  /** Lundi UTC de la semaine, au format YYYY-MM-DD. */
  readonly week: string;
  readonly qualifiedAt: number;
  readonly status: WeeklyRewardStatus;
  readonly nftTokenId: string | null;
  readonly sellOfferId: string | null;
  readonly claimTxHash: string | null;
  readonly claimedAt: number | null;
}

export interface WeeklyRewardStore {
  get(userId: string, week: string): Promise<WeeklyReward | null>;
  list(userId: string): Promise<readonly WeeklyReward[]>;
  ensureEligible(reward: WeeklyReward): Promise<void>;
  /** Transition atomique eligible → minting, avant la première tx de mint. */
  startMinting(userId: string, week: string): Promise<boolean>;
  markOfferPending(userId: string, week: string, nftTokenId: string, sellOfferId: string): Promise<void>;
  markClaimed(userId: string, week: string, claimTxHash: string, claimedAt: number): Promise<void>;
}

export class InMemoryWeeklyRewardStore implements WeeklyRewardStore {
  private readonly records = new Map<string, WeeklyReward>();
  private key(userId: string, week: string): string { return `${userId}:${week}`; }
  async get(userId: string, week: string): Promise<WeeklyReward | null> {
    return this.records.get(this.key(userId, week)) ?? null;
  }
  async list(userId: string): Promise<readonly WeeklyReward[]> {
    return [...this.records.values()].filter((r) => r.userId === userId).sort((a, b) => b.week.localeCompare(a.week));
  }
  async ensureEligible(reward: WeeklyReward): Promise<void> {
    if (!this.records.has(this.key(reward.userId, reward.week))) {
      this.records.set(this.key(reward.userId, reward.week), reward);
    }
  }
  async markOfferPending(userId: string, week: string, nftTokenId: string, sellOfferId: string): Promise<void> {
    const current = await this.get(userId, week);
    if (!current) throw new Error("Weekly reward introuvable");
    this.records.set(this.key(userId, week), { ...current, status: "offer_pending", nftTokenId, sellOfferId });
  }
  async startMinting(userId: string, week: string): Promise<boolean> {
    const current = await this.get(userId, week);
    if (!current || current.status !== "eligible") return false;
    this.records.set(this.key(userId, week), { ...current, status: "minting" });
    return true;
  }
  async markClaimed(userId: string, week: string, claimTxHash: string, claimedAt: number): Promise<void> {
    const current = await this.get(userId, week);
    if (!current) throw new Error("Weekly reward introuvable");
    this.records.set(this.key(userId, week), { ...current, status: "claimed", claimTxHash, claimedAt });
  }
}
