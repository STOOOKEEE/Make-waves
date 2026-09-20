import type { DatabaseSync } from "node:sqlite";

/**
 * Migration : table `badge_claims` (réclamations de badges NFT). La clé primaire
 * composite (user_id, badge_code) porte l'idempotence : un badge = un claim max.
 * Idempotente (`IF NOT EXISTS`). À appeler depuis main.ts au boot.
 */
export function migrateBadgeTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS badge_claims (
      user_id TEXT NOT NULL,
      badge_code TEXT NOT NULL,
      claimed_at INTEGER NOT NULL,
      nft_token_id TEXT NOT NULL,
      sell_offer_id TEXT NOT NULL,
      status TEXT NOT NULL,
      claim_tx_hash TEXT,
      PRIMARY KEY (user_id, badge_code)
    );

    CREATE INDEX IF NOT EXISTS idx_badge_claims_user
      ON badge_claims(user_id);
  `);
}
