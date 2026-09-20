import { describe, it, expect } from "vitest";
import { toBaseUnits, signedToBaseUnits, fromBaseUnits, SettlementError } from "../src/index";

describe("toBaseUnits", () => {
  it("convertit un entier", () => {
    expect(toBaseUnits(1, 18)).toBe(10n ** 18n);
  });

  it("convertit une fraction", () => {
    expect(toBaseUnits(1.5, 6)).toBe(1_500_000n);
  });

  it("convertit correctement une saisie « propre » stockée en double sous sa valeur", () => {
    // 0.12 est stocké 0.1199999… : l'arrondi au plus proche redonne bien 0,120000.
    expect(toBaseUnits(0.12, 6)).toBe(120_000n);
  });

  it("arrondit au plus proche à `decimals`", () => {
    expect(toBaseUnits(1.2345678, 6)).toBe(1_234_568n); // arrondi sup
    expect(toBaseUnits(1.2345674, 6)).toBe(1_234_567n); // arrondi inf
  });

  it("reste exact bien au-delà de MAX_SAFE_INTEGER", () => {
    // 1_000_000 * 1e18 = 1e24 : impossible via float * scale.
    expect(toBaseUnits(1_000_000, 18)).toBe(10n ** 24n);
  });

  it("arrondit au plus proche à la frontière de la poussière", () => {
    expect(toBaseUnits(0.0000004, 6)).toBe(0n); // < 0,5 unité → 0
    expect(toBaseUnits(0.0000006, 6)).toBe(1n); // ≥ 0,5 unité → 1
  });

  it("decimals 0 = arrondi à l'entier", () => {
    expect(toBaseUnits(42.4, 0)).toBe(42n);
    expect(toBaseUnits(42.9, 0)).toBe(43n);
  });

  it("zéro", () => {
    expect(toBaseUnits(0, 18)).toBe(0n);
  });

  it("arrondi cohérent aux frontières x.xxxxx5 (pas de carry parasite ni d'erreur grossière)", () => {
    expect(toBaseUnits(1.49999995, 6)).toBe(1_500_000n);
    expect(toBaseUnits(50.49999995, 6)).toBe(50_500_000n);
  });

  it("rejette négatif / NaN / Infinity", () => {
    expect(() => toBaseUnits(-1, 18)).toThrow(SettlementError);
    expect(() => toBaseUnits(Number.NaN, 18)).toThrow(SettlementError);
    expect(() => toBaseUnits(Number.POSITIVE_INFINITY, 18)).toThrow(SettlementError);
  });

  it("rejette des décimales invalides", () => {
    expect(() => toBaseUnits(1, -1)).toThrow(SettlementError);
    expect(() => toBaseUnits(1, 1.5)).toThrow(SettlementError);
    expect(() => toBaseUnits(1, 37)).toThrow(SettlementError);
  });

  it("rejette les montants ≥ 1e21 (toFixed deviendrait exponentiel)", () => {
    expect(() => toBaseUnits(1e21, 6)).toThrow(SettlementError);
    expect(() => toBaseUnits(2.5e22, 18)).toThrow(SettlementError);
  });
});

describe("signedToBaseUnits", () => {
  it("positif", () => {
    expect(signedToBaseUnits(2.5, 6)).toBe(2_500_000n);
  });

  it("négatif", () => {
    expect(signedToBaseUnits(-2.5, 6)).toBe(-2_500_000n);
  });

  it("zéro", () => {
    expect(signedToBaseUnits(0, 18)).toBe(0n);
  });

  it("arrondit la magnitude au plus proche, signe conservé", () => {
    expect(signedToBaseUnits(-1.2345674, 6)).toBe(-1_234_567n);
    expect(signedToBaseUnits(-1.49999995, 6)).toBe(-1_500_000n);
  });

  it("rejette NaN et |montant| ≥ 1e21", () => {
    expect(() => signedToBaseUnits(Number.NaN, 18)).toThrow(SettlementError);
    expect(() => signedToBaseUnits(-1e21, 6)).toThrow(SettlementError);
  });
});

describe("fromBaseUnits", () => {
  it("formate une fraction", () => {
    expect(fromBaseUnits(1_500_000n, 6)).toBe("1.5");
  });

  it("formate un entier", () => {
    expect(fromBaseUnits(10n ** 18n, 18)).toBe("1");
  });

  it("formate un négatif", () => {
    expect(fromBaseUnits(-2_500_000n, 6)).toBe("-2.5");
  });

  it("zéro", () => {
    expect(fromBaseUnits(0n, 18)).toBe("0");
  });

  it("decimals 0", () => {
    expect(fromBaseUnits(42n, 0)).toBe("42");
  });

  it("round-trip toBaseUnits → fromBaseUnits", () => {
    expect(fromBaseUnits(toBaseUnits(123.456, 6), 6)).toBe("123.456");
  });
});
