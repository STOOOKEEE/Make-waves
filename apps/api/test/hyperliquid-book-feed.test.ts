import { describe, expect, it } from "vitest";
import {
  fetchHyperliquidBookDepth,
  type PostJson,
} from "../src/feed/hyperliquid-book-feed";

function fakePost(response: unknown): PostJson {
  return async () => response;
}

describe("fetchHyperliquidBookDepth", () => {
  it("parse levels[0]=bids et levels[1]=asks", async () => {
    const depth = await fetchHyperliquidBookDepth(
      "HYPE",
      2,
      fakePost({
        coin: "HYPE",
        levels: [
          [
            { px: "64.48", sz: "100" },
            { px: "64.47", sz: "50" },
          ],
          [
            { px: "64.49", sz: "20" },
            { px: "64.50", sz: "30" },
          ],
        ],
      }),
    );
    expect(depth).toEqual({
      symbol: "HYPE",
      quoteSymbol: "USDC",
      source: "Hyperliquid",
      asks: [
        { price: 64.49, size: 20, total: 20 },
        { price: 64.5, size: 30, total: 50 },
      ],
      bids: [
        { price: 64.48, size: 100, total: 100 },
        { price: 64.47, size: 50, total: 150 },
      ],
      mid: 64.485,
      spread: expect.any(Number),
    });
  });
});
