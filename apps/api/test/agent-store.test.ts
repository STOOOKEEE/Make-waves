import { describe, it, expect, beforeEach } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import type { DatabaseSync } from "node:sqlite";
import { migrateAgentTables } from "../src/store/migrations/2026-07-05-agent-tables";
import {
  AgentNotFoundError,
  InMemoryAgentStore,
  type Agent,
} from "../src/store/agent-store";
import { SqliteAgentStore } from "../src/store/sqlite-agent-store";

const agent = (overrides: Partial<Agent> = {}): Agent => ({
  id: "a1",
  userId: "u1",
  name: "Test",
  type: "external",
  status: "active",
  hasLiveAccount: false,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe("InMemoryAgentStore", () => {
  it("creates, gets, lists by user", async () => {
    const s = new InMemoryAgentStore();
    await s.create(agent({ id: "a1", userId: "u1" }));
    await s.create(agent({ id: "a2", userId: "u2" }));
    expect((await s.get("a1"))?.name).toBe("Test");
    expect((await s.listByUser("u1")).length).toBe(1);
  });

  it("updates agent", async () => {
    const s = new InMemoryAgentStore();
    await s.create(agent());
    const updated = await s.update("a1", { status: "stopped" });
    expect(updated.status).toBe("stopped");
  });

  it("throws AgentNotFoundError on update missing", async () => {
    const s = new InMemoryAgentStore();
    await expect(s.update("nope", { status: "stopped" })).rejects.toThrow(
      AgentNotFoundError,
    );
  });

  it("deletes agent", async () => {
    const s = new InMemoryAgentStore();
    await s.create(agent());
    await s.delete("a1");
    expect(await s.get("a1")).toBeNull();
  });
});

describe("SqliteAgentStore (parity with InMemory)", () => {
  let db: DatabaseSync;
  let s: SqliteAgentStore;

  beforeEach(() => {
    db = openDatabase(":memory:");
    migrateAgentTables(db);
    s = new SqliteAgentStore(db);
  });

  it("create + get", async () => {
    await s.create(agent());
    expect((await s.get("a1"))?.name).toBe("Test");
  });

  it("listByUser filters correctly", async () => {
    await s.create(agent({ id: "a1", userId: "u1" }));
    await s.create(agent({ id: "a2", userId: "u2" }));
    expect((await s.listByUser("u1")).length).toBe(1);
  });

  it("update persists", async () => {
    await s.create(agent());
    const updated = await s.update("a1", { status: "stopped" });
    expect(updated.status).toBe("stopped");
    expect((await s.get("a1"))?.status).toBe("stopped");
  });

  it("get returns null when missing", async () => {
    expect(await s.get("nope")).toBeNull();
  });

  it("delete removes the row", async () => {
    await s.create(agent());
    await s.delete("a1");
    expect(await s.get("a1")).toBeNull();
  });
});
