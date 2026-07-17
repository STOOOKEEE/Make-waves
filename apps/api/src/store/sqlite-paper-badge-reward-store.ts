import type { DatabaseSync } from "node:sqlite";
import type {
  PaperBadgeReward,
  PaperBadgeRewardStatus,
  PaperBadgeRewardStore,
} from "./paper-badge-reward-store";

function toReward(row: Record<string, unknown>): PaperBadgeReward {
  return {
    userId: String(row["user_id"]),
    badgeCode: String(row["badge_code"]),
    qualifiedAt: Number(row["qualified_at"]),
    status: String(row["status"]) as PaperBadgeRewardStatus,
    nftTokenId: row["nft_token_id"] === null ? null : String(row["nft_token_id"]),
    sellOfferId: row["sell_offer_id"] === null ? null : String(row["sell_offer_id"]),
    claimTxHash: row["claim_tx_hash"] === null ? null : String(row["claim_tx_hash"]),
    claimedAt: row["claimed_at"] === null ? null : Number(row["claimed_at"]),
  };
}

export class SqlitePaperBadgeRewardStore implements PaperBadgeRewardStore {
  constructor(private readonly db: DatabaseSync) {}

  async get(userId: string, badgeCode: string): Promise<PaperBadgeReward | null> {
    const row = this.db.prepare(
      "SELECT * FROM paper_badge_rewards WHERE user_id = ? AND badge_code = ?",
    ).get(userId, badgeCode) as Record<string, unknown> | undefined;
    return row === undefined ? null : toReward(row);
  }

  async ensureEligible(reward: PaperBadgeReward): Promise<void> {
    this.db.prepare(
      `INSERT OR IGNORE INTO paper_badge_rewards (
        user_id, badge_code, qualified_at, status, nft_token_id,
        sell_offer_id, claim_tx_hash, claimed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      reward.userId,
      reward.badgeCode,
      reward.qualifiedAt,
      reward.status,
      reward.nftTokenId,
      reward.sellOfferId,
      reward.claimTxHash,
      reward.claimedAt,
    );
  }

  async startMinting(userId: string, badgeCode: string): Promise<boolean> {
    const result = this.db.prepare(
      `UPDATE paper_badge_rewards SET status = 'minting'
       WHERE user_id = ? AND badge_code = ? AND status = 'eligible'`,
    ).run(userId, badgeCode);
    return result.changes === 1;
  }

  async markOfferPending(
    userId: string,
    badgeCode: string,
    nftTokenId: string,
    sellOfferId: string,
  ): Promise<void> {
    this.db.prepare(
      `UPDATE paper_badge_rewards
       SET status = 'offer_pending', nft_token_id = ?, sell_offer_id = ?
       WHERE user_id = ? AND badge_code = ?`,
    ).run(nftTokenId, sellOfferId, userId, badgeCode);
  }

  async markClaimed(
    userId: string,
    badgeCode: string,
    claimTxHash: string,
    claimedAt: number,
  ): Promise<void> {
    this.db.prepare(
      `UPDATE paper_badge_rewards
       SET status = 'claimed', claim_tx_hash = ?, claimed_at = ?
       WHERE user_id = ? AND badge_code = ?`,
    ).run(claimTxHash, claimedAt, userId, badgeCode);
  }
}
