import { describe, expect, it } from "vitest";
import { fetchCoinGeckoHistory } from "../src/feed/coingecko-history";
import type { FetchJson } from "../src/feed/cex-price-feed";

function fakeFetch(response: unknown): FetchJson {
  return async () => response;
}

describe("fetchCoinGeckoHistory", () => {
  it("convertit market_chart prices en série de prix bucketée", async () => {
    const candles = await fetchCoinGeckoHistory(
      "https://api.example.com/api/v3",
      "rain-coin",
      "usd",
      "1h",
      2,
      fakeFetch({
        prices: [
          [0, 1],
          [10 * 60_000, 2],
          [60 * 60_000, 3],
          [70 * 60_000, 2.5],
        ],
      }),
    );
    expect(candles).toEqual([
      { t: 0, o: 1, h: 2, l: 1, c: 2, source: "CoinGecko", mode: "price" },
      { t: 60 * 60_000, o: 3, h: 3, l: 2.5, c: 2.5, source: "CoinGecko", mode: "price" },
    ]);
  });
});
