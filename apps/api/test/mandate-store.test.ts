import { describe, it, expect, beforeEach } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import type { DatabaseSync } from "node:sqlite";
import { migrateAgentTables } from "../src/store/migrations/2026-07-05-agent-tables";
import {
  InMemoryMandateStore,
  MandateNotFoundError,
  type Mandate,
} from "../src/store/mandate-store";
import { SqliteMandateStore } from "../src/store/sqlite-mandate-store";
import { SqliteAgentStore } from "../src/store/sqlite-agent-store";

/** Insère l'agent parent requis par la FK de la table `mandates`. */
async function seedAgents(db: DatabaseSync): Promise<void> {
  const agents = new SqliteAgentStore(db);
  await agents.create({
    id: "agent-1",
    userId: "u1",
    name: "A1",
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt: 1000,
    updatedAt: 1000,
  });
  await agents.create({
    id: "agent-2",
    userId: "u2",
    name: "A2",
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt: 1000,
    updatedAt: 1000,
  });
}

const FUTURE = Date.now() + 60_000;
const PAST = Date.now() - 60_000;

const mandate = (overrides: Partial<Mandate> = {}): Mandate => ({
  id: "m1",
  agentId: "agent-1",
  userId: "u1",
  capitalMax: 1000,
  perteMaxJour: 100,
  maxTradesPerDay: 10,
  maxLeverage: 2,
  pairesAutorisees: ["XRP/USD", "RLUSD/USD"],
  style: "momentum",
  validUntil: FUTURE,
  signedAt: null,
  signature: null,
  status: "active",
  ...overrides,
});

describe("InMemoryMandateStore", () => {
  it("create + get", async () => {
    const s = new InMemoryMandateStore();
    await s.create(mandate());
    const got = await s.get("m1");
    expect(got?.agentId).toBe("agent-1");
    expect(got?.pairesAutorisees).toEqual(["XRP/USD", "RLUSD/USD"]);
  });

  it("getActive filters by status + validUntil", async () => {
    const s = new InMemoryMandateStore();
    await s.create(
      mandate({ id: "m1", status: "active", validUntil: PAST }),
    );
    await s.create(
      mandate({ id: "m2", status: "active", validUntil: FUTURE }),
    );
    await s.create(
      mandate({ id: "m3", status: "revoked", validUntil: FUTURE }),
    );

    const active = await s.getActive("agent-1");
    expect(active?.id).toBe("m2");
  });

  it("listByAgent returns all mandates for that agent", async () => {
    const s = new InMemoryMandateStore();
    await s.create(mandate({ id: "m1", agentId: "agent-1" }));
    await s.create(mandate({ id: "m2", agentId: "agent-2" }));
    await s.create(mandate({ id: "m3", agentId: "agent-1" }));

    const list = await s.listByAgent("agent-1");
    expect(list.length).toBe(2);
    expect(list.map((m) => m.id).sort()).toEqual(["m1", "m3"]);
  });

  it("update persists changes", async () => {
    const s = new InMemoryMandateStore();
    await s.create(mandate());
    const updated = await s.update("m1", { maxTradesPerDay: 5 });
    expect(updated.maxTradesPerDay).toBe(5);
    expect((await s.get("m1"))?.maxTradesPerDay).toBe(5);
  });

  it("throws MandateNotFoundError on update of missing mandate", async () => {
    const s = new InMemoryMandateStore();
    await expect(s.update("nope", { status: "revoked" })).rejects.toThrow(
      MandateNotFoundError,
    );
  });
});

describe("SqliteMandateStore (parity with InMemory)", () => {
  let db: DatabaseSync;
  let s: SqliteMandateStore;

  beforeEach(async () => {
    db = openDatabase(":memory:");
    migrateAgentTables(db);
    await seedAgents(db);
    s = new SqliteMandateStore(db);
  });

  it("create + get round-trips JSON pairesAutorisees", async () => {
    await s.create(mandate());
    const got = await s.get("m1");
    expect(got?.agentId).toBe("agent-1");
    expect(got?.pairesAutorisees).toEqual(["XRP/USD", "RLUSD/USD"]);
  });

  it("getActive filters by status + validUntil", async () => {
    await s.create(mandate({ id: "m1", status: "active", validUntil: PAST }));
    await s.create(mandate({ id: "m2", status: "active", validUntil: FUTURE }));
    await s.create(
      mandate({ id: "m3", status: "revoked", validUntil: FUTURE }),
    );
    const active = await s.getActive("agent-1");
    expect(active?.id).toBe("m2");
  });

  it("listByAgent returns only matching rows", async () => {
    await s.create(mandate({ id: "m1", agentId: "agent-1" }));
    await s.create(mandate({ id: "m2", agentId: "agent-2" }));
    await s.create(mandate({ id: "m3", agentId: "agent-1" }));
    const list = await s.listByAgent("agent-1");
    expect(list.length).toBe(2);
  });

  it("update persists changes", async () => {
    await s.create(mandate());
    const updated = await s.update("m1", { maxTradesPerDay: 5 });
    expect(updated.maxTradesPerDay).toBe(5);
    expect((await s.get("m1"))?.maxTradesPerDay).toBe(5);
  });
});
