import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";
import { PriceCache } from "../src/feed/price-cache";
import type { CexFeedConfig, FetchJson } from "../src/feed/cex-price-feed";

const FEED: CexFeedConfig = {
  baseUrl: "https://cex.test/v3",
  symbolToId: { XRP: "ripple" },
  vsCurrency: "usd",
};

describe("PriceCache", () => {
  it("part vide et retourne des copies", () => {
    const cache = new PriceCache();
    expect(cache.current()).toEqual({});

    cache.set({ XRP: 0.5 });
    const snapshot = cache.current();
    (snapshot as Record<string, number>).XRP = 999; // mutation externe forcée
    expect(cache.current()).toEqual({ XRP: 0.5 });
  });
});

describe("createApp", () => {
  function appWith(price: number): ReturnType<typeof createApp> {
    const fetchJson: FetchJson = () => Promise.resolve({ ripple: { usd: price } });
    return createApp({ feed: FEED, symbols: ["XRP"], fetchJson });
  }

  it("sert un leaderboard à 0 prix avant tout rafraîchissement", async () => {
    const { app } = appWith(0.5);
    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "a" } });
    const res = await app.inject({ method: "GET", url: "/leaderboard" });
    expect(res.statusCode).toBe(200);
    // a ne détient que RLUSD (devise de réf), pas de prix requis -> equity ok
    expect(res.json()[0].userId).toBe("a");
  });

  it("démarre un vrai serveur HTTP et répond (listen + fetch réel)", async () => {
    const { app } = appWith(0.5);
    await app.listen({ port: 0, host: "127.0.0.1" });
    try {
      const address = app.server.address();
      const port =
        typeof address === "object" && address !== null ? address.port : 0;
      const res = await fetch(`http://127.0.0.1:${String(port)}/leaderboard`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it("rafraîchit le cache depuis le feed et le reflète dans les routes", async () => {
    const { app, cache, refreshPrices } = appWith(0.6);
    await refreshPrices();
    expect(cache.current()).toEqual({ XRP: 0.6 });

    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "a" } });
    await app.inject({
      method: "POST",
      url: "/accounts/a/orders",
      payload: { pair: { base: "XRP", quote: "RLUSD" }, side: "buy", amount: 100, price: 0.5 },
    });
    const res = await app.inject({ method: "GET", url: "/leaderboard" });
    // a: 9950 RLUSD + 100 XRP @0.6 -> 10010 (capital défaut 10000) -> pnl +10
    expect(res.json()[0].pnl).toBeCloseTo(10);
  });

  it("retombe sur l'historique CoinGecko quand Binance ne cote pas le symbole", async () => {
    const fetchJson: FetchJson = (url) => {
      if (url.includes("/coins/markets")) {
        return Promise.resolve([
          {
            id: "rain",
            symbol: "rain",
            name: "Rain",
            current_price: 0.016,
            price_change_percentage_24h: 2,
          },
        ]);
      }
      if (url.includes("/klines")) {
        return Promise.reject(new Error("Binance ne cote pas RAIN"));
      }
      if (url.includes("/coins/rain/market_chart")) {
        return Promise.resolve({
          prices: [
            [0, 0.01],
            [60 * 60_000, 0.02],
          ],
        });
      }
      return Promise.reject(new Error(`URL inattendue: ${url}`));
    };
    const { app, refreshPrices } = createApp({
      markets: { baseUrl: "https://api.example.com/api/v3", vsCurrency: "usd", perPage: 250 },
      fetchJson,
    });
    await refreshPrices();
    const res = await app.inject({ method: "GET", url: "/history/RAIN?interval=1h&limit=2" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { t: 0, o: 0.01, h: 0.01, l: 0.01, c: 0.01 },
      { t: 60 * 60_000, o: 0.02, h: 0.02, l: 0.02, c: 0.02 },
    ]);
  });
});
