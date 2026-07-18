import { describe, expect, it } from "vitest";
import { migratePaperWalletRewardTables } from "../src/store/migrations/2026-07-16-paper-wallet-rewards";
import { SqlitePaperWalletStore } from "../src/store/sqlite-paper-wallet-store";
import { openDatabase } from "../src/store/sqlite";

describe("migration wallets Paper par réseau", () => {
  it("conserve la table Testnet legacy et isole complètement Mainnet", async () => {
    const db = openDatabase(":memory:");
    try {
      db.exec(`
        CREATE TABLE paper_wallets (
          user_id TEXT PRIMARY KEY,
          address TEXT NOT NULL UNIQUE,
          encrypted_seed TEXT NOT NULL,
          master_key_id TEXT NOT NULL,
          status TEXT NOT NULL,
          funding_tx_hash TEXT,
          created_at INTEGER NOT NULL
        );
        INSERT INTO paper_wallets VALUES (
          'paper:same-user', 'rTestnetAddress', 'encrypted', 'v1', 'funded', 'TEST_TX', 10
        );
      `);

      migratePaperWalletRewardTables(db);

      const testnet = new SqlitePaperWalletStore(db, "testnet");
      const mainnet = new SqlitePaperWalletStore(db, "mainnet");
      expect(await testnet.get("paper:same-user")).toMatchObject({
        address: "rTestnetAddress",
        fundingTxHash: "TEST_TX",
        fundedAt: null,
      });
      expect(await mainnet.get("paper:same-user")).toBeNull();

      await mainnet.create({
        userId: "paper:same-user",
        address: "rMainnetAddress",
        encryptedSeed: "other-encrypted",
        masterKeyId: "mainnet-v1",
        status: "pending_funding",
        fundingTxHash: null,
        fundedAt: null,
        createdAt: 20,
      });
      expect((await mainnet.get("paper:same-user"))?.address).toBe("rMainnetAddress");
      expect((await testnet.get("paper:same-user"))?.address).toBe("rTestnetAddress");
    } finally {
      db.close();
    }
  });
});
