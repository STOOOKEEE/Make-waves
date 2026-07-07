import { describe, it, expect } from "vitest";
import {
  getBalanceTool,
  getPortfolioTool,
  getPositionsTool,
  getLeaderboardTool,
} from "../src/tools/portfolio";
import type { Agent, Mandate, McpContext, PaperBackend, PriceFeed } from "../src/types";
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
};

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

interface FakePaper extends PaperBackend {
  /** Capture l'userId passé à chaque appel — pour vérifier le thread de ctx.userId. */
  calls: { method: string; arg: unknown }[];
}

function makePaper(overrides: Partial<PaperBackend> = {}): FakePaper {
  const calls: FakePaper["calls"] = [];
  return {
    calls,
    async getBalance(userId: string) {
      calls.push({ method: "getBalance", arg: userId });
      return (await overrides.getBalance?.(userId)) ?? {};
    },
    async getPortfolio(userId: string) {
      calls.push({ method: "getPortfolio", arg: userId });
      return (await overrides.getPortfolio?.(userId)) ??
        { balances: {}, equity: 0, pnl: 0 };
    },
    async listPositions(userId: string) {
      calls.push({ method: "listPositions", arg: userId });
      return (await overrides.listPositions?.(userId)) ?? [];
    },
    async getLeaderboard(limit: number) {
      calls.push({ method: "getLeaderboard", arg: limit });
      return (await overrides.getLeaderboard?.(limit)) ?? [];
    },
  };
}

function makeCtx(paper: PaperBackend): McpContext {
  return {
    agent: { ...baseAgent },
    userId: "u1",
    mandate: { ...baseMandate },
    priceFeed: fakePriceFeed,
    paper,
    trading: {
      async placeOrder() {
        return { orderId: "o", status: "filled", filledQty: 0, avgPrice: 0 };
      },
      async placeLiveOrder() {
        return { offerId: "of", status: "filled", filledQty: 0, avgPrice: 0 };
      },
      async cancelOrder() {
        // no-op
      },
      async getOpenOrders() {
        return [];
      },
    },
    actions: {
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
    },
    perp: {
      async openPosition() {
        return { positionId: "p", entryPrice: 0, liquidationPrice: 0 };
      },
      async closePosition() {
        return { realizedPnl: 0 };
      },
    },
    competitions: {
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
    },
    config: defaultPublicConfig,
  };
}

describe("get_balance", () => {
  it("returns balances for ctx.userId and forwards it to the backend", async () => {
    const paper = makePaper({ getBalance: async () => ({ XRP: 100, RLUSD: 50 }) });
    const r = (await getBalanceTool.handler({}, makeCtx(paper))) as {
      balances: Record<string, number>;
    };
    expect(r.balances).toEqual({ XRP: 100, RLUSD: 50 });
    expect(paper.calls).toContainEqual({ method: "getBalance", arg: "u1" });
  });
});

describe("get_portfolio", () => {
  it("returns equity + pnl from the backend", async () => {
    const paper = makePaper({
      getPortfolio: async () => ({ balances: { XRP: 100 }, equity: 50, pnl: -10 }),
    });
    const r = (await getPortfolioTool.handler({}, makeCtx(paper))) as {
      balances: Record<string, number>;
      equity: number;
      pnl: number;
    };
    expect(r.equity).toBe(50);
    expect(r.pnl).toBe(-10);
    expect(r.balances.XRP).toBe(100);
  });
});

describe("get_positions", () => {
  it("returns the positions list", async () => {
    const paper = makePaper({
      listPositions: async () => [
        { id: "p1", symbol: "BTC", side: "long", qty: 0.001 },
      ],
    });
    const r = (await getPositionsTool.handler({}, makeCtx(paper))) as {
      positions: unknown[];
    };
    expect(r.positions.length).toBe(1);
    expect(r.positions[0]).toMatchObject({ id: "p1", side: "long" });
  });

  it("returns an empty list when the user has no positions", async () => {
    const paper = makePaper({ listPositions: async () => [] });
    const r = (await getPositionsTool.handler({}, makeCtx(paper))) as {
      positions: unknown[];
    };
    expect(r.positions).toEqual([]);
  });
});

describe("get_leaderboard", () => {
  it("returns entries and forwards the clamped limit", async () => {
    const paper = makePaper({
      getLeaderboard: async (limit) => [{ userId: "u1", equity: 1000 }, ...Array.from({ length: limit - 1 }, (_, i) => ({ userId: `u${i + 2}`, equity: 100 }))],
    });
    const r = (await getLeaderboardTool.handler({ limit: 5 }, makeCtx(paper))) as {
      entries: unknown[];
    };
    expect(r.entries.length).toBe(5);
    expect(paper.calls).toContainEqual({ method: "getLeaderboard", arg: 5 });
  });

  it("clamps an out-of-range limit (10) to the [1, 100] contract", async () => {
    const paper = makePaper({ getLeaderboard: async (limit) => Array.from({ length: limit }) });
    const r = (await getLeaderboardTool.handler({ limit: 10 }, makeCtx(paper))) as {
      entries: unknown[];
    };
    // Le contrat PaperBackend exige un entier borné : on ne propage pas une string/NaN.
    expect(r.entries.length).toBe(10);
    expect(paper.calls).toContainEqual({ method: "getLeaderboard", arg: 10 });
  });

  it("defaults limit to 20 when omitted", async () => {
    const paper = makePaper({ getLeaderboard: async (limit) => Array.from({ length: limit }) });
    const r = (await getLeaderboardTool.handler({}, makeCtx(paper))) as {
      entries: unknown[];
    };
    expect(r.entries.length).toBe(20);
    expect(paper.calls).toContainEqual({ method: "getLeaderboard", arg: 20 });
  });

  it("replaces a bad limit (NaN/string) with the default 20 — does NOT propagate NaN to the backend", async () => {
    const paper = makePaper({ getLeaderboard: async (limit) => Array.from({ length: limit }) });
    const r = (await getLeaderboardTool.handler({ limit: "foo" }, makeCtx(paper))) as {
      entries: unknown[];
    };
    expect(r.entries.length).toBe(20);
    expect(paper.calls).toContainEqual({ method: "getLeaderboard", arg: 20 });
  });
});