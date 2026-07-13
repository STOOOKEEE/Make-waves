import { describe, it, expect } from "vitest";
import { badgeByCode, BADGE_CATALOG } from "../src/badges/catalog";
import { earnedCodes } from "../src/badges/merit";

describe("earnedCodes", () => {
  it("aucun badge sans activité", () => {
    expect(earnedCodes({ fillCount: 0, competitionCount: 0 })).toEqual([]);
  });

  it("first_trade dès le premier fill", () => {
    expect(earnedCodes({ fillCount: 1, competitionCount: 0 })).toEqual(["first_trade"]);
  });

  it("first_trade + ten_trades à dix fills", () => {
    expect(earnedCodes({ fillCount: 10, competitionCount: 0 })).toEqual([
      "first_trade",
      "ten_trades",
    ]);
  });

  it("ajoute first_competition dès une compétition rejointe", () => {
    expect(earnedCodes({ fillCount: 12, competitionCount: 1 })).toEqual([
      "first_trade",
      "ten_trades",
      "first_competition",
    ]);
  });
});

describe("badgeByCode", () => {
  it("retrouve un badge du catalogue avec un taxon unique", () => {
    const badge = badgeByCode("first_trade");
    expect(badge?.taxon).toBe(1);
    const taxons = BADGE_CATALOG.map((b) => b.taxon);
    expect(new Set(taxons).size).toBe(taxons.length);
  });

  it("retourne undefined pour un code inconnu", () => {
    expect(badgeByCode("nope")).toBeUndefined();
  });
});
