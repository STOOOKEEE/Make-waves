import { describe, expect, it } from "vitest";
import { migrateGiveawayTables } from "./migrations/2026-09-11-giveaway";
import { openDatabase } from "./sqlite";
import { GiveawayIdentityConflictError } from "./giveaway-store";
import { SqliteGiveawayStore } from "./sqlite-giveaway-store";

describe("SqliteGiveawayStore", () => {
  it("persiste les profils, les règles et l'unicité wallet", async () => {
    const db = openDatabase();
    migrateGiveawayTables(db);
    const store = new SqliteGiveawayStore(db);

    await store.saveProfile({
      operationId: "giveaway",
      userId: "paper:u1",
      walletAddress: "rWallet",
      xHandle: "alice",
      termsVersion: "v1",
      acceptedAt: 10,
    });
    await store.ensureEntry({
      operationId: "giveaway",
      userId: "paper:u1",
      rule: "wallet",
      weight: 1,
      awardedAt: 10,
    });
    await store.ensureEntry({
      operationId: "giveaway",
      userId: "paper:u1",
      rule: "first_trade",
      weight: 3,
      awardedAt: 11,
    });
    await store.ensureEntry({
      operationId: "giveaway",
      userId: "paper:u1",
      rule: "first_trade",
      weight: 3,
      awardedAt: 12,
    });

    expect(await store.get("giveaway", "paper:u1")).toMatchObject({
      profile: { walletAddress: "rWallet", xHandle: "alice" },
      entries: [
        { rule: "wallet", awardedAt: 10 },
        { rule: "first_trade", awardedAt: 11 },
      ],
    });
    await expect(
      store.saveProfile({
        operationId: "giveaway",
        userId: "paper:u2",
        walletAddress: "rWallet",
        xHandle: "bob",
        termsVersion: "v1",
        acceptedAt: 20,
      }),
    ).rejects.toBeInstanceOf(GiveawayIdentityConflictError);
    expect(await store.list("giveaway")).toHaveLength(1);
  });
});
