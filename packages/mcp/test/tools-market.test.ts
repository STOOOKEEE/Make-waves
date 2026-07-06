import { describe, it, expect } from "vitest";
import { getMarketTool } from "../src/tools/market";
import type { Agent, Mandate, McpContext, PriceFeed } from "../src/types";
import { McpError } from "../src/lib/errors";
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

function makePriceFeed(priceOf: PriceFeed["priceOf"]): PriceFeed {
  return {
    priceOf,
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
}

function makeCtx(priceFeed: PriceFeed): McpContext {
  return {
    agent: { ...baseAgent },
    userId: "u1",
    mandate: { ...baseMandate },
    priceFeed,
    paper: {
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
    },
    trading: {
      async placeOrder() {
        return { orderId: "o", status: "filled", filledQty: 0, avgPrice: 0 };
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

describe("get_market tool", () => {
  it("returns price + change24h for known symbol", async () => {
    const ctx = makeCtx(
      makePriceFeed(async (symbol) =>
        symbol === "BTC" ? { usd: 60000, change24h: 1.5 } : null,
      ),
    );
    const result = (await getMarketTool.handler(
      { symbol: "BTC" },
      ctx,
    )) as { symbol: string; price: number; change24h: number; timestamp: number };
    expect(result.symbol).toBe("BTC");
    expect(result.price).toBe(60000);
    expect(result.change24h).toBe(1.5);
    expect(typeof result.timestamp).toBe("number");
  });

  it("throws MARKET_ERROR for unknown symbol", async () => {
    const ctx = makeCtx(makePriceFeed(async () => null));
    await expect(
      getMarketTool.handler({ symbol: "FOO" }, ctx),
    ).rejects.toMatchObject({ code: "MARKET_ERROR" });
  });

  it("rejects invalid symbol with INVALID_PARAMS", async () => {
    // Brief used "bt"/"VERYLONG" — both PASS the impl regex /^[A-Z0-9]{2,10}$/
    // (the handler uppercases first; "VERYLONG" is 8 chars). Use inputs that
    // actually fail the regex post-uppercase: >10 chars, or non-alphanum.
    const ctx = makeCtx(makePriceFeed(async () => null));
    await expect(
      getMarketTool.handler({ symbol: "VERYLONGNAME" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    await expect(
      getMarketTool.handler({ symbol: "BT!" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
  });

  it("throws an McpError instance with the documented code", async () => {
    const ctx = makeCtx(makePriceFeed(async () => null));
    try {
      await getMarketTool.handler({ symbol: "FOO" }, ctx);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpError);
      expect((err as McpError).code).toBe("MARKET_ERROR");
    }
  });
});