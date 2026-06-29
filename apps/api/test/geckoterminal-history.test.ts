import { describe, expect, it } from "vitest";
import { fetchGeckoTerminalHistory } from "../src/feed/geckoterminal-history";
import type { FetchJson } from "../src/feed/cex-price-feed";

describe("fetchGeckoTerminalHistory", () => {
  it("récupère la première pool et parse les OHLCV en ordre chronologique", async () => {
    const urls: string[] = [];
    const fetchJson: FetchJson = (url) => {
      urls.push(url);
      if (url.includes("/tokens/0xrain/pools")) {
        return Promise.resolve({
          data: [
            {
              attributes: {
                address: "0xpool",
              },
            },
          ],
        });
      }
      if (url.includes("/pools/0xpool/ohlcv/minute")) {
        return Promise.resolve({
          data: {
            attributes: {
              ohlcv_list: [
                [120, 1.2, 1.3, 1.1, 1.25, 20],
                [60, 1, 1.1, 0.9, 1.05, 10],
              ],
            },
          },
        });
      }
      return Promise.reject(new Error(`URL inattendue: ${url}`));
    };

    const candles = await fetchGeckoTerminalHistory(
      { network: "arbitrum", address: "0xrain" },
      "5m",
      2,
      fetchJson,
    );

    expect(candles).toEqual([
      { t: 60_000, o: 1, h: 1.1, l: 0.9, c: 1.05, source: "GeckoTerminal", mode: "ohlc" },
      { t: 120_000, o: 1.2, h: 1.3, l: 1.1, c: 1.25, source: "GeckoTerminal", mode: "ohlc" },
    ]);
    expect(urls[1]).toContain("aggregate=5");
    expect(urls[1]).toContain("limit=2");
  });
});
