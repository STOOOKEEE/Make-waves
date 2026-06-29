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

  it("retombe sur l'historique CoinGecko pour chaque symbole proposé par /markets", async () => {
    const marketIds: Record<string, string> = {
      RAIN: "rain",
      HYPE: "hyperliquid",
      FIGR_HELOC: "figure-heloc",
    };
    const historyCalls: string[] = [];
    const fetchJson: FetchJson = (url) => {
      if (url.includes("/coins/markets")) {
        return Promise.resolve(
          Object.entries(marketIds).map(([symbol, id], index) => ({
            id,
            symbol: symbol.toLowerCase(),
            name: symbol,
            current_price: 1 + index,
            price_change_percentage_24h: index,
          })),
        );
      }
      if (url.includes("/klines")) {
        return Promise.reject(new Error("Binance ne cote pas ce symbole"));
      }
      const matchedId = Object.values(marketIds).find((id) =>
        url.includes(`/coins/${encodeURIComponent(id)}/market_chart`),
      );
      if (matchedId !== undefined) {
        historyCalls.push(matchedId);
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
    for (const symbol of Object.keys(marketIds)) {
      const res = await app.inject({ method: "GET", url: `/history/${symbol}?interval=1h&limit=2` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([
        { t: 0, o: 0.01, h: 0.01, l: 0.01, c: 0.01, source: "CoinGecko", mode: "price" },
        {
          t: 60 * 60_000,
          o: 0.02,
          h: 0.02,
          l: 0.02,
          c: 0.02,
          source: "CoinGecko",
          mode: "price",
        },
      ]);
    }
    expect(historyCalls).toEqual(["rain", "hyperliquid", "figure-heloc"]);
  });

  it("préfère les bougies OHLC CoinGecko au fallback price-only", async () => {
    const urls: string[] = [];
    const fetchJson: FetchJson = (url) => {
      urls.push(url);
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
      if (url.includes("/coins/rain/ohlc")) {
        return Promise.resolve([
          [0, 0.015, 0.016, 0.014, 0.0155],
          [60 * 60_000, 0.0155, 0.017, 0.015, 0.016],
        ]);
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
    expect(urls.some((url) => url.includes("/coins/rain/market_chart"))).toBe(false);
  });

  it("préfère les chandeliers Gate à CoinGecko quand Binance ne cote pas le symbole", async () => {
    const urls: string[] = [];
    const fetchJson: FetchJson = (url) => {
      urls.push(url);
      if (url.includes("/coins/markets")) {
        return Promise.resolve([
          {
            id: "canton",
            symbol: "cc",
            name: "Canton",
            current_price: 0.146,
            price_change_percentage_24h: -3,
          },
        ]);
      }
      if (url.includes("/klines")) {
        return Promise.reject(new Error("Binance ne cote pas CC"));
      }
      if (url.includes("/spot/candlesticks")) {
        return Promise.resolve([
          ["1782752400", "2592.64777000", "0.14518", "0.14521", "0.14501", "0.14502", "17874.00000000", "true"],
        ]);
      }
      return Promise.reject(new Error(`URL inattendue: ${url}`));
    };
    const { app, refreshPrices } = createApp({
      markets: { baseUrl: "https://api.example.com/api/v3", vsCurrency: "usd", perPage: 250 },
      fetchJson,
    });
    await refreshPrices();
    const res = await app.inject({ method: "GET", url: "/history/CC?interval=5m&limit=120" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
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
    expect(urls.some((url) => url.includes("/coins/canton/ohlc"))).toBe(false);
  });

  it("préfère l'historique DEX quand il est disponible pour le symbole", async () => {
    const urls: string[] = [];
    const fetchJson: FetchJson = (url) => {
      urls.push(url);
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
      return Promise.reject(new Error(`URL inattendue: ${url}`));
    };
    const { app, refreshPrices } = createApp({
      markets: { baseUrl: "https://api.example.com/api/v3", vsCurrency: "usd", perPage: 250 },
      fetchJson,
      getDexHistory: async (symbol, interval, limit) => {
        expect(symbol).toBe("RAIN");
        expect(interval).toBe("5m");
        expect(limit).toBe(288);
        return [
          { t: 0, o: 0.015, h: 0.016, l: 0.014, c: 0.0155, source: "GeckoTerminal", mode: "ohlc" },
        ];
      },
    });
    await refreshPrices();
    const res = await app.inject({ method: "GET", url: "/history/RAIN?interval=5m&limit=288" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { t: 0, o: 0.015, h: 0.016, l: 0.014, c: 0.0155, source: "GeckoTerminal", mode: "ohlc" },
    ]);
    expect(urls.some((url) => url.includes("/coins/rain/ohlc"))).toBe(false);
  });
});
