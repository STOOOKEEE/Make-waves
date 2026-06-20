import { describe, it, expect } from "vitest";
import { assertValidAmount, amountsEqual } from "../src/tx/amount";
import { InvalidAmountError, InvalidAddressError } from "../src/errors";
import type { IssuedCurrencyAmount } from "xrpl";

const ISSUER = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";

describe("assertValidAmount — drops XRP (string)", () => {
  it("accepte un entier positif en drops", () => {
    expect(() => assertValidAmount("10000000", "amount")).not.toThrow();
  });

  it("rejette zéro", () => {
    expect(() => assertValidAmount("0", "amount")).toThrow(InvalidAmountError);
  });

  it("rejette un décimal (drops = entiers)", () => {
    expect(() => assertValidAmount("1.5", "amount")).toThrow(InvalidAmountError);
  });

  it("rejette un signe négatif", () => {
    expect(() => assertValidAmount("-1", "amount")).toThrow(InvalidAmountError);
  });
});

describe("assertValidAmount — token émis (objet)", () => {
  it("accepte un montant de token valide", () => {
    const amount: IssuedCurrencyAmount = {
      currency: "USD",
      issuer: ISSUER,
      value: "5",
    };
    expect(() => assertValidAmount(amount, "amount")).not.toThrow();
  });

  it("rejette une value ≤ 0", () => {
    const amount: IssuedCurrencyAmount = {
      currency: "USD",
      issuer: ISSUER,
      value: "0",
    };
    expect(() => assertValidAmount(amount, "amount")).toThrow(InvalidAmountError);
  });

  it("rejette une currency vide", () => {
    const amount: IssuedCurrencyAmount = {
      currency: "",
      issuer: ISSUER,
      value: "5",
    };
    expect(() => assertValidAmount(amount, "amount")).toThrow(InvalidAmountError);
  });

  it("rejette un issuer invalide", () => {
    const amount: IssuedCurrencyAmount = {
      currency: "USD",
      issuer: "pas-une-adresse",
      value: "5",
    };
    expect(() => assertValidAmount(amount, "amount")).toThrow(
      InvalidAddressError,
    );
  });
});

describe("amountsEqual", () => {
  it("compare deux montants XRP en string", () => {
    expect(amountsEqual("1", "1")).toBe(true);
    expect(amountsEqual("1", "2")).toBe(false);
  });

  it("compare deux montants de token", () => {
    const a: IssuedCurrencyAmount = { currency: "USD", issuer: ISSUER, value: "5" };
    const b: IssuedCurrencyAmount = { currency: "USD", issuer: ISSUER, value: "5" };
    expect(amountsEqual(a, b)).toBe(true);
  });

  it("types différents ne sont jamais égaux", () => {
    const token: IssuedCurrencyAmount = {
      currency: "USD",
      issuer: ISSUER,
      value: "5",
    };
    expect(amountsEqual("5", token)).toBe(false);
  });
});
