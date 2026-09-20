import { describe, expect, it } from "vitest";
import { migrateExternalIdentityTables } from "./migrations/2026-07-22-external-identities";
import { openDatabase } from "./sqlite";
import { SqliteExternalIdentityStore } from "./sqlite-external-identity-store";

describe("SqliteExternalIdentityStore", () => {
  it("conserve la première liaison même depuis une nouvelle session Paper", async () => {
    const db = openDatabase();
    migrateExternalIdentityTables(db);
    const store = new SqliteExternalIdentityStore(db);
    const identity = {
      issuer: "https://project.supabase.co",
      subject: "subject-1",
      provider: "email",
      email: "alice@example.com",
    };

    const first = await store.bindOrResolve(identity, "paper:first", 100);
    const returning = await store.bindOrResolve({ ...identity, provider: "x" }, "paper:other", 200);

    expect(first?.userId).toBe("paper:first");
    expect(returning).toMatchObject({ userId: "paper:first", provider: "x", lastLoginAt: 200 });
  });

  it("ne crée pas de liaison sans session Paper proposée", async () => {
    const db = openDatabase();
    migrateExternalIdentityTables(db);
    const store = new SqliteExternalIdentityStore(db);
    await expect(store.bindOrResolve({
      issuer: "https://project.supabase.co",
      subject: "new",
      provider: "email",
      email: null,
    }, null, 100)).resolves.toBeNull();
  });
});
