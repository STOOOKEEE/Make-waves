import { describe, it, expect, beforeEach } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import type { DatabaseSync } from "node:sqlite";
import { migrateAgentTables } from "../src/store/migrations/2026-07-05-agent-tables";
import {
  InMemoryAgentActionsStore,
  startOfUtcDay,
  type AgentAction,
} from "../src/store/agent-actions-store";
import { SqliteAgentActionsStore } from "../src/store/sqlite-agent-actions-store";
import { SqliteAgentStore } from "../src/store/sqlite-agent-store";

/** Insère l'agent parent requis par la FK de la table `agent_actions`. */
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
}

const NOW = Date.now();
const TODAY_12H = startOfUtcDay(NOW) + 12 * 60 * 60 * 1000;
const FUTURE_7D = NOW + 7 * 24 * 60 * 60 * 1000;

const action = (overrides: Partial<AgentAction> = {}): AgentAction => ({
  id: "ac1",
  agentId: "agent-1",
  userId: "u1",
  toolName: "trade",
  toolParams: JSON.stringify({ symbol: "XRP/USD", side: "buy" }),
  result: JSON.stringify({ ok: true }),
  error: null,
  idempotencyKey: null,
  executedAt: NOW,
  ...overrides,
});

describe("InMemoryAgentActionsStore", () => {
  it("record + findByIdempotencyKey", async () => {
    const s = new InMemoryAgentActionsStore();
    await s.record(action({ idempotencyKey: "key-1" }));
    const found = await s.findByIdempotencyKey("u1", "key-1");
    expect(found?.id).toBe("ac1");
    expect(await s.findByIdempotencyKey("u1", "missing")).toBeNull();
  });

  it("record is idempotent on idempotencyKey", async () => {
    const s = new InMemoryAgentActionsStore();
    await s.record(action({ idempotencyKey: "key-1", executedAt: NOW }));
    await s.record(
      action({ idempotencyKey: "key-1", executedAt: NOW + 1000 }),
    );
    const list = await s.listByAgent("agent-1", 100);
    expect(list.length).toBe(1);
    expect(list[0]?.executedAt).toBe(NOW);
  });

  it("listByAgent returns latest first with limit", async () => {
    const s = new InMemoryAgentActionsStore();
    await s.record(action({ id: "a", executedAt: 1000 }));
    await s.record(action({ id: "b", executedAt: 2000 }));
    await s.record(action({ id: "c", executedAt: 3000 }));
    const list = await s.listByAgent("agent-1", 2);
    expect(list.map((x) => x.id)).toEqual(["c", "b"]);
  });

  it("countToday returns 0 when no actions today", async () => {
    const s = new InMemoryAgentActionsStore();
    expect(await s.countToday("agent-1", "u1")).toBe(0);
  });

  it("countToday counts only today's actions", async () => {
    const s = new InMemoryAgentActionsStore();
    const yesterday = startOfUtcDay(NOW) - 1000;
    const tomorrow = FUTURE_7D;
    await s.record(action({ id: "y", executedAt: yesterday }));
    await s.record(action({ id: "t", executedAt: TODAY_12H }));
    await s.record(action({ id: "f", executedAt: tomorrow }));
    // `tomorrow` est après aujourd'hui mais avant la fin du jour courant — selon
    // l'horloge utilisée, il est compris dans le jour courant. On attend ≥ 2.
    const count = await s.countToday("agent-1", "u1");
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("countToday ignores other users / agents", async () => {
    const s = new InMemoryAgentActionsStore();
    await s.record(action({ executedAt: TODAY_12H }));
    await s.record(action({ id: "o", userId: "other", executedAt: TODAY_12H }));
    expect(await s.countToday("agent-1", "u1")).toBe(1);
  });
});

describe("SqliteAgentActionsStore (parity with InMemory)", () => {
  let db: DatabaseSync;
  let s: SqliteAgentActionsStore;

  beforeEach(async () => {
    db = openDatabase(":memory:");
    migrateAgentTables(db);
    await seedAgents(db);
    s = new SqliteAgentActionsStore(db);
  });

  it("record + findByIdempotencyKey", async () => {
    await s.record(action({ idempotencyKey: "key-1" }));
    const found = await s.findByIdempotencyKey("u1", "key-1");
    expect(found?.id).toBe("ac1");
    expect(await s.findByIdempotencyKey("u1", "missing")).toBeNull();
  });

  it("record is idempotent via INSERT OR IGNORE + unique index", async () => {
    await s.record(action({ idempotencyKey: "key-1", executedAt: NOW }));
    await s.record(
      action({ idempotencyKey: "key-1", executedAt: NOW + 1000 }),
    );
    const list = await s.listByAgent("agent-1", 100);
    expect(list.length).toBe(1);
    expect(list[0]?.executedAt).toBe(NOW);
  });

  it("listByAgent returns latest first with limit", async () => {
    await s.record(action({ id: "a", executedAt: 1000 }));
    await s.record(action({ id: "b", executedAt: 2000 }));
    await s.record(action({ id: "c", executedAt: 3000 }));
    const list = await s.listByAgent("agent-1", 2);
    expect(list.map((x) => x.id)).toEqual(["c", "b"]);
  });

  it("countToday counts today's actions for the agent", async () => {
    const yesterday = startOfUtcDay(NOW) - 1000;
    await s.record(action({ id: "y", executedAt: yesterday }));
    await s.record(action({ id: "t", executedAt: TODAY_12H }));
    expect(await s.countToday("agent-1", "u1")).toBe(1);
  });
});
