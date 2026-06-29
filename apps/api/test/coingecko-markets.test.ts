import { describe, it, expect } from "vitest";
import { fetchMarkets } from "../src/feed/coingecko-markets";
import type { MarketsFeedConfig } from "../src/feed/coingecko-markets";
import type { FetchJson } from "../src/feed/cex-price-feed";

const CONFIG: MarketsFeedConfig = {
  baseUrl: "https://cex.test/v3",
  vsCurrency: "usd",
  perPage: 250,
};

function fakeFetch(response: unknown): { fetchJson: FetchJson; urls: string[] } {
  const urls: string[] = [];
  const fetchJson: FetchJson = (url) => {
    urls.push(url);
    return Promise.resolve(response);
  };
  return { fetchJson, urls };
}

const ROW = (over: Record<string, unknown>) => ({
  id: "x",
  symbol: "x",
  name: "X",
  current_price: 1,
  price_change_percentage_24h: 0,
  ...over,
});

describe("fetchMarkets", () => {
  it("mappe les coins (symbole en majuscules, nom, prix, %24h)", async () => {
    const { fetchJson } = fakeFetch([
      ROW({ symbol: "btc", name: "Bitcoin", current_price: 60000, price_change_percentage_24h: 1.5 }),
      ROW({ symbol: "hype", name: "Hyperliquid", current_price: 63.5, price_change_percentage_24h: -2 }),
    ]);
    const rows = await fetchMarkets(CONFIG, fetchJson);
    expect(rows).toEqual([
      { id: "x", symbol: "BTC", name: "Bitcoin", price: 60000, change24h: 1.5 },
      { id: "x", symbol: "HYPE", name: "Hyperliquid", price: 63.5, change24h: -2 },
    ]);
  });

  it("construit l'URL /coins/markets avec per_page et %24h", async () => {
    const { fetchJson, urls } = fakeFetch([ROW({ symbol: "btc", name: "Bitcoin" })]);
    await fetchMarkets(CONFIG, fetchJson);
    expect(urls[0]).toContain("/coins/markets");
    expect(urls[0]).toContain("per_page=250");
    expect(urls[0]).toContain("price_change_percentage=24h");
    expect(urls[0]).toContain("vs_currency=usd");
  });

  it("dédoublonne par symbole (garde le premier = plus gros market cap)", async () => {
    const { fetchJson } = fakeFetch([
      ROW({ symbol: "btc", name: "Bitcoin", current_price: 60000 }),
      ROW({ symbol: "btc", name: "Bitcoin clone", current_price: 1 }),
    ]);
    const rows = await fetchMarkets(CONFIG, fetchJson);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ symbol: "BTC", price: 60000 });
  });

  it("ignore les entrées invalides (prix ≤ 0, symbole/nom manquant) sans tout faire échouer", async () => {
    const { fetchJson } = fakeFetch([
      ROW({ symbol: "btc", name: "Bitcoin", current_price: 60000 }),
      ROW({ symbol: "bad", name: "Bad", current_price: 0 }),
      ROW({ symbol: "", name: "Empty", current_price: 5 }),
      ROW({ symbol: "nan", name: "NaN", current_price: "oops" }),
      "not-an-object",
    ]);
    const rows = await fetchMarkets(CONFIG, fetchJson);
    expect(rows.map((r) => r.symbol)).toEqual(["BTC"]);
  });

  it("change24h absent → 0", async () => {
    const { fetchJson } = fakeFetch([
      ROW({ symbol: "btc", name: "Bitcoin", current_price: 60000, price_change_percentage_24h: null }),
    ]);
    const rows = await fetchMarkets(CONFIG, fetchJson);
    expect(rows[0]?.change24h).toBe(0);
  });

  it("lève si la réponse n'est pas un tableau", async () => {
    const { fetchJson } = fakeFetch({ error: "rate limited" });
    await expect(fetchMarkets(CONFIG, fetchJson)).rejects.toThrow(/tableau attendu/);
  });

  it("lève si aucun coin exploitable", async () => {
    const { fetchJson } = fakeFetch([ROW({ symbol: "bad", current_price: 0 })]);
    await expect(fetchMarkets(CONFIG, fetchJson)).rejects.toThrow(/aucun coin exploitable/);
  });
});
