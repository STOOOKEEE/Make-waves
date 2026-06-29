import { describe, expect, it } from "vitest";
import { fetchBinanceBookDepth } from "../src/feed/binance-book-feed";
import type { FetchJson } from "../src/feed/cex-price-feed";

function fakeFetch(response: unknown): FetchJson {
  return async () => response;
}

describe("fetchBinanceBookDepth", () => {
  it("parse asks/bids et cumule les tailles", async () => {
    const depth = await fetchBinanceBookDepth(
      "XRP",
      2,
      fakeFetch({
        asks: [
          ["0.50", "100"],
          ["0.53", "150"],
        ],
        bids: [
          ["0.49", "120"],
          ["0.47", "80"],
        ],
      }),
    );
    expect(depth).toEqual({
      symbol: "XRP",
      quoteSymbol: "USDT",
      asks: [
        { price: 0.5, size: 100, total: 100 },
        { price: 0.53, size: 150, total: 250 },
      ],
      bids: [
        { price: 0.49, size: 120, total: 120 },
        { price: 0.47, size: 80, total: 200 },
      ],
      mid: 0.495,
      spread: expect.any(Number),
    });
  });
});
