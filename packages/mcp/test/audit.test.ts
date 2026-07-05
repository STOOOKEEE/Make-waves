import { describe, it, expect } from "vitest";
import { recordAction } from "../src/lib/audit";
import type { AgentAction, AgentActionsStore } from "../src/types";

class FakeStore implements AgentActionsStore {
  recorded: AgentAction[] = [];
  async record(a: AgentAction): Promise<void> {
    this.recorded.push(a);
  }
  async findByIdempotencyKey(u: string, k: string) {
    return (
      this.recorded.find(
        (a) => a.userId === u && a.idempotencyKey === k,
      ) ?? null
    );
  }
  async listByAgent() {
    return this.recorded;
  }
  async countToday() {
    return 0;
  }
}

function last(store: FakeStore): AgentAction {
  const a = store.recorded.at(-1);
  if (!a) throw new Error("no action recorded");
  return a;
}

describe("recordAction", () => {
  it("writes success action with result JSON", async () => {
    const store = new FakeStore();
    await recordAction(store, {
      agentId: "a",
      userId: "u",
      toolName: "get_market",
      params: { symbol: "BTC" },
      result: { price: 100 },
      error: null,
      idempotencyKey: null,
    });
    const action = last(store);
    expect(store.recorded.length).toBe(1);
    expect(action.toolName).toBe("get_market");
    expect(JSON.parse(action.toolParams)).toEqual({ symbol: "BTC" });
    expect(JSON.parse(action.result!)).toEqual({ price: 100 });
  });

  it("writes error action with error string and null result", async () => {
    const store = new FakeStore();
    await recordAction(store, {
      agentId: "a",
      userId: "u",
      toolName: "place_order",
      params: { symbol: "BTC", qty: 0.001 },
      result: null,
      error: "RISK_LIMIT: capital exceeded",
      idempotencyKey: null,
    });
    const action = last(store);
    expect(action.result).toBeNull();
    expect(action.error).toContain("RISK_LIMIT");
  });

  it("generates a uuid v4 if not provided", async () => {
    const store = new FakeStore();
    await recordAction(store, {
      agentId: "a",
      userId: "u",
      toolName: "get_market",
      params: {},
      result: { x: 1 },
      error: null,
      idempotencyKey: null,
    });
    expect(last(store).id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("propagates idempotencyKey", async () => {
    const store = new FakeStore();
    await recordAction(store, {
      agentId: "a",
      userId: "u",
      toolName: "place_order",
      params: {},
      result: { ok: 1 },
      error: null,
      idempotencyKey: "client-uuid-123",
    });
    expect(last(store).idempotencyKey).toBe("client-uuid-123");
  });
});