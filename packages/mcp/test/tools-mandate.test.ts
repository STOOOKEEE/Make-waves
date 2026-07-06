import { describe, it, expect } from "vitest";
import { getMandateTool, getRiskLimitsTool } from "../src/tools/mandate";
import type {
  Agent,
  AgentActionsStore,
  Mandate,
  McpContext,
  PaperBackend,
  PriceFeed,
  TradingBackend,
  PerpBackend,
  CompetitionBackend,
} from "../src/types";
import { defaultPublicConfig } from "../src/lib/public-config";

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

const baseMandate: Mandate = {
  id: "m1",
  agentId: "a1",
  userId: "u1",
  capitalMax: 5000,
  perteMaxJour: 250,
  maxTradesPerDay: 8,
  maxLeverage: 3,
  pairesAutorisees: ["BTC", "ETH", "XRP"],
  style: "momentum",
  validUntil: Date.now() + 60_000,
  signedAt: Date.now(),
  signature: "sig",
  status: "active",
};

interface FakeActions extends AgentActionsStore {
  countCalls: { agentId: string; userId: string }[];
  countImpl?: (agentId: string, userId: string) => Promise<number>;
}

function makeActions(overrides: { count?: FakeActions["countImpl"] } = {}): FakeActions {
  const countCalls: FakeActions["countCalls"] = [];
  return {
    countCalls,
    async record() {
      // no-op (pas d'audit sur ces outils read-only)
    },
    async findByIdempotencyKey() {
      return null;
    },
    async listByAgent() {
      return [];
    },
    async countToday(agentId, userId) {
      countCalls.push({ agentId, userId });
      return (await overrides.count?.(agentId, userId)) ?? 0;
    },
  };
}

function makeCtx(opts: {
  mandate: Mandate | null;
  actions: AgentActionsStore;
}): McpContext {
  const priceFeed: PriceFeed = {
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
  const paper: PaperBackend = {
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
  const trading: TradingBackend = {
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
  const perp: PerpBackend = {
    async openPosition() {
      return { positionId: "p", entryPrice: 0, liquidationPrice: 0 };
    },
    async closePosition() {
      return { realizedPnl: 0 };
    },
  };
  const competitions: CompetitionBackend = {
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
  return {
    agent: { ...baseAgent },
    userId: "u1",
    mandate: opts.mandate,
    priceFeed,
    paper,
    trading,
    perp,
    competitions,
    actions: opts.actions,
    config: defaultPublicConfig,
  };
}

describe("get_mandate", () => {
  it("returns the active mandate when present", async () => {
    const actions = makeActions();
    const ctx = makeCtx({ mandate: { ...baseMandate }, actions });

    const r = (await getMandateTool.handler({}, ctx)) as {
      mandate: Mandate | null;
    };

    expect(r.mandate).toEqual(baseMandate);
  });

  it("returns mandate: null when no mandate is set (defensive branch)", async () => {
    const actions = makeActions();
    const ctx = makeCtx({ mandate: null, actions });

    const r = (await getMandateTool.handler({}, ctx)) as {
      mandate: Mandate | null;
    };

    expect(r.mandate).toBeNull();
  });
});

describe("get_risk_limits", () => {
  it("counts today's trades via ctx.actions.countToday and forwards mandate fields", async () => {
    const actions = makeActions({ count: async () => 3 });
    const ctx = makeCtx({ mandate: { ...baseMandate }, actions });

    const r = (await getRiskLimitsTool.handler({}, ctx)) as {
      capitalMax: number;
      capitalEngaged: number;
      perteMaxJour: number;
      perteJour: number;
      maxTradesPerDay: number;
      tradesToday: number;
      maxLeverage: number;
      pairesAutorisees: readonly string[];
    };

    // Forward du mandate
    expect(r.capitalMax).toBe(5000);
    expect(r.perteMaxJour).toBe(250);
    expect(r.maxTradesPerDay).toBe(8);
    expect(r.maxLeverage).toBe(3);
    expect(r.pairesAutorisees).toEqual(["BTC", "ETH", "XRP"]);
    // Compte live
    expect(r.tradesToday).toBe(3);
    // Placeholders explicites (sera câblé au runtime)
    expect(r.capitalEngaged).toBe(0);
    expect(r.perteJour).toBe(0);
    // Le store est appelé avec (agentId, userId) du mandate (pas du ctx).
    expect(actions.countCalls).toEqual([{ agentId: "a1", userId: "u1" }]);
  });

  it("returns mandate: null when no mandate is set (does not touch actions)", async () => {
    const actions = makeActions();
    const ctx = makeCtx({ mandate: null, actions });

    const r = (await getRiskLimitsTool.handler({}, ctx)) as {
      mandate: Mandate | null;
      tradesToday?: number;
    };

    expect(r.mandate).toBeNull();
    expect(r.tradesToday).toBeUndefined();
    expect(actions.countCalls).toHaveLength(0);
  });

  it("returns zero trades today for a freshly-issued mandate", async () => {
    const actions = makeActions();
    const ctx = makeCtx({ mandate: { ...baseMandate }, actions });

    const r = (await getRiskLimitsTool.handler({}, ctx)) as {
      tradesToday: number;
    };

    expect(r.tradesToday).toBe(0);
  });
});