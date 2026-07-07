import { describe, it, expect, beforeEach } from "vitest";
import { openDatabase } from "../src/store/sqlite";
import type { DatabaseSync } from "node:sqlite";
import { migrateAgentTables } from "../src/store/migrations/2026-07-05-agent-tables";

describe("migrateAgentTables", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(":memory:");
  });

  it("creates all 4 tables + 2 indexes", () => {
    migrateAgentTables(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("agents");
    expect(tableNames).toContain("mandates");
    expect(tableNames).toContain("agent_actions");
    expect(tableNames).toContain("agent_xrpl_keys");

    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
      )
      .all() as { name: string }[];
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain("idx_agent_actions_idempotency");
    expect(indexNames).toContain("idx_agent_actions_lookup");
  });

  it("is idempotent (re-running does not throw)", () => {
    migrateAgentTables(db);
    expect(() => migrateAgentTables(db)).not.toThrow();
  });
});