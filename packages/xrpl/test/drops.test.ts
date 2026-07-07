import { describe, it, expect } from "vitest";
import { allocateLargestRemainder } from "../src/tx/drops";
import { InvalidAmountError } from "../src/errors";

const DROPS = 1_000_000;

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe("allocateLargestRemainder", () => {
  it("conserve le total : Σ unités = round(Σ montants × unitsPerWhole)", () => {
    const amounts = [1 / 3, 1 / 3, 1 / 3]; // 1 XRP réparti en trois
    const units = allocateLargestRemainder(amounts, DROPS);
    expect(sum(units)).toBe(1_000_000); // pas 999 999
    // Le drop résiduel va à la 1re part (plus grand reste, départage stable).
    expect(units).toEqual([333_334, 333_333, 333_333]);
  });

  it("ne distribue rien quand tout tombe juste", () => {
    expect(allocateLargestRemainder([0.1, 0.2], 10)).toEqual([1, 2]);
  });

  it("gère une seule part", () => {
    expect(allocateLargestRemainder([0.5], DROPS)).toEqual([500_000]);
  });

  it("liste vide → vide", () => {
    expect(allocateLargestRemainder([], DROPS)).toEqual([]);
  });

  it("conserve sur des montants variés (propriété)", () => {
    const cases: number[][] = [
      [0.123456, 0.654321, 0.222223],
      [10.1, 20.2, 30.3, 5.05],
      [0, 0.000001, 0.999999],
    ];
    for (const amounts of cases) {
      const units = allocateLargestRemainder(amounts, DROPS);
      expect(sum(units)).toBe(Math.round(sum(amounts) * DROPS));
      // Chaque part reste à 1 drop près de sa valeur idéale plancherisée.
      units.forEach((u, i) => {
        const ideal = Math.floor((amounts[i] ?? 0) * DROPS);
        expect(u === ideal || u === ideal + 1).toBe(true);
      });
    }
  });

  it("rejette un montant négatif ou un unitsPerWhole invalide", () => {
    expect(() => allocateLargestRemainder([-1], DROPS)).toThrow(InvalidAmountError);
    expect(() => allocateLargestRemainder([1], 0)).toThrow(InvalidAmountError);
    expect(() => allocateLargestRemainder([1], 1.5)).toThrow(InvalidAmountError);
  });

  it("rejette un total trop grand pour une répartition exacte en number", () => {
    expect(() => allocateLargestRemainder([1e12], DROPS)).toThrow(InvalidAmountError);
  });

  it("conserve sur des magnitudes mélangées (grand + minuscule)", () => {
    const amounts = [1_000_000, 0.000001, 50.123456];
    const units = allocateLargestRemainder(amounts, DROPS);
    expect(sum(units)).toBe(Math.round(sum(amounts) * DROPS));
  });
});
