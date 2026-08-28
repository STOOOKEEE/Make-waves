// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isGoalMet, plannedRisk, type SandboxSnapshot } from "../src/lib/sandbox/goals";
import type { SimClosed, SimFill, SimPosition } from "../src/lib/sandbox/engine";

function snapshot(overrides: Partial<SandboxSnapshot> = {}): SandboxSnapshot {
  return {
    symbol: "BTC",
    product: "spot",
    orderKind: "market",
    side: "buy",
    amount: 0,
    leverage: 1,
    takeProfit: null,
    stopLoss: null,
    chartMode: "line",
    mark: 100,
    equity: 10_000,
    positions: [],
    fills: [],
    closed: [],
    accelerations: [],
    marketSelections: 0,
    ...overrides,
  };
}

function fill(at: number, overrides: Partial<SimFill> = {}): SimFill {
  return {
    id: `f${String(at)}`,
    at,
    symbol: "BTC",
    side: "buy",
    product: "spot",
    qty: 1,
    price: 100,
    fee: 0,
    liquidity: "taker",
    leverage: 1,
    ...overrides,
  };
}

describe("validation des objectifs d'étape", () => {
  it("valide toujours une étape de lecture", () => {
    expect(isGoalMet({ kind: "read" }, snapshot(), 0)).toBe(true);
  });

  it("lit l'état courant pour les objectifs d'état", () => {
    expect(isGoalMet({ kind: "select-product", value: "perp" }, snapshot(), 0)).toBe(false);
    expect(
      isGoalMet({ kind: "select-product", value: "perp" }, snapshot({ product: "perp" }), 0),
    ).toBe(true);
    expect(
      isGoalMet({ kind: "chart-mode", value: "candles" }, snapshot({ chartMode: "candles" }), 0),
    ).toBe(true);
    expect(isGoalMet({ kind: "select-side", value: "sell" }, snapshot({ side: "sell" }), 0)).toBe(
      true,
    );
    expect(isGoalMet({ kind: "set-amount", min: 200 }, snapshot({ amount: 199 }), 0)).toBe(false);
    expect(isGoalMet({ kind: "set-amount", min: 200 }, snapshot({ amount: 200 }), 0)).toBe(true);
  });

  it("n'accepte un levier que sur un perp", () => {
    expect(isGoalMet({ kind: "set-leverage", min: 5 }, snapshot({ leverage: 10 }), 0)).toBe(false);
    expect(
      isGoalMet({ kind: "set-leverage", min: 5 }, snapshot({ product: "perp", leverage: 10 }), 0),
    ).toBe(true);
  });

  it("ignore ce qui s'est passé avant l'entrée dans l'étape", () => {
    // Le garde `since` : sans lui, un ordre passé à l'étape 10 validerait l'étape 15.
    const s = snapshot({ fills: [fill(500)] });
    expect(isGoalMet({ kind: "place-order" }, s, 1_000)).toBe(false);
    expect(isGoalMet({ kind: "place-order" }, snapshot({ fills: [fill(1_500)] }), 1_000)).toBe(
      true,
    );
  });

  it("filtre les ordres par produit et par levier minimum", () => {
    const perp = snapshot({ fills: [fill(2_000, { product: "perp", leverage: 10 })] });
    expect(isGoalMet({ kind: "place-order", product: "spot" }, perp, 0)).toBe(false);
    expect(isGoalMet({ kind: "place-order", product: "perp" }, perp, 0)).toBe(true);
    expect(isGoalMet({ kind: "place-order", minLeverage: 20 }, perp, 0)).toBe(false);
    expect(isGoalMet({ kind: "place-order", minLeverage: 10 }, perp, 0)).toBe(true);
  });

  it("détecte une clôture et une accélération postérieures à l'étape", () => {
    const closed = [{ at: 2_000 } as SimClosed];
    expect(isGoalMet({ kind: "close-position" }, snapshot({ closed }), 1_000)).toBe(true);
    expect(isGoalMet({ kind: "close-position" }, snapshot({ closed }), 3_000)).toBe(false);
    expect(
      isGoalMet({ kind: "accelerate" }, snapshot({ accelerations: [2_000] }), 1_000),
    ).toBe(true);
  });

  it("exige un stop pour valider un budget de risque", () => {
    const s = snapshot({ amount: 1_000, stopLoss: null });
    expect(isGoalMet({ kind: "risk-budget", maxRiskPct: 1 }, s, 0)).toBe(false);
  });

  it("mesure le budget de risque sur la perte au stop, pas sur la taille", () => {
    // 1 % de 10 000 $ = 100 $. Mark 100, stop 99 → 1 % de distance.
    // Une exposition de 10 000 $ perd donc 100 $ : pile à la limite.
    const atLimit = snapshot({ amount: 10_000, stopLoss: 99, mark: 100 });
    expect(plannedRisk(atLimit)).toBeCloseTo(100, 6);
    expect(isGoalMet({ kind: "risk-budget", maxRiskPct: 1 }, atLimit, 0)).toBe(true);

    const tooBig = snapshot({ amount: 10_100, stopLoss: 99, mark: 100 });
    expect(isGoalMet({ kind: "risk-budget", maxRiskPct: 1 }, tooBig, 0)).toBe(false);
  });

  it("tient compte du levier dans la perte au stop", () => {
    // Même montant engagé, mais 10x d'exposition : la perte au stop décuple.
    const spot = snapshot({ amount: 1_000, stopLoss: 99, mark: 100 });
    const perp = snapshot({
      product: "perp",
      leverage: 10,
      amount: 1_000,
      stopLoss: 99,
      mark: 100,
    });
    expect(plannedRisk(spot)).toBeCloseTo(10, 6);
    expect(plannedRisk(perp)).toBeCloseTo(100, 6);
  });

  it("compte les changements de marché", () => {
    expect(isGoalMet({ kind: "select-market" }, snapshot(), 0)).toBe(false);
    expect(isGoalMet({ kind: "select-market" }, snapshot({ marketSelections: 1 }), 0)).toBe(true);
  });

  it("ne rend pas de risque planifié sans stop ni montant", () => {
    expect(plannedRisk(snapshot())).toBeNull();
    expect(plannedRisk(snapshot({ amount: 100 }))).toBeNull();
  });
});

describe("positions dans l'instantané", () => {
  it("accepte une liste de positions typée", () => {
    const position = { id: "p1", margin: 100 } as SimPosition;
    expect(snapshot({ positions: [position] }).positions).toHaveLength(1);
  });
});
