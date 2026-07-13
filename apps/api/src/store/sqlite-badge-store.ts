import type { DatabaseSync } from "./sqlite";
import {
  BadgeAlreadyClaimedError,
  BadgeClaimNotFoundError,
  type BadgeClaim,
  type BadgeClaimStatus,
  type BadgeStore,
} from "./badge-store";

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function toBadgeClaim(row: unknown): BadgeClaim {
  const record = asRecord(row);
  return {
    userId: String(record["user_id"]),
    badgeCode: String(record["badge_code"]),
    claimedAt: Number(record["claimed_at"]),
    nftTokenId: String(record["nft_token_id"]),
    sellOfferId: String(record["sell_offer_id"]),
    status: String(record["status"]) as BadgeClaimStatus,
    claimTxHash:
      record["claim_tx_hash"] === null ? null : String(record["claim_tx_hash"]),
  };
}

/**
 * Persistance SQLite des claims de badges (`node:sqlite`). Table `badge_claims`,
 * schéma installé via `migrateBadgeTables`. La PK (user_id, badge_code) est le
 * garde-fou d'idempotence ; on pré-vérifie aussi pour une erreur typée claire.
 */
export class SqliteBadgeStore implements BadgeStore {
  private readonly db: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.db = database;
  }

  async create(claim: BadgeClaim): Promise<void> {
    const existing = await this.get(claim.userId, claim.badgeCode);
    if (existing) {
      throw new BadgeAlreadyClaimedError(claim.userId, claim.badgeCode);
    }
    this.db
      .prepare(
        `INSERT INTO badge_claims (
          user_id, badge_code, claimed_at, nft_token_id, sell_offer_id,
          status, claim_tx_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        claim.userId,
        claim.badgeCode,
        claim.claimedAt,
        claim.nftTokenId,
        claim.sellOfferId,
        claim.status,
        claim.claimTxHash,
      );
  }

  async get(userId: string, badgeCode: string): Promise<BadgeClaim | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM badge_claims WHERE user_id = ? AND badge_code = ?`,
      )
      .get(userId, badgeCode);
    return row ? toBadgeClaim(row) : null;
  }

  async listByUser(userId: string): Promise<BadgeClaim[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM badge_claims WHERE user_id = ? ORDER BY claimed_at DESC`,
      )
      .all(userId);
    return rows.map(toBadgeClaim);
  }

  async markClaimed(
    userId: string,
    badgeCode: string,
    txHash: string | null,
  ): Promise<void> {
    const existing = await this.get(userId, badgeCode);
    if (!existing) {
      throw new BadgeClaimNotFoundError(userId, badgeCode);
    }
    this.db
      .prepare(
        `UPDATE badge_claims SET status = 'claimed', claim_tx_hash = ?
         WHERE user_id = ? AND badge_code = ?`,
      )
      .run(txHash, userId, badgeCode);
  }
}
