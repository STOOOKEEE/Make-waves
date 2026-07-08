import { describe, it, expect, beforeEach } from "vitest";
import { buildServer } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import type { FastifyInstance } from "fastify";
import type { PriceMap } from "@tide/core";

const START = 1000;

let app: FastifyInstance;
let paper: PaperService;
let competition: CompetitionService;
let prices: PriceMap;

beforeEach(() => {
  paper = new PaperService(START);
  competition = new CompetitionService();
  prices = { XRP: 0.5 };
  app = buildServer({ paper, competition, getPrices: () => prices });
});

function order(amount: number, price: number): Record<string, unknown> {
  return { pair: { base: "XRP", quote: "RLUSD" }, side: "buy", amount, price };
}

describe("comptes", () => {
  it("ouvre un compte (201)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { userId: "alice" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ userId: "alice" });
  });

  it("rejette un doublon (409)", async () => {
    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "a" } });
    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { userId: "a" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("assure un compte sans erreur si déjà existant (200)", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/accounts/ensure",
      payload: { userId: "a" },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ userId: "a", created: true });

    const second = await app.inject({
      method: "POST",
      url: "/accounts/ensure",
      payload: { userId: "a" },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ userId: "a", created: false });
  });

  it("rejette un corps invalide (400)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { nope: 1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("retourne les soldes (200) et 404 si inconnu", async () => {
    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "a" } });
    const ok = await app.inject({ method: "GET", url: "/accounts/a/balances" });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ RLUSD: START });

    const missing = await app.inject({ method: "GET", url: "/accounts/x/balances" });
    expect(missing.statusCode).toBe(404);
  });
});

describe("ordres", () => {
  beforeEach(async () => {
    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "a" } });
  });

  it("place un ordre (201) et met à jour les soldes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/a/orders",
      payload: order(100, 0.5),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().quoteAmount).toBe(50);

    const bal = await app.inject({ method: "GET", url: "/accounts/a/balances" });
    expect(bal.json()).toEqual({ RLUSD: 950, XRP: 100 });
  });

  it("rejette un solde insuffisant (409)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/a/orders",
      payload: order(10_000, 0.5),
    });
    expect(res.statusCode).toBe(409);
  });

  it("rejette un ordre malformé (400)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/a/orders",
      payload: { side: "buy", amount: 1, price: 1 }, // pair manquante
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("positions perp", () => {
  beforeEach(async () => {
    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "a" } });
  });

  function perp(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      product: "perp",
      symbol: "XRP",
      side: "long",
      qty: 200,
      entry: 0.5,
      leverage: 5,
      margin: 20,
      fee: 0,
      ...over,
    };
  }

  it("ouvre une position (201) et la liste", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/a/positions",
      payload: perp(),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().symbol).toBe("XRP");

    const list = await app.inject({ method: "GET", url: "/accounts/a/positions" });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
  });

  it("inclut le PnL des positions dans l'equity du portfolio", async () => {
    await app.inject({ method: "POST", url: "/accounts/a/positions", payload: perp() });
    prices = { XRP: 0.6 }; // +0.1 * 200 = +20
    const res = await app.inject({ method: "GET", url: "/accounts/a/portfolio" });
    expect(res.json().equity).toBeCloseTo(START + 20);
  });

  it("ferme une position (200) et crédite le PnL réalisé", async () => {
    const open = await app.inject({
      method: "POST",
      url: "/accounts/a/positions",
      payload: perp(),
    });
    const id = open.json().id;
    prices = { XRP: 0.6 };
    const res = await app.inject({
      method: "POST",
      url: `/accounts/a/positions/${id}/close`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().realizedPnl).toBeCloseTo(20);
  });

  it("rejette un levier invalide (400)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/a/positions",
      payload: perp({ leverage: 0 }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("404 à la fermeture d'une position inconnue", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts/a/positions/nope/close",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("leaderboard", () => {
  it("classe les comptes (200)", async () => {
    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "a" } });
    await app.inject({ method: "POST", url: "/accounts", payload: { userId: "b" } });
    await app.inject({
      method: "POST",
      url: "/accounts/b/orders",
      payload: order(2000, 0.5),
    });
    prices = { XRP: 0.6 };
    const res = await app.inject({ method: "GET", url: "/leaderboard" });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((e: { userId: string }) => e.userId)).toEqual(["b", "a"]);
  });
});

describe("book", () => {
  it("retourne un carnet réel si le fournisseur est câblé", async () => {
    const depth = {
      symbol: "XRP",
      quoteSymbol: "USDT",
      source: "Binance",
      asks: [{ price: 0.5, size: 100, total: 100 }],
      bids: [{ price: 0.49, size: 120, total: 120 }],
      mid: 0.495,
      spread: 0.0202,
    };
    const bookApp = buildServer({
      paper,
      competition,
      getPrices: () => prices,
      getBookDepth: async () => depth,
    });
    try {
      const res = await bookApp.inject({ method: "GET", url: "/book/XRP" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(depth);
    } finally {
      await bookApp.close();
    }
  });
});

describe("markets", () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({
    id: `c${String(i)}`,
    symbol: `S${String(i)}`,
    name: `Coin ${String(i)}`,
    price: i + 1,
    change24h: 0,
  }));

  it("renvoie la liste complète sans limit", async () => {
    const marketsApp = buildServer({ paper, competition, getPrices: () => prices, getMarkets: () => rows });
    try {
      const res = await marketsApp.inject({ method: "GET", url: "/markets" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(5);
    } finally {
      await marketsApp.close();
    }
  });

  it("respecte le param limit (borné à la taille de la liste)", async () => {
    const marketsApp = buildServer({ paper, competition, getPrices: () => prices, getMarkets: () => rows });
    try {
      const two = await marketsApp.inject({ method: "GET", url: "/markets?limit=2" });
      expect(two.json()).toHaveLength(2);
      const over = await marketsApp.inject({ method: "GET", url: "/markets?limit=999" });
      expect(over.json()).toHaveLength(5);
      const bad = await marketsApp.inject({ method: "GET", url: "/markets?limit=abc" });
      expect(bad.json()).toHaveLength(5);
    } finally {
      await marketsApp.close();
    }
  });
});

describe("compétitions", () => {
  const comp = {
    id: "c1",
    buyIn: 10,
    rakeRatio: 0,
    payoutWeights: [0.5, 0.3, 0.2],
  };

  it("crée une compétition (201), 400 si invalide, 409 si doublon", async () => {
    const ok = await app.inject({ method: "POST", url: "/competitions", payload: comp });
    expect(ok.statusCode).toBe(201);

    const bad = await app.inject({
      method: "POST",
      url: "/competitions",
      payload: { ...comp, id: "c2", payoutWeights: [0.5, 0.3] },
    });
    expect(bad.statusCode).toBe(400);

    const dup = await app.inject({ method: "POST", url: "/competitions", payload: comp });
    expect(dup.statusCode).toBe(409);
  });

  it("inscrit un joueur, 404 si compétition inconnue", async () => {
    await app.inject({ method: "POST", url: "/competitions", payload: comp });
    const ok = await app.inject({
      method: "POST",
      url: "/competitions/c1/join",
      payload: { userId: "a" },
    });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({
      method: "POST",
      url: "/competitions/zzz/join",
      payload: { userId: "a" },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("clôture et calcule les gains (200)", async () => {
    await app.inject({ method: "POST", url: "/competitions", payload: comp });
    for (const u of ["a", "b"]) {
      await app.inject({ method: "POST", url: "/accounts", payload: { userId: u } });
      await app.inject({
        method: "POST",
        url: `/competitions/c1/join`,
        payload: { userId: u },
      });
    }
    // b se constitue plus d'equity
    await app.inject({
      method: "POST",
      url: "/accounts/b/orders",
      payload: order(100, 0.5),
    });
    prices = { XRP: 1 }; // b: 900 RLUSD + 100 XRP@1 = 1000 ; a: 1000
    const res = await app.inject({ method: "POST", url: "/competitions/c1/close" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // 2 participants, 3 tiers : seuls tiers 1+2 versés (0.5+0.3)*20 = 16 ; reliquat 4.
    expect(body.payouts.length).toBe(2);
    const total = body.payouts.reduce(
      (s: number, p: { amount: number }) => s + p.amount,
      0,
    );
    expect(total).toBeCloseTo(16);
    expect(body.undistributed).toBeCloseTo(4);
  });

  it("clôture d'une compétition inconnue -> 404", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/competitions/zzz/close",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("erreurs serveur", () => {
  it("masque le détail d'une erreur interne (500)", async () => {
    // getPrices qui lève une Error nue (non typée) -> doit donner 500 masqué.
    const boomApp = buildServer({
      paper: new PaperService(START),
      competition: new CompetitionService(),
      getPrices: () => {
        throw new Error("secret interne: DB password=hunter2");
      },
    });
    const res = await boomApp.inject({ method: "GET", url: "/leaderboard" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "Erreur interne" });
    expect(res.body).not.toContain("hunter2");
  });
});
