import type { DatabaseSync } from "node:sqlite";

/** Wallets Paper custodiaux + une récompense NFT maximum par utilisateur/semaine. */
export function migratePaperWalletRewardTables(db: DatabaseSync): void {
  db.exec(`
    DROP TABLE IF EXISTS paper_wallets;
    DROP TABLE IF EXISTS weekly_rewards;
    DROP TABLE IF EXISTS paper_badge_rewards;

    CREATE TABLE IF NOT EXISTS paper_wallets_mainnet (
      user_id TEXT PRIMARY KEY,
      address TEXT NOT NULL UNIQUE,
      encrypted_seed TEXT NOT NULL,
      master_key_id TEXT NOT NULL,
      status TEXT NOT NULL,
      funding_tx_hash TEXT,
      funded_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS paper_reward_wallets_mainnet (
      user_id TEXT PRIMARY KEY,
      address TEXT NOT NULL UNIQUE,
      encrypted_seed TEXT NOT NULL,
      master_key_id TEXT NOT NULL,
      status TEXT NOT NULL,
      funding_tx_hash TEXT,
      funded_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS weekly_rewards_mainnet (
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
    CREATE INDEX IF NOT EXISTS idx_weekly_rewards_mainnet_user
      ON weekly_rewards_mainnet(user_id, week DESC);

    CREATE TABLE IF NOT EXISTS paper_badge_rewards_mainnet (
      user_id TEXT NOT NULL,
      badge_code TEXT NOT NULL,
      qualified_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      nft_token_id TEXT,
      sell_offer_id TEXT,
      claim_tx_hash TEXT,
      claimed_at INTEGER,
      PRIMARY KEY (user_id, badge_code)
    );
    CREATE INDEX IF NOT EXISTS idx_paper_badge_rewards_mainnet_user
      ON paper_badge_rewards_mainnet(user_id, qualified_at DESC);
  `);

}
