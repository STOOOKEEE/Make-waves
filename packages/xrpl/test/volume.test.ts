import { describe, it, expect } from "vitest";
import { evaluateVolumeTrade } from "../src/volume/evaluate";
import type { VolumeTradeInputs } from "../src/volume/evaluate";
import { planVolumeTrade } from "../src/volume/engine";
import type { VolumeEngineConfig } from "../src/volume/engine";
import { InvalidAmountError } from "../src/errors";

function inputs(partial: Partial<VolumeTradeInputs> = {}): VolumeTradeInputs {
  return {
    notional: 1000,
    relativeSpread: 0.002,
    ammFeeRate: 0.003,
    txFee: 0.01,
    slippageRate: 0.001,
    rebateRate: 0,
    ...partial,
  };
}

const ENABLED: VolumeEngineConfig = {
  enabled: true,
  selfGeneratedAttributionConfirmed: true,
  minNetEdge: 5,
};

describe("evaluateVolumeTrade", () => {
  it("perte sans rebate (wash-trading)", () => {
    const result = evaluateVolumeTrade(inputs());
    expect(result.profitable).toBe(false);
    expect(result.netEdge).toBeCloseTo(-10.02, 6); // -(2 + 6 + 0.02 + 2 slippage)
  });

  it("rentable si le rebate dépasse les coûts", () => {
    const result = evaluateVolumeTrade(inputs({ rebateRate: 0.02 }));
    expect(result.profitable).toBe(true);
    expect(result.netEdge).toBeCloseTo(9.98, 6); // 20 - 10.02
  });

  it("rejette des entrées négatives (slippage compris)", () => {
    expect(() => evaluateVolumeTrade(inputs({ notional: -1 }))).toThrow(InvalidAmountError);
    expect(() => evaluateVolumeTrade(inputs({ ammFeeRate: -0.1 }))).toThrow(InvalidAmountError);
    expect(() => evaluateVolumeTrade(inputs({ slippageRate: -0.1 }))).toThrow(InvalidAmountError);
  });
});

describe("planVolumeTrade (garde-fou)", () => {
  it("refuse si le moteur est désactivé", () => {
    const plan = planVolumeTrade({ ...ENABLED, enabled: false }, inputs({ rebateRate: 0.02 }));
    expect(plan.action).toBe("skip");
    if (plan.action === "skip") expect(plan.reason).toContain("désactivé");
  });

  it("refuse si le volume self-généré n'est pas confirmé par l'orga", () => {
    const plan = planVolumeTrade(
      { ...ENABLED, selfGeneratedAttributionConfirmed: false },
      inputs({ rebateRate: 0.02 }),
    );
    expect(plan.action).toBe("skip");
    if (plan.action === "skip") expect(plan.reason).toContain("non confirmé");
  });

  it("refuse de wash-trader à perte (edge net négatif)", () => {
    const plan = planVolumeTrade(ENABLED, inputs({ rebateRate: 0 }));
    expect(plan.action).toBe("skip");
    if (plan.action === "skip") expect(plan.reason).toContain("perte");
  });

  it("refuse si l'edge net est sous la marge minimale", () => {
    const plan = planVolumeTrade({ ...ENABLED, minNetEdge: 15 }, inputs({ rebateRate: 0.02 }));
    expect(plan.action).toBe("skip");
  });

  it("trade seulement si activé, confirmé ET rentable au-dessus de la marge", () => {
    const plan = planVolumeTrade(ENABLED, inputs({ rebateRate: 0.02 }));
    expect(plan.action).toBe("trade");
    if (plan.action === "trade") expect(plan.evaluation.netEdge).toBeGreaterThan(5);
  });

  it("rejette une marge minimale négative (garde-fou incontournable)", () => {
    expect(() =>
      planVolumeTrade({ ...ENABLED, minNetEdge: -1 }, inputs({ rebateRate: 0.02 })),
    ).toThrow(InvalidAmountError);
  });

  it("frontière : netEdge === minNetEdge → trade (inclusif)", () => {
    // coûts nuls, rebate 1 % → netEdge = 1000 × 0.01 = 10
    const zeroCost = inputs({
      relativeSpread: 0,
      ammFeeRate: 0,
      txFee: 0,
      slippageRate: 0,
      rebateRate: 0.01,
    });
    const plan = planVolumeTrade({ ...ENABLED, minNetEdge: 10 }, zeroCost);
    expect(plan.action).toBe("trade");
  });
});
