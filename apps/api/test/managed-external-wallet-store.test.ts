import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import { migrateManagedExternalWalletTables } from "../src/store/migrations/2026-08-28-managed-external-wallets";
import { SqliteManagedExternalWalletStore } from "../src/store/sqlite-managed-external-wallet-store";

describe("coffre SQLite des wallets externes gérés", () => {
  it("persiste uniquement le payload chiffré et reste idempotent au boot", async () => {
    const db = openDatabase(":memory:");
    try {
      migrateManagedExternalWalletTables(db);
      expect(() => migrateManagedExternalWalletTables(db)).not.toThrow();
      const store = new SqliteManagedExternalWalletStore(db);
      await store.create({
        address: "rManaged",
        label: "Test",
        encryptedSeed: "{\"ciphertext\":\"encrypted-only\"}",
        masterKeyId: "vault-v1",
        createdAt: 1,
      });

      expect(await store.list()).toEqual([{
        address: "rManaged",
        label: "Test",
        encryptedSeed: "{\"ciphertext\":\"encrypted-only\"}",
        masterKeyId: "vault-v1",
        createdAt: 1,
      }]);
      expect(await store.delete("rManaged")).toBe(true);
      expect(await store.delete("rManaged")).toBe(false);
    } finally {
      db.close();
    }
  });
});
