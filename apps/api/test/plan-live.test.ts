import { describe, it, expect } from "vitest";
import { InvalidAmountError } from "@tide/xrpl";
import { LiveExecError, planLiveOffer } from "../src/exec/plan-live";
import type { LivePlanDeps } from "../src/exec/plan-live";

const ISSUER = "rBHYF7U1FLhG9ZWcyhRL9Rytrvx5ARBAUK";
const ACCOUNT = "rPh1pu5PSEPBv45NWPYTN7gUEMmaGNePGY";
const RLUSD = "524C555344000000000000000000000000000000";
const SOURCE_TAG = 7777;

function deps(prices: Record<string, number>): LivePlanDeps {
  return {
    getPrices: () => prices,
    sourceTag: SOURCE_TAG,
    quote: { currency: RLUSD, issuer: ISSUER, symbol: "RLUSD" },
  };
}

const BUY = { account: ACCOUNT, base: "XRP", side: "buy", amountBase: 100, slippageTolerance: 0.01 } as const;

describe("planLiveOffer", () => {
  it("achat : borne ce qu'on FOURNIT (quote) par le slippage, exige la base exacte", () => {
    const plan = planLiveOffer(deps({ XRP: 0.5 }), BUY);
    // Achat de 100 XRP à 0.5 (+1 %) → fournit au plus 50.5 RLUSD, reçoit 100 XRP.
    expect(plan.offer.TakerGets).toEqual({ currency: RLUSD, issuer: ISSUER, value: "50.5" });
    expect(plan.offer.TakerPays).toBe("100000000");
    expect(plan.offer.SourceTag).toBe(SOURCE_TAG);
    expect(plan.referencePrice).toBe(0.5);
    expect(plan.limitPrice).toBeCloseTo(0.505);
  });

  it("vente : fournit la base exacte, exige au moins le quote borné par le slippage", () => {
    const plan = planLiveOffer(deps({ XRP: 0.5 }), { ...BUY, side: "sell" });
    // Vente de 100 XRP à 0.5 (−1 %) → fournit 100 XRP, exige au moins 49.5 RLUSD.
    expect(plan.offer.TakerGets).toBe("100000000");
    expect(plan.offer.TakerPays).toEqual({ currency: RLUSD, issuer: ISSUER, value: "49.5" });
  });

  it("refuse un actif non tradable en Live (base ≠ XRP)", () => {
    expect(() => planLiveOffer(deps({ XRP: 0.5, DOGE: 0.1 }), { ...BUY, base: "DOGE" })).toThrow(
      LiveExecError,
    );
  });

  it("refuse une base identique au quote", () => {
    expect(() => planLiveOffer(deps({ XRP: 0.5 }), { ...BUY, base: "RLUSD" })).toThrow(LiveExecError);
  });

  it("refuse un prix de référence indisponible", () => {
    expect(() => planLiveOffer(deps({}), BUY)).toThrow(LiveExecError);
  });

  it("laisse le moteur rejeter un slippage hors borne (InvalidAmountError)", () => {
    expect(() => planLiveOffer(deps({ XRP: 0.5 }), { ...BUY, slippageTolerance: 1.5 })).toThrow(
      InvalidAmountError,
    );
  });
});
