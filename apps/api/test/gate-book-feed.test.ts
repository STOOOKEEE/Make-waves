import { describe, expect, it } from "vitest";
import { fetchGateBookDepth } from "../src/feed/gate-book-feed";
import type { FetchJson } from "../src/feed/cex-price-feed";

function fakeFetch(response: unknown): FetchJson {
  return async () => response;
}

describe("fetchGateBookDepth", () => {
  it("parse le carnet Gate et cumule les tailles", async () => {
    const depth = await fetchGateBookDepth(
      "RAIN",
      2,
      fakeFetch({
        asks: [
          ["0.0160", "1000"],
          ["0.0161", "2000"],
        ],
        bids: [
          ["0.0159", "1500"],
          ["0.0158", "500"],
        ],
      }),
    );
    expect(depth).toEqual({
      symbol: "RAIN",
      quoteSymbol: "USDT",
      source: "Gate",
      asks: [
        { price: 0.016, size: 1000, total: 1000 },
        { price: 0.0161, size: 2000, total: 3000 },
      ],
      bids: [
        { price: 0.0159, size: 1500, total: 1500 },
        { price: 0.0158, size: 500, total: 2000 },
      ],
      mid: 0.01595,
      spread: expect.any(Number),
    });
  });
});
