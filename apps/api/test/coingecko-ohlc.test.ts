import { describe, expect, it } from "vitest";
import { fetchCoinGeckoOhlc } from "../src/feed/coingecko-ohlc";
import type { FetchJson } from "../src/feed/cex-price-feed";

function fakeFetch(response: unknown): FetchJson {
  return async () => response;
}

describe("fetchCoinGeckoOhlc", () => {
  it("parse les vraies bougies OHLC CoinGecko", async () => {
    const candles = await fetchCoinGeckoOhlc(
      "https://api.example.com/api/v3",
      "rain",
      "usd",
      "1h",
      2,
      fakeFetch([
        [0, 0.015, 0.016, 0.014, 0.0155],
        [60 * 60_000, 0.0155, 0.017, 0.015, 0.016],
      ]),
    );
    expect(candles).toEqual([
      { t: 0, o: 0.015, h: 0.016, l: 0.014, c: 0.0155, source: "CoinGecko", mode: "ohlc" },
      {
        t: 60 * 60_000,
        o: 0.0155,
        h: 0.017,
        l: 0.015,
        c: 0.016,
        source: "CoinGecko",
        mode: "ohlc",
      },
    ]);
  });
});
