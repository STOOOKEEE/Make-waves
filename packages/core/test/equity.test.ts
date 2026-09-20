import { describe, it, expect } from "vitest";
import { equity, pnl, pnlRatio } from "../src/paper/equity";
import { InvalidPriceError, MissingPriceError } from "../src/errors";

describe("equity", () => {
  it("compte la devise de référence à sa valeur nominale", () => {
    expect(equity({ RLUSD: 1000 }, {}, "RLUSD")).toBe(1000);
  });

  it("valorise les autres devises au prix fourni", () => {
    const value = equity({ RLUSD: 500, XRP: 1000 }, { XRP: 0.5 }, "RLUSD");
    expect(value).toBe(1000);
  });

  it("somme plusieurs devises non-quote", () => {
    const value = equity(
      { RLUSD: 100, XRP: 1000, FOO: 50 },
      { XRP: 0.5, FOO: 2 },
      "RLUSD",
    );
    expect(value).toBe(100 + 500 + 100);
  });

  it("lève si une devise détenue n'a pas de prix", () => {
    expect(() => equity({ XRP: 10 }, {}, "RLUSD")).toThrow(MissingPriceError);
  });

  it("lève si le prix fourni est aberrant (≤ 0, NaN, Infinity)", () => {
    expect(() => equity({ XRP: 10 }, { XRP: 0 }, "RLUSD")).toThrow(
      InvalidPriceError,
    );
    expect(() => equity({ XRP: 10 }, { XRP: -1 }, "RLUSD")).toThrow(
      InvalidPriceError,
    );
    expect(() => equity({ XRP: 10 }, { XRP: Number.NaN }, "RLUSD")).toThrow(
      InvalidPriceError,
    );
    expect(() =>
      equity({ XRP: 10 }, { XRP: Number.POSITIVE_INFINITY }, "RLUSD"),
    ).toThrow(InvalidPriceError);
  });

  it("ignore le prix de la devise de référence même s'il est fourni", () => {
    const value = equity({ RLUSD: 100 }, { RLUSD: 999 }, "RLUSD");
    expect(value).toBe(100);
  });

  it("ne mute ni les soldes ni les prix", () => {
    const balances = { RLUSD: 100, XRP: 1000 };
    const prices = { XRP: 0.5 };
    equity(balances, prices, "RLUSD");
    expect(balances).toEqual({ RLUSD: 100, XRP: 1000 });
    expect(prices).toEqual({ XRP: 0.5 });
  });
});

describe("pnl", () => {
  it("calcule le gain absolu", () => {
    expect(pnl(1200, 1000)).toBe(200);
  });

  it("calcule la perte absolue", () => {
    expect(pnl(800, 1000)).toBe(-200);
  });
});

describe("pnlRatio", () => {
  it("calcule le rendement relatif", () => {
    expect(pnlRatio(1200, 1000)).toBeCloseTo(0.2);
  });

  it("retourne 0 si le capital de départ est nul ou négatif", () => {
    expect(pnlRatio(1200, 0)).toBe(0);
  });
});
