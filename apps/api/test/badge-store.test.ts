import { describe, it, expect } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import { migrateBadgeTables } from "../src/store/migrations/2026-07-13-badge-tables";
import {
  BadgeAlreadyClaimedError,
  InMemoryBadgeStore,
  type BadgeClaim,
  type BadgeStore,
} from "../src/store/badge-store";
import { SqliteBadgeStore } from "../src/store/sqlite-badge-store";

const CLAIM: BadgeClaim = {
  userId: "u1",
  badgeCode: "first_trade",
  claimedAt: 1000,
  nftTokenId: "NFT123",
  sellOfferId: "OFFER456",
  status: "offer_pending",
  claimTxHash: null,
};

function contract(name: string, makeStore: () => BadgeStore): void {
  describe(name, () => {
    it("create + get + listByUser", async () => {
      const store = makeStore();
      await store.create(CLAIM);
      expect(await store.get("u1", "first_trade")).toEqual(CLAIM);
      expect(await store.listByUser("u1")).toHaveLength(1);
      expect(await store.get("u1", "ten_trades")).toBeNull();
    });

    it("markClaimed passe le statut à claimed avec le hash", async () => {
      const store = makeStore();
      await store.create(CLAIM);
      await store.markClaimed("u1", "first_trade", "HASH789");
      const updated = await store.get("u1", "first_trade");
      expect(updated?.status).toBe("claimed");
      expect(updated?.claimTxHash).toBe("HASH789");
    });

    it("create doublon (même user+code) → BadgeAlreadyClaimedError", async () => {
      const store = makeStore();
      await store.create(CLAIM);
      await expect(store.create(CLAIM)).rejects.toThrow(BadgeAlreadyClaimedError);
    });
  });
}

contract("InMemoryBadgeStore", () => new InMemoryBadgeStore());
contract("SqliteBadgeStore", () => {
  const db = openDatabase(":memory:");
  migrateBadgeTables(db);
  return new SqliteBadgeStore(db);
});
