import { McpError } from "../lib/errors";
import type { ToolDef } from "./index";

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/;

const INTERVALS = ["5m", "15m", "1H", "4H", "1D", "1W"] as const;
type Interval = (typeof INTERVALS)[number];
const INTERVALS_SET = new Set<string>(INTERVALS);
function isInterval(s: string): s is Interval {
  return INTERVALS_SET.has(s);
}

export const getMarketTool: ToolDef = {
  name: "get_market",
  description: "Get current market data for a symbol (price, 24h change, volume).",
  inputSchema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: 'Ticker symbol (e.g. "BTC", "ETH", "XRP") — uppercase, 2-10 chars',
      },
    },
    required: ["symbol"],
  },
  handler: async (args, ctx) => {
    const raw = args["symbol"];
    const symbol = typeof raw === "string" ? raw.toUpperCase() : "";
    if (!SYMBOL_RE.test(symbol)) {
      throw new McpError(
        "INVALID_PARAMS",
        `Invalid symbol '${symbol}' (must match ${SYMBOL_RE})`,
      );
    }
    const price = await ctx.priceFeed.priceOf(symbol);
    if (!price) {
      throw new McpError("MARKET_ERROR", `Price for ${symbol} unavailable`);
    }
    return {
      symbol,
      price: price.usd,
      change24h: price.change24h ?? null,
      volume24h: price.volume24h ?? null,
      timestamp: Date.now(),
    };
  },
};

export function clampLimit(raw: unknown, fallback: number, min: number, max: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

export const getMarketsTool: ToolDef = {
  name: "get_markets",
  description:
    "Get the top N markets with prices, 24h change, and volume. " +
    "Use limit (1-250) to scope how many rows are returned.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", minimum: 1, maximum: 250, default: 100 },
    },
  },
  handler: async (args, ctx) => {
    const limit = clampLimit(args["limit"], 100, 1, 250);
    const markets = await ctx.priceFeed.markets(limit);
    return { markets };
  },
};

export const getHistoryTool: ToolDef = {
  name: "get_history",
  description:
    `Get OHLC candles for a symbol. Valid intervals: ${INTERVALS.join(", ")}.`,
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: 'Ticker symbol (e.g. "BTC", "ETH")' },
      interval: { type: "string", enum: INTERVALS as unknown as string[] },
      limit: { type: "number", minimum: 10, maximum: 500, default: 120 },
    },
    required: ["symbol", "interval"],
  },
  handler: async (args, ctx) => {
    const symbol = String(args["symbol"] ?? "").toUpperCase();
    const interval = String(args["interval"] ?? "");
    const limit = clampLimit(args["limit"], 120, 10, 500);
    if (!SYMBOL_RE.test(symbol)) {
      throw new McpError("INVALID_PARAMS", `Invalid symbol '${symbol}'`);
    }
    if (!isInterval(interval)) {
      throw new McpError("INVALID_PARAMS", `Invalid interval '${interval}'`);
    }
    const candles = await ctx.priceFeed.history(symbol, interval, limit);
    return { symbol, interval, candles };
  },
};

export const getOrderbookTool: ToolDef = {
  name: "get_orderbook",
  description:
    "Get current order book depth (top bids and asks) for a symbol.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: 'Ticker symbol (e.g. "BTC", "XRP")' },
    },
    required: ["symbol"],
  },
  handler: async (args, ctx) => {
    const symbol = String(args["symbol"] ?? "").toUpperCase();
    if (!SYMBOL_RE.test(symbol)) {
      throw new McpError("INVALID_PARAMS", `Invalid symbol '${symbol}'`);
    }
    const book = await ctx.priceFeed.orderbook(symbol);
    if (!book) {
      throw new McpError("MARKET_ERROR", `No order book for ${symbol}`);
    }
    return { symbol, bids: book.bids, asks: book.asks };
  },
};