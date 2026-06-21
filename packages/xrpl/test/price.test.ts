import { describe, it, expect } from "vitest";
import { amountToQuantity } from "../src/price/quantity";
import {
  ammSpotPrice,
  midPrice,
  relativeSpread,
  assertValidPrice,
} from "../src/price/spot";
import { InvalidPriceError, InvalidAmountError } from "../src/errors";
import type { IssuedCurrencyAmount } from "xrpl";

const ISSUER = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";

function token(value: string): IssuedCurrencyAmount {
  return { currency: "USD", issuer: ISSUER, value };
}

describe("amountToQuantity", () => {
  it("convertit des drops XRP en XRP", () => {
    expect(amountToQuantity("1000000")).toBe(1);
    expect(amountToQuantity("2500000")).toBe(2.5);
  });

  it("retourne la value d'un token", () => {
    expect(amountToQuantity(token("42"))).toBe(42);
  });

  it("rejette un montant invalide", () => {
    expect(() => amountToQuantity("0")).toThrow(InvalidAmountError);
  });
});

describe("ammSpotPrice", () => {
  it("calcule le prix de base en quote depuis les réserves", () => {
    // pool : 1000 XRP <-> 500 USD -> 1 XRP = 0.5 USD
    const price = ammSpotPrice("1000000000", token("500"));
    expect(price).toBe(0.5);
  });

  it("est cohérent quand on inverse base et quote", () => {
    const p1 = ammSpotPrice("1000000000", token("500")); // 0.5
    const p2 = ammSpotPrice(token("500"), "1000000000"); // 2
    expect(p1 * p2).toBeCloseTo(1);
  });

  it("reste juste sur de grosses réserves (millions de XRP)", () => {
    // 50M XRP <-> 25M USD -> 0.5 (sous le seuil ~9 Md XRP de MAX_SAFE_INTEGER)
    const fiftyMillionXrpInDrops = "50000000000000";
    const price = ammSpotPrice(fiftyMillionXrpInDrops, token("25000000"));
    expect(price).toBe(0.5);
  });

  it("rejette une réserve invalide", () => {
    expect(() => ammSpotPrice("0", token("500"))).toThrow(InvalidAmountError);
  });
});

describe("midPrice", () => {
  it("calcule le milieu bid/ask", () => {
    expect(midPrice(0.49, 0.51)).toBeCloseTo(0.5);
  });

  it("rejette un prix ≤ 0", () => {
    expect(() => midPrice(0, 0.5)).toThrow(InvalidPriceError);
    expect(() => midPrice(0.5, Number.NaN)).toThrow(InvalidPriceError);
  });
});

describe("relativeSpread", () => {
  it("calcule le spread relatif", () => {
    // bid 0.49, ask 0.51, mid 0.5 -> spread 0.02/0.5 = 0.04
    expect(relativeSpread(0.49, 0.51)).toBeCloseTo(0.04);
  });

  it("vaut 0 quand bid == ask (spread nul)", () => {
    expect(relativeSpread(0.5, 0.5)).toBe(0);
  });

  it("rejette un carnet croisé (ask < bid)", () => {
    expect(() => relativeSpread(0.51, 0.49)).toThrow(InvalidPriceError);
  });
});

describe("assertValidPrice", () => {
  it("accepte un prix positif fini", () => {
    expect(() => assertValidPrice(1.23, "p")).not.toThrow();
  });

  it("rejette zéro, négatif, non fini", () => {
    expect(() => assertValidPrice(0, "p")).toThrow(InvalidPriceError);
    expect(() => assertValidPrice(-1, "p")).toThrow(InvalidPriceError);
    expect(() => assertValidPrice(Number.POSITIVE_INFINITY, "p")).toThrow(
      InvalidPriceError,
    );
  });
});
