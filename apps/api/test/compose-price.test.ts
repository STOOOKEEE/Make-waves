import { describe, it, expect } from "vitest";
import {
  composePrice,
  composePriceMap,
  PriceDivergenceError,
  PriceUnavailableError,
} from "../src/feed/compose-price";
import type {
  ComposeOptions,
  FeedLogger,
  OnchainPriceProvider,
} from "../src/feed/compose-price";
import { PriceFeedError } from "../src/feed/errors";

const OPTS: ComposeOptions = { maxDivergence: 0.05, prefer: "cex" };

function collectLogger(): { warnings: string[]; logger: FeedLogger } {
  const warnings: string[] = [];
  return { warnings, logger: { warn: (m) => warnings.push(m) } };
}

function provider(fn: (symbol: string) => Promise<number | undefined>): OnchainPriceProvider {
  return { priceFor: fn };
}

describe("composePrice", () => {
  it("utilise la seule source disponible", () => {
    expect(composePrice({ cex: 2 }, OPTS)).toEqual({ price: 2, used: "cex" });
    expect(composePrice({ onchain: 3 }, OPTS)).toEqual({ price: 3, used: "onchain" });
  });

  it("retient la source préférée quand les deux concordent", () => {
    const r = composePrice({ cex: 2, onchain: 2.04 }, OPTS);
    expect(r.used).toBe("both");
    expect(r.price).toBe(2); // prefer cex
    expect(r.divergence).toBeCloseTo(0.02, 4);
  });

  it("prefer onchain → prend le prix on-chain", () => {
    const r = composePrice({ cex: 2, onchain: 2.04 }, { maxDivergence: 0.05, prefer: "onchain" });
    expect(r.price).toBe(2.04);
  });

  it("lève PriceDivergenceError au-delà du seuil", () => {
    expect(() => composePrice({ cex: 2, onchain: 2.2 }, OPTS)).toThrow(
      PriceDivergenceError,
    );
  });

  it("lève PriceUnavailableError si aucune source", () => {
    expect(() => composePrice({}, OPTS)).toThrow(PriceUnavailableError);
  });

  it("rejette un prix aberrant ou un seuil invalide", () => {
    expect(() => composePrice({ cex: -1 }, OPTS)).toThrow(PriceFeedError);
    expect(() => composePrice({ cex: 2 }, { maxDivergence: -1, prefer: "cex" })).toThrow(
      PriceFeedError,
    );
  });
});

describe("composePriceMap", () => {
  it("sans source on-chain, renvoie le CEX restreint aux symboles (non-régression)", async () => {
    const map = await composePriceMap({ XRP: 2, ETH: 3000 }, ["XRP", "ETH"], OPTS);
    expect(map).toEqual({ XRP: 2, ETH: 3000 });
  });

  it("ne renvoie que les symboles demandés (pas de fuite depuis cexPrices)", async () => {
    const map = await composePriceMap({ XRP: 2, BTC: 50000 }, ["XRP"], OPTS);
    expect(map).toEqual({ XRP: 2 });
  });

  it("compose avec l'on-chain quand il concorde", async () => {
    const map = await composePriceMap(
      { XRP: 2 },
      ["XRP"],
      OPTS,
      provider(async () => 2.04),
    );
    expect(map).toEqual({ XRP: 2 }); // prefer cex
  });

  it("retombe sur le CEX et journalise en cas de divergence", async () => {
    const { warnings, logger } = collectLogger();
    const map = await composePriceMap(
      { XRP: 2 },
      ["XRP"],
      OPTS,
      provider(async () => 2.5),
      logger,
    );
    expect(map).toEqual({ XRP: 2 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("repli sur le CEX");
  });

  it("retombe sur le CEX si le fournisseur on-chain échoue", async () => {
    const { warnings, logger } = collectLogger();
    const map = await composePriceMap(
      { XRP: 2 },
      ["XRP"],
      OPTS,
      provider(async () => {
        throw new Error("ws down");
      }),
      logger,
    );
    expect(map).toEqual({ XRP: 2 });
    expect(warnings[0]).toContain("on-chain indisponible");
  });

  it("prefer onchain : prend le prix on-chain quand il concorde", async () => {
    const map = await composePriceMap(
      { XRP: 2 },
      ["XRP"],
      { maxDivergence: 0.05, prefer: "onchain" },
      provider(async () => 2.04),
    );
    expect(map).toEqual({ XRP: 2.04 });
  });

  it("prefer onchain : divergence → repli sur le CEX malgré la préférence", async () => {
    const { warnings, logger } = collectLogger();
    const map = await composePriceMap(
      { XRP: 2 },
      ["XRP"],
      { maxDivergence: 0.05, prefer: "onchain" },
      provider(async () => 2.5),
      logger,
    );
    expect(map).toEqual({ XRP: 2 });
    expect(warnings[0]).toContain("repli sur le CEX");
  });

  it("omet un symbole sans aucun prix exploitable", async () => {
    const { warnings, logger } = collectLogger();
    const map = await composePriceMap({}, ["DOGE"], OPTS, undefined, logger);
    expect(map).toEqual({});
    expect(warnings[0]).toContain("omis");
  });
});
