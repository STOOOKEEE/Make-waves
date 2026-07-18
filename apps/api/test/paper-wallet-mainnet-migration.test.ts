import { describe, expect, it } from "vitest";
import { migratePaperWalletRewardTables } from "../src/store/migrations/2026-07-16-paper-wallet-rewards";
import { SqlitePaperWalletStore } from "../src/store/sqlite-paper-wallet-store";
import { openDatabase } from "../src/store/sqlite";

describe("migration wallets Paper Mainnet-only", () => {
  it("supprime les anciennes tables réseau et conserve la table Mainnet", async () => {
    const db = openDatabase(":memory:");
    try {
      db.exec(`
        CREATE TABLE paper_wallets (user_id TEXT PRIMARY KEY);
        CREATE TABLE weekly_rewards (user_id TEXT PRIMARY KEY);
        CREATE TABLE paper_badge_rewards (user_id TEXT PRIMARY KEY);
        CREATE TABLE paper_wallets_mainnet (
          user_id TEXT PRIMARY KEY,
          address TEXT NOT NULL UNIQUE,
          encrypted_seed TEXT NOT NULL,
          master_key_id TEXT NOT NULL,
          status TEXT NOT NULL,
          funding_tx_hash TEXT,
          funded_at INTEGER,
          created_at INTEGER NOT NULL
        );
        INSERT INTO paper_wallets_mainnet VALUES (
          'paper:mainnet-user', 'rMainnetAddress', 'encrypted', 'mainnet-v1',
          'funded', 'MAINNET_TX', 20, 10
        );
      `);

      migratePaperWalletRewardTables(db);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => (row as { readonly name: string }).name);
      expect(tables).not.toContain("paper_wallets");
      expect(tables).not.toContain("weekly_rewards");
      expect(tables).not.toContain("paper_badge_rewards");

      const store = new SqlitePaperWalletStore(db);
      expect(await store.get("paper:mainnet-user")).toMatchObject({
        address: "rMainnetAddress",
        fundingTxHash: "MAINNET_TX",
        fundedAt: 20,
      });
    } finally {
      db.close();
    }
  });
});
