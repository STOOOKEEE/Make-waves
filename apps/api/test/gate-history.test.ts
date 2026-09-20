import { describe, expect, it } from "vitest";
import { fetchGateCandles } from "../src/feed/gate-history";
import type { FetchJson } from "../src/feed/cex-price-feed";

describe("fetchGateCandles", () => {
  it("parse les chandeliers Gate spot", async () => {
    const urls: string[] = [];
    const fetchJson: FetchJson = (url) => {
      urls.push(url);
      return Promise.resolve([
        ["1782752400", "2592.64777000", "0.14518", "0.14521", "0.14501", "0.14502", "17874.00000000", "true"],
      ]);
    };

    const candles = await fetchGateCandles("CC", "5m", 120, fetchJson);

    expect(candles).toEqual([
      {
        t: 1_782_752_400_000,
        o: 0.14502,
        h: 0.14521,
        l: 0.14501,
        c: 0.14518,
        source: "Gate",
        mode: "ohlc",
      },
    ]);
    expect(urls[0]).toContain("currency_pair=CC_USDT");
    expect(urls[0]).toContain("interval=5m");
    expect(urls[0]).toContain("limit=120");
  });

  it("utilise USDT_USD pour l'historique USDT", async () => {
    const urls: string[] = [];
    const fetchJson: FetchJson = (url) => {
      urls.push(url);
      return Promise.resolve([
        ["1782752400", "0", "0.999", "0.999", "0.999", "0.999", "0", "true"],
      ]);
    };

    await fetchGateCandles("USDT", "4h", 10, fetchJson);

    expect(urls[0]).toContain("currency_pair=USDT_USD");
    expect(urls[0]).toContain("interval=4h");
  });
});
