// Registry sanity: every registered tool is exposed to MCP clients.
// Vital regression guard for Task 17 — the 4 mandate/meta tools were written
// but never imported into tools/index.ts, so `tools/list` returned only 16.
import { describe, it, expect } from "vitest";
import { tools } from "../src/tools/index";

const EXPECTED_NAMES = [
  "get_market",
  "get_markets",
  "get_history",
  "get_orderbook",
  "get_balance",
  "get_portfolio",
  "get_positions",
  "get_leaderboard",
  "place_order",
  "cancel_order",
  "open_position",
  "close_position",
  "list_competitions",
  "get_competition",
  "join_competition",
  "get_competition_leaderboard",
  "get_mandate",
  "get_risk_limits",
  "get_config",
  "get_agent_status",
] as const;

describe("tools registry", () => {
  it("exposes all 20 expected tools to MCP clients with valid MCP shape", () => {
    expect(tools).toHaveLength(EXPECTED_NAMES.length);

    const registered = tools.map((t) => t.name);
    expect(registered).toEqual([...EXPECTED_NAMES]);

    // No two tools may share a name (would silently shadow each other in tools/list).
    expect(new Set(registered).size).toBe(registered.length);

    // Each registered tool must satisfy the MCP Tool contract.
    for (const name of EXPECTED_NAMES) {
      const tool = tools.find((t) => t.name === name);
      expect(tool, `missing tool: ${name}`).toBeDefined();
      expect(tool!.name).toBe(name);
      // LLM clients use the description to decide whether to call.
      expect(typeof tool!.description).toBe("string");
      expect(tool!.description.length).toBeGreaterThan(0);
      // inputSchema must be an object (MCP client contract).
      expect(typeof tool!.inputSchema).toBe("object");
      expect(tool!.inputSchema).not.toBeNull();
      // handler must be callable.
      expect(typeof tool!.handler).toBe("function");
    }
  });
});