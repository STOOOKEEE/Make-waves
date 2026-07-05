import { McpError } from "../lib/errors";
import type { ToolDef } from "./index";

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/;

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