import { describe, expect, it, vi } from "vitest";
import { makeEventFilter } from "./event-filter";
import type { AuthzResolvers } from "../auth/guard";
import type { AgentEvent } from "./agent-broadcast";

const ME = "rMe111111111111111111111111111";
const OTHER = "rOther2222222222222222222222222";

function action(agentId: string): AgentEvent {
  return { type: "agent_action", agentId, tool: "place_order", result: "ok" };
}

function resolvers(map: Record<string, string>): AuthzResolvers {
  return {
    agentOwner: vi.fn(async (id: string) => map[id] ?? null),
    mandateOwner: async () => null,
  };
}

describe("makeEventFilter", () => {
  it("laisse tout passer quand l'auth est désactivée (me = null)", async () => {
    const filter = makeEventFilter(null, undefined);
    expect(await filter(action("a1"))).toBe(true);
  });

  it("ne relaie que les events des agents du viewer", async () => {
    const filter = makeEventFilter(ME, resolvers({ a1: ME, a2: OTHER }));
    expect(await filter(action("a1"))).toBe(true);
    expect(await filter(action("a2"))).toBe(false);
  });

  it("rejette les events d'un agent inconnu", async () => {
    const filter = makeEventFilter(ME, resolvers({}));
    expect(await filter(action("inconnu"))).toBe(false);
  });

  it("met en cache le propriétaire (un seul appel resolver par agent)", async () => {
    const r = resolvers({ a1: ME });
    const filter = makeEventFilter(ME, r);
    await filter(action("a1"));
    await filter(action("a1"));
    expect(r.agentOwner).toHaveBeenCalledTimes(1);
  });
});
