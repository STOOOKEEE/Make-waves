import type { DatabaseSync } from "node:sqlite";

/** Wallets Paper custodiaux + une récompense NFT maximum par utilisateur/semaine. */
export function migratePaperWalletRewardTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS paper_wallets (
      user_id TEXT PRIMARY KEY,
      address TEXT NOT NULL UNIQUE,
      encrypted_seed TEXT NOT NULL,
      master_key_id TEXT NOT NULL,
      status TEXT NOT NULL,
      funding_tx_hash TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS weekly_rewards (
      user_id TEXT NOT NULL,
      week TEXT NOT NULL,
      qualified_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      nft_token_id TEXT,
      sell_offer_id TEXT,
      claim_tx_hash TEXT,
      claimed_at INTEGER,
      PRIMARY KEY (user_id, week)
    );
    CREATE INDEX IF NOT EXISTS idx_weekly_rewards_user ON weekly_rewards(user_id, week DESC);
  `);
}
