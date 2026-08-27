import { describe, expect, it } from "vitest";
import { migratePaperWalletRewardTables } from "../src/store/migrations/2026-07-16-paper-wallet-rewards";
import { migrateWalletDeleteColumns } from "../src/store/migrations/2026-08-27-wallet-delete";
import { SqlitePaperWalletStore } from "../src/store/sqlite-paper-wallet-store";
import { SqlitePaperRewardWalletStore } from "../src/store/sqlite-paper-reward-wallet-store";
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
      migrateWalletDeleteColumns(db);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => (row as { readonly name: string }).name);
      expect(tables).not.toContain("paper_wallets");
      expect(tables).not.toContain("weekly_rewards");
      expect(tables).not.toContain("paper_badge_rewards");
      expect(tables).toContain("paper_reward_wallets_mainnet");

      const store = new SqlitePaperWalletStore(db);
      expect(await store.get("paper:mainnet-user")).toMatchObject({
        address: "rMainnetAddress",
        fundingTxHash: "MAINNET_TX",
        fundedAt: 20,
      });
      await store.markDeleted("paper:mainnet-user", "DELETE_HASH");
      expect(await store.eraseSeed("paper:mainnet-user")).toBe(true);
      expect(await store.eraseSeed("paper:mainnet-user")).toBe(false);
      expect(await store.get("paper:mainnet-user")).toMatchObject({
        status: "deleted",
        deleteTxHash: "DELETE_HASH",
        encryptedSeed: "",
      });
      const rewardStore = new SqlitePaperRewardWalletStore(db);
      await rewardStore.create({
        userId: "paper:mainnet-user",
        address: "rRewardAddress",
        encryptedSeed: "encrypted-reward",
        masterKeyId: "mainnet-v1",
        status: "pending_funding",
        fundingTxHash: null,
        fundedAt: null,
        createdAt: 30,
        deleteTxHash: null,
      });
      expect(await rewardStore.get("paper:mainnet-user")).toMatchObject({
        address: "rRewardAddress",
        status: "pending_funding",
      });
    } finally {
      db.close();
    }
  });
});
