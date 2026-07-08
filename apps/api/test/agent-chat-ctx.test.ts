import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AddressInfo } from "node:net";
import { buildServer } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { InMemoryAgentStore } from "../src/store/agent-store";
import { InMemoryMandateStore } from "../src/store/mandate-store";
import { InMemoryAgentActionsStore } from "../src/store/agent-actions-store";
import { buildAgentChatCtxFactory } from "../src/agent/chat-context";
import type { Agent } from "../src/store/agent-store";
import type { Mandate } from "../src/store/mandate-store";

// Vérif runtime du câblage du chat agent : la fabrique produit un `McpContext`
// dont les backends (prix/paper/trading) atteignent RÉELLEMENT ce serveur via
// self-HTTP (fetch → route Fastify → domaine), sans LLM. Prouve que la couche
// de traduction de contrat (symbol→pair, price, Fill→result), partagée avec le
// serveur MCP externe, s'exécute aussi pour le chat in-UI.

const START = 10_000;

function activeAgent(id: string, userId: string): Agent {
  return {
    id,
    userId,
    name: "tide-test",
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

function activeMandate(id: string, agentId: string, userId: string): Mandate {
  return {
    id,
    agentId,
    userId,
    capitalMax: START,
    perteMaxJour: 1_000,
    maxTradesPerDay: 100,
    maxLeverage: 3,
    pairesAutorisees: ["XRP"],
    style: "momentum",
    validUntil: Date.now() + 86_400_000,
    signedAt: 1,
    signature: "sig",
    status: "active",
  };
}

let app: FastifyInstance;

afterEach(async () => {
  await app.close();
});

/** Démarre un vrai serveur qui écoute (self-HTTP a besoin d'une socket). */
async function listen(): Promise<{ baseUrl: string; agents: InMemoryAgentStore; mandates: InMemoryMandateStore; actions: InMemoryAgentActionsStore; userId: string }> {
  const agents = new InMemoryAgentStore();
  const mandates = new InMemoryMandateStore();
  const actions = new InMemoryAgentActionsStore();
  app = buildServer({
    paper: new PaperService(START),
    competition: new CompetitionService(),
    getPrices: () => ({ XRP: 0.5 }),
    agentActionsStore: actions,
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${String(port)}`, agents, mandates, actions, userId: "u1" };
}

describe("chat agent — fabrique du contexte runtime", () => {
  it("câble un ctx dont les backends exécutent contre le serveur (self-HTTP)", async () => {
    const { baseUrl, agents, mandates, actions, userId } = await listen();
    await agents.create(activeAgent("ag1", userId));
    await mandates.create(activeMandate("m1", "ag1", userId));
    // Compte paper pré-ouvert (la route d'ordre ne l'auto-crée pas).
    await app.inject({ method: "POST", url: "/accounts", payload: { userId } });

    const factory = buildAgentChatCtxFactory(baseUrl, { agents, mandates, actions }, undefined);
    const ctx = await factory("ag1", userId);

    // Contexte validé : agent + mandat actif résolus depuis les stores locaux.
    expect(ctx.agent.id).toBe("ag1");
    expect(ctx.mandate?.id).toBe("m1");

    // Read via self-HTTP : prix + portefeuille.
    expect(await ctx.priceFeed.priceOf("XRP")).toEqual({ usd: 0.5 });
    const before = await ctx.paper.getPortfolio(userId);
    expect(before.balances["RLUSD"]).toBe(START);

    // Write via self-HTTP : ordre spot exécuté (contrat symbol→pair + Fill→result).
    const fill = await ctx.trading.placeOrder({
      userId,
      symbol: "XRP",
      side: "buy",
      qty: 100,
      type: "market",
      price: 0.5,
    });
    expect(fill.status).toBe("filled");
    expect(fill.filledQty).toBe(100);
    expect(fill.avgPrice).toBe(0.5);

    // Effet réel : XRP crédité, RLUSD débité.
    const after = await ctx.paper.getPortfolio(userId);
    expect(after.balances["XRP"]).toBe(100);
    expect(after.balances["RLUSD"]).toBeLessThan(START);
  });

  it("lève (→ 400 côté route) si l'agent n'a pas de mandat actif", async () => {
    const { baseUrl, agents, mandates, actions, userId } = await listen();
    await agents.create(activeAgent("ag2", userId));
    // Pas de mandat créé.
    const factory = buildAgentChatCtxFactory(baseUrl, { agents, mandates, actions }, undefined);
    await expect(factory("ag2", userId)).rejects.toThrow(/mandate/i);
  });
});
