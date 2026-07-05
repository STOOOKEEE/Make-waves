import { describe, it, expect } from "vitest";
import {
  getMarketsTool,
  getHistoryTool,
  getOrderbookTool,
} from "../src/tools/market";
import type {
  Agent,
  Mandate,
  MarketRow,
  McpContext,
  PriceFeed,
} from "../src/types";
import { McpError } from "../src/lib/errors";

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
  };
}

const sampleMarketRows: readonly MarketRow[] = [
  { symbol: "BTC", price: 60000, change24h: 1.5 },
  { symbol: "ETH", price: 3000, change24h: -0.8 },
  { symbol: "XRP", price: 0.5, change24h: 0.2 },
];

function makeFakeFeed(overrides: Partial<PriceFeed> = {}): PriceFeed {
  return {
    async priceOf() {
      return null;
    },
    async markets(limit: number) {
      return sampleMarketRows.slice(0, limit);
    },
    async history() {
      return [{ ts: 1, o: 1, h: 2, l: 0.5, c: 1.5, v: 100 }];
    },
    async orderbook() {
      return { bids: [[30000, 1]], asks: [[30100, 1]] };
    },
    ...overrides,
  };
}

describe("get_markets tool", () => {
  it("returns list of markets up to the requested limit", async () => {
    const ctx = makeCtx(makeFakeFeed());
    const result = (await getMarketsTool.handler(
      { limit: 2 },
      ctx,
    )) as { markets: readonly MarketRow[] };
    expect(result.markets.length).toBe(2);
    expect(result.markets[0]?.symbol).toBe("BTC");
    expect(result.markets[1]?.symbol).toBe("ETH");
  });

  it("defaults to 100 when limit is omitted", async () => {
    let capturedLimit = 0;
    const ctx = makeCtx(
      makeFakeFeed({
        async markets(limit) {
          capturedLimit = limit;
          return sampleMarketRows;
        },
      }),
    );
    await getMarketsTool.handler({}, ctx);
    expect(capturedLimit).toBe(100);
  });

  it("clamps limit to [1, 250]", async () => {
    let capturedLimit = 0;
    const ctx = makeCtx(
      makeFakeFeed({
        async markets(limit) {
          capturedLimit = limit;
          return [];
        },
      }),
    );
    await getMarketsTool.handler({ limit: 0 }, ctx);
    expect(capturedLimit).toBe(1);
    await getMarketsTool.handler({ limit: 9999 }, ctx);
    expect(capturedLimit).toBe(250);
  });
});

describe("get_history tool", () => {
  it("returns candles for valid symbol + interval", async () => {
    const ctx = makeCtx(makeFakeFeed());
    const result = (await getHistoryTool.handler(
      { symbol: "BTC", interval: "1H" },
      ctx,
    )) as { symbol: string; interval: string; candles: unknown[] };
    expect(result.symbol).toBe("BTC");
    expect(result.interval).toBe("1H");
    expect(result.candles.length).toBe(1);
  });

  it("rejects invalid symbol with INVALID_PARAMS", async () => {
    const ctx = makeCtx(makeFakeFeed());
    await expect(
      getHistoryTool.handler({ symbol: "VERYLONGNAME", interval: "1H" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    await expect(
      getHistoryTool.handler({ symbol: "BT!", interval: "1H" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
  });

  it("rejects invalid interval with INVALID_PARAMS", async () => {
    const ctx = makeCtx(makeFakeFeed());
    await expect(
      getHistoryTool.handler({ symbol: "BTC", interval: "9X" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
  });

  it("throws McpError instance for invalid interval", async () => {
    const ctx = makeCtx(makeFakeFeed());
    try {
      await getHistoryTool.handler({ symbol: "BTC", interval: "2m" }, ctx);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(McpError);
      expect((err as McpError).code).toBe("INVALID_PARAMS");
    }
  });

  it("clamps limit to [10, 500] and forwards symbol/interval to feed", async () => {
    let captured: { symbol: string; interval: string; limit: number } | null =
      null;
    const ctx = makeCtx(
      makeFakeFeed({
        async history(symbol, interval, limit) {
          captured = { symbol, interval, limit };
          return [];
        },
      }),
    );
    await getHistoryTool.handler({ symbol: "btc", interval: "15m", limit: 1 }, ctx);
    expect(captured).toEqual({ symbol: "BTC", interval: "15m", limit: 10 });
    await getHistoryTool.handler({ symbol: "ETH", interval: "1D", limit: 99999 }, ctx);
    expect(captured).toEqual({ symbol: "ETH", interval: "1D", limit: 500 });
  });
});

describe("get_orderbook tool", () => {
  it("returns bids and asks for a known symbol", async () => {
    const ctx = makeCtx(makeFakeFeed());
    const result = (await getOrderbookTool.handler(
      { symbol: "BTC" },
      ctx,
    )) as {
      symbol: string;
      bids: [number, number][];
      asks: [number, number][];
    };
    expect(result.symbol).toBe("BTC");
    expect(result.bids[0]?.[0]).toBe(30000);
    expect(result.asks[0]?.[0]).toBe(30100);
  });

  it("rejects invalid symbol with INVALID_PARAMS", async () => {
    const ctx = makeCtx(makeFakeFeed());
    await expect(
      getOrderbookTool.handler({ symbol: "BT!" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
  });

  it("throws MARKET_ERROR when the feed has no book for the symbol", async () => {
    const ctx = makeCtx(makeFakeFeed({ async orderbook() { return null; } }));
    await expect(
      getOrderbookTool.handler({ symbol: "BTC" }, ctx),
    ).rejects.toMatchObject({ code: "MARKET_ERROR" });
  });
});