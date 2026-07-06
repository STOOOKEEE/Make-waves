import { describe, it, expect } from "vitest";
import { loadContext, type AgentStore, type MandateStore } from "../src/lib/context";
import { McpError } from "../src/lib/errors";
import { defaultPublicConfig } from "../src/lib/public-config";
import type {
  Agent,
  AgentActionsStore,
  CompetitionBackend,
  Mandate,
  PaperBackend,
  PerpBackend,
  PriceFeed,
  TradingBackend,
} from "../src/types";

const fakePriceFeed: PriceFeed = {
  async priceOf() {
    return null;
  },
  async history() {
    return [];
  },
  async orderbook() {
    return null;
  },
  async markets() {
    return [];
  },
};

const fakePaper: PaperBackend = {
  async getBalance() {
    return {};
  },
  async getPortfolio() {
    return { balances: {}, equity: 0, pnl: 0 };
  },
  async listPositions() {
    return [];
  },
  async getLeaderboard() {
    return [];
  },
};

const fakeTrading: TradingBackend = {
  async placeOrder() {
    return { orderId: "o", status: "filled", filledQty: 0, avgPrice: 0 };
  },
  async cancelOrder() {
    // no-op
  },
  async getOpenOrders() {
    return [];
  },
};

const fakePerp: PerpBackend = {
  async openPosition() {
    return { positionId: "p", entryPrice: 0, liquidationPrice: 0 };
  },
  async closePosition() {
    return { realizedPnl: 0 };
  },
};

const fakeCompetitions: CompetitionBackend = {
  async list() {
    return [];
  },
  async get() {
    return null;
  },
  async join() {
    return { txJson: {} };
  },
  async getLeaderboard() {
    return [];
  },
};

const fakeActions: AgentActionsStore = {
  async record() {
    // no-op
  },
  async findByIdempotencyKey() {
    return null;
  },
  async listByAgent() {
    return [];
  },
  async countToday() {
    return 0;
  },
};

// Local in-memory fakes — keep @tide/mcp a leaf package (no import from apps/api).
function makeAgentStore(seed: Agent[] = []): AgentStore {
  const map = new Map(seed.map((a) => [a.id, a]));
  return {
    async get(id: string) {
      return map.get(id) ?? null;
    },
  };
}

function makeMandateStore(seed: Mandate[] = []): MandateStore {
  return {
    async getActive(agentId: string) {
      return seed.find((m) => m.agentId === agentId && m.status === "active") ?? null;
    },
  };
}

const baseAgent: Agent = {
  id: "a1",
  userId: "u1",
  name: "x",
  type: "external",
  status: "active",
  hasLiveAccount: false,
  createdAt: 0,
  updatedAt: 0,
};

describe("loadContext", () => {
  it("returns agent + userId + mandate when all ok", async () => {
    const agents = makeAgentStore([{ ...baseAgent }]);
    const mandates = makeMandateStore([
      {
        id: "m1",
        agentId: "a1",
        userId: "u1",
        capitalMax: 100,
        perteMaxJour: 10,
        maxTradesPerDay: 5,
        maxLeverage: 3,
        pairesAutorisees: ["BTC"],
        style: null,
        validUntil: Date.now() + 60_000,
        signedAt: Date.now(),
        signature: "x",
        status: "active",
      },
    ]);
    const ctx = await loadContext({ agents, mandates, priceFeed: fakePriceFeed, paper: fakePaper, trading: fakeTrading, perp: fakePerp, competitions: fakeCompetitions, actions: fakeActions, config: defaultPublicConfig }, "a1");
    expect(ctx.userId).toBe("u1");
    expect(ctx.agent.id).toBe("a1");
    expect(ctx.mandate?.id).toBe("m1");
  });

  it("throws AGENT_STOPPED when agent.status=stopped", async () => {
    const agents = makeAgentStore([{ ...baseAgent, status: "stopped" }]);
    const mandates = makeMandateStore();
    await expect(loadContext({ agents, mandates, priceFeed: fakePriceFeed, paper: fakePaper, trading: fakeTrading, perp: fakePerp, competitions: fakeCompetitions, actions: fakeActions, config: defaultPublicConfig }, "a1")).rejects.toThrow(McpError);
    await expect(loadContext({ agents, mandates, priceFeed: fakePriceFeed, paper: fakePaper, trading: fakeTrading, perp: fakePerp, competitions: fakeCompetitions, actions: fakeActions, config: defaultPublicConfig }, "a1")).rejects.toMatchObject({
      code: "AGENT_STOPPED",
    });
  });

  it("throws MANDATE_INVALID when no active mandate", async () => {
    const agents = makeAgentStore([{ ...baseAgent }]);
    const mandates = makeMandateStore();
    await expect(loadContext({ agents, mandates, priceFeed: fakePriceFeed, paper: fakePaper, trading: fakeTrading, perp: fakePerp, competitions: fakeCompetitions, actions: fakeActions, config: defaultPublicConfig }, "a1")).rejects.toMatchObject({
      code: "MANDATE_INVALID",
    });
  });

  it("throws MANDATE_INVALID when mandate is expired (validUntil < now)", async () => {
    const agents = makeAgentStore([{ ...baseAgent }]);
    const mandates = makeMandateStore([
      {
        id: "m1",
        agentId: "a1",
        userId: "u1",
        capitalMax: 100,
        perteMaxJour: 10,
        maxTradesPerDay: 5,
        maxLeverage: 3,
        pairesAutorisees: ["BTC"],
        style: null,
        validUntil: Date.now() - 1000,
        signedAt: Date.now(),
        signature: "x",
        status: "active",
      },
    ]);
    await expect(loadContext({ agents, mandates, priceFeed: fakePriceFeed, paper: fakePaper, trading: fakeTrading, perp: fakePerp, competitions: fakeCompetitions, actions: fakeActions, config: defaultPublicConfig }, "a1")).rejects.toMatchObject({
      code: "MANDATE_INVALID",
    });
  });
});