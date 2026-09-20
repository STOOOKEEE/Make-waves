import { describe, expect, it } from "vitest";
import { InMemoryAgentStore, type Agent } from "./agent-store";

function agent(id: string, userId: string, createdAt: number): Agent {
  return {
    id,
    userId,
    name: `agent-${id}`,
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("AgentStore.list", () => {
  it("renvoie tous les agents, plus récent d'abord", async () => {
    const store = new InMemoryAgentStore();
    await store.create(agent("a", "u1", 100));
    await store.create(agent("b", "u2", 300));
    await store.create(agent("c", "u1", 200));

    const all = await store.list();

    expect(all.map((a) => a.id)).toEqual(["b", "c", "a"]);
  });

  it("renvoie une liste vide sans agent", async () => {
    const store = new InMemoryAgentStore();
    expect(await store.list()).toEqual([]);
  });
});
