import { describe, it, expect } from "vitest";
import { planExecution } from "../src/exec/route";
import type { ExecutionRequest } from "../src/exec/route";
import { InvalidAmountError } from "../src/errors";

const ACCOUNT = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const ISSUER = "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B";
const XRP = { currency: "XRP" };
const USD = { currency: "USD", issuer: ISSUER };
const TAG = 7777;

function request(partial: Partial<ExecutionRequest>): ExecutionRequest {
  return {
    account: ACCOUNT,
    base: XRP,
    quote: USD,
    side: "buy",
    amountBase: 100,
    ammPrice: 0.5,
    bookPrice: 0.52,
    slippageTolerance: 0,
    sourceTag: TAG,
    ...partial,
  };
}

describe("planExecution", () => {
  it("achat : retient le prix le plus bas, fournit la quote contre la base", () => {
    const plan = planExecution(request({ side: "buy", slippageTolerance: 0 }));
    expect(plan.venue).toBe("amm"); // 0.5 < 0.52
    expect(plan.referencePrice).toBe(0.5);
    expect(plan.limitPrice).toBe(0.5);
    // gives = quote (USD) = 100 × 0.5 = 50 ; wants = base (XRP) = 100 → drops
    expect(plan.offer.TakerGets).toEqual({ currency: "USD", issuer: ISSUER, value: "50" });
    expect(plan.offer.TakerPays).toBe("100000000");
    expect(plan.offer.SourceTag).toBe(TAG);
  });

  it("vente : retient le prix le plus haut, fournit la base contre la quote", () => {
    const plan = planExecution(request({ side: "sell", slippageTolerance: 0 }));
    expect(plan.venue).toBe("book"); // 0.52 > 0.5
    expect(plan.referencePrice).toBe(0.52);
    expect(plan.offer.TakerGets).toBe("100000000"); // base XRP
    const pays = plan.offer.TakerPays;
    expect(typeof pays).toBe("object");
    if (typeof pays === "object") {
      expect(Number(pays.value)).toBeCloseTo(52, 6); // 100 × 0.52
    }
  });

  it("applique le slippage : plafond à l'achat", () => {
    const plan = planExecution(request({ side: "buy", slippageTolerance: 0.01 }));
    expect(plan.limitPrice).toBeCloseTo(0.505, 6); // 0.5 × 1.01
    const gets = plan.offer.TakerGets;
    if (typeof gets === "object") {
      expect(Number(gets.value)).toBeCloseTo(50.5, 6);
    }
  });

  it("applique le slippage : plancher à la vente", () => {
    const plan = planExecution(request({ side: "sell", slippageTolerance: 0.01 }));
    expect(plan.limitPrice).toBeCloseTo(0.5148, 6); // 0.52 × 0.99
  });

  it("convertit XRP en drops entiers", () => {
    const plan = planExecution(request({ side: "buy", amountBase: 1.5, slippageTolerance: 0 }));
    expect(plan.offer.TakerPays).toBe("1500000"); // 1.5 XRP
  });

  it("rejette des entrées invalides", () => {
    expect(() => planExecution(request({ amountBase: 0 }))).toThrow(InvalidAmountError);
    expect(() => planExecution(request({ ammPrice: -1 }))).toThrow(InvalidAmountError);
    expect(() => planExecution(request({ slippageTolerance: 1 }))).toThrow(InvalidAmountError);
    expect(() => planExecution(request({ slippageTolerance: -0.1 }))).toThrow(InvalidAmountError);
  });

  it("exige un issuer pour un token (quote sans issuer)", () => {
    expect(() =>
      planExecution(request({ quote: { currency: "USD" }, side: "buy" })),
    ).toThrow(InvalidAmountError);
  });

  it("quote = XRP : fournit des drops, exige l'IOU base", () => {
    // base USD, quote XRP : achat de 10 USD à 2 XRP/USD
    const plan = planExecution(
      request({ base: USD, quote: XRP, side: "buy", amountBase: 10, ammPrice: 2, bookPrice: 2.1 }),
    );
    expect(plan.offer.TakerGets).toBe("20000000"); // 10 × 2 = 20 XRP (gives)
    expect(plan.offer.TakerPays).toEqual({ currency: "USD", issuer: ISSUER, value: "10" });
  });

  it("nettoie un résidu flottant dans la value IOU (pas de 0.30000000000000004)", () => {
    const plan = planExecution(
      request({ side: "buy", amountBase: 3, ammPrice: 0.1, bookPrice: 0.2 }),
    );
    const gets = plan.offer.TakerGets; // 3 × 0.1 = 0.3 USD
    if (typeof gets === "object") {
      expect(gets.value).toBe("0.3");
    }
  });

  it("arrondi directionnel des drops : fourni → bas, exigé → haut", () => {
    // gives quote-XRP arrondi vers le bas (en faveur de l'acheteur)
    const buy = planExecution(
      request({ base: USD, quote: XRP, side: "buy", amountBase: 1, ammPrice: 2.0000007, bookPrice: 9 }),
    );
    expect(buy.offer.TakerGets).toBe("2000000"); // floor(2000000.7)

    // wants quote-XRP arrondi vers le haut (exige au moins le plancher)
    const sell = planExecution(
      request({ base: USD, quote: XRP, side: "sell", amountBase: 1, ammPrice: 2.0000003, bookPrice: 2.0000003 }),
    );
    expect(sell.offer.TakerPays).toBe("2000001"); // ceil(2000000.3)
  });
});
