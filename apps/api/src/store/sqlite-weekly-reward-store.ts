import type { DatabaseSync } from "./sqlite";
import type { WeeklyReward, WeeklyRewardStatus, WeeklyRewardStore } from "./weekly-reward-store";

function rowToReward(row: unknown): WeeklyReward {
  const value = row as Record<string, unknown>;
  const nullable = (key: string): string | null => value[key] === null ? null : String(value[key]);
  return {
    userId: String(value["user_id"]), week: String(value["week"]), qualifiedAt: Number(value["qualified_at"]),
    status: String(value["status"]) as WeeklyRewardStatus,
    nftTokenId: nullable("nft_token_id"), sellOfferId: nullable("sell_offer_id"),
    claimTxHash: nullable("claim_tx_hash"), claimedAt: value["claimed_at"] === null ? null : Number(value["claimed_at"]),
  };
}

export class SqliteWeeklyRewardStore implements WeeklyRewardStore {
  constructor(private readonly db: DatabaseSync) {}
  async get(userId: string, week: string): Promise<WeeklyReward | null> {
    const row = this.db.prepare("SELECT * FROM weekly_rewards WHERE user_id = ? AND week = ?").get(userId, week);
    return row === undefined ? null : rowToReward(row);
  }
  async list(userId: string): Promise<readonly WeeklyReward[]> {
    return this.db.prepare("SELECT * FROM weekly_rewards WHERE user_id = ? ORDER BY week DESC").all(userId).map(rowToReward);
  }
  async ensureEligible(reward: WeeklyReward): Promise<void> {
    this.db.prepare(
      `INSERT OR IGNORE INTO weekly_rewards (
        user_id, week, qualified_at, status, nft_token_id, sell_offer_id, claim_tx_hash, claimed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(reward.userId, reward.week, reward.qualifiedAt, reward.status, null, null, null, null);
  }
  async startMinting(userId: string, week: string): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE weekly_rewards SET status = 'minting'
         WHERE user_id = ? AND week = ? AND status = 'eligible'`,
      )
      .run(userId, week);
    return result.changes === 1;
  }
  async markOfferPending(userId: string, week: string, nftTokenId: string, sellOfferId: string): Promise<void> {
    this.db.prepare(
      `UPDATE weekly_rewards SET status = 'offer_pending', nft_token_id = ?, sell_offer_id = ?
       WHERE user_id = ? AND week = ?`,
    ).run(nftTokenId, sellOfferId, userId, week);
  }
  async markClaimed(userId: string, week: string, claimTxHash: string, claimedAt: number): Promise<void> {
    this.db.prepare(
      `UPDATE weekly_rewards SET status = 'claimed', claim_tx_hash = ?, claimed_at = ?
       WHERE user_id = ? AND week = ?`,
    ).run(claimTxHash, claimedAt, userId, week);
  }
}
