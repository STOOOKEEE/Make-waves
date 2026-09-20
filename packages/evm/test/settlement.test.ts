import { describe, it, expect } from "vitest";
import { InvalidPriceError } from "@tide/core";
import type { Position } from "@tide/core";
import { computeOpenSettlement, computeCloseSettlement, SettlementError } from "../src/index";

const DEC = 6;

function pos(overrides: Partial<Position> = {}): Position {
  return {
    id: "p1",
    product: "perp",
    symbol: "XRP",
    side: "long",
    qty: 100,
    entry: 2,
    leverage: 5,
    margin: 40, // notional 200 / levier 5
    fee: 0.12,
    ...overrides,
  };
}

describe("computeOpenSettlement", () => {
  it("convertit marge + fee en unités de base", () => {
    expect(computeOpenSettlement(40, 0.12, DEC)).toEqual({
      marginBase: 40_000_000n,
      feeBase: 120_000n,
    });
  });

  it("rejette marge / fee invalides", () => {
    expect(() => computeOpenSettlement(-1, 0, DEC)).toThrow(SettlementError);
    expect(() => computeOpenSettlement(1, -1, DEC)).toThrow(SettlementError);
    expect(() => computeOpenSettlement(Number.NaN, 0, DEC)).toThrow(SettlementError);
  });
});

describe("computeCloseSettlement", () => {
  it("gain d'un long quand le prix monte", () => {
    // entry 2, exit 2.5, qty 100 → PnL = (2.5-2)*100 = 50
    const s = computeCloseSettlement(pos(), 2.5, DEC);
    expect(s.marginReleaseBase).toBe(40_000_000n);
    expect(s.pnlBase).toBe(50_000_000n);
  });

  it("perte plafonnée à -marge (isolated)", () => {
    // exit 1 → PnL = (1-2)*100 = -100, plafonné à -40
    const s = computeCloseSettlement(pos(), 1, DEC);
    expect(s.pnlBase).toBe(-40_000_000n);
    expect(s.pnlBase).toBe(-s.marginReleaseBase);
  });

  it("gain d'un short quand le prix baisse", () => {
    // short, entry 2, exit 1.5, qty 100 → PnL = (2-1.5)*100 = 50
    const s = computeCloseSettlement(pos({ side: "short" }), 1.5, DEC);
    expect(s.pnlBase).toBe(50_000_000n);
  });

  it("pnlBase ne descend jamais sous -marginReleaseBase", () => {
    const s = computeCloseSettlement(pos(), 0.01, DEC); // perte massive
    expect(s.pnlBase >= -s.marginReleaseBase).toBe(true);
    expect(s.pnlBase).toBe(-s.marginReleaseBase);
  });

  it("prix de sortie aberrant lève (via positionPnl)", () => {
    expect(() => computeCloseSettlement(pos(), 0, DEC)).toThrow(InvalidPriceError);
    expect(() => computeCloseSettlement(pos(), Number.NaN, DEC)).toThrow(InvalidPriceError);
  });
});
