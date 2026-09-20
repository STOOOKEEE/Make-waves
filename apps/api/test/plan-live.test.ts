import { describe, it, expect } from "vitest";
import { InvalidAmountError } from "@tide/xrpl";
import { LiveExecError, planLiveOffer } from "../src/exec/plan-live";
import type { LivePlanDeps, OnchainExecReader } from "../src/exec/plan-live";

const ISSUER = "rBHYF7U1FLhG9ZWcyhRL9Rytrvx5ARBAUK";
const ACCOUNT = "rPh1pu5PSEPBv45NWPYTN7gUEMmaGNePGY";
const RLUSD = "524C555344000000000000000000000000000000";
const SOURCE_TAG = 7777;

function deps(prices: Record<string, number>, onchain?: OnchainExecReader): LivePlanDeps {
  return {
    getPrices: () => prices,
    sourceTag: SOURCE_TAG,
    quote: { currency: RLUSD, issuer: ISSUER, symbol: "RLUSD" },
    ...(onchain !== undefined ? { onchain } : {}),
  };
}

const BUY = { account: ACCOUNT, base: "XRP", side: "buy", amountBase: 100, slippageTolerance: 0.01 } as const;

describe("planLiveOffer — prix CEX (repli)", () => {
  it("achat : borne ce qu'on FOURNIT (quote) par le slippage, exige la base exacte", async () => {
    const plan = await planLiveOffer(deps({ XRP: 0.5 }), BUY);
    // Achat de 100 XRP à 0.5 (+1 %) → fournit au plus 50.5 RLUSD, reçoit 100 XRP.
    expect(plan.offer.TakerGets).toEqual({ currency: RLUSD, issuer: ISSUER, value: "50.5" });
    expect(plan.offer.TakerPays).toBe("100000000");
    expect(plan.offer.SourceTag).toBe(SOURCE_TAG);
    expect(plan.referencePrice).toBe(0.5);
    expect(plan.limitPrice).toBeCloseTo(0.505);
  });

  it("vente : fournit la base exacte, exige au moins le quote borné par le slippage", async () => {
    const plan = await planLiveOffer(deps({ XRP: 0.5 }), { ...BUY, side: "sell" });
    // Vente de 100 XRP à 0.5 (−1 %) → fournit 100 XRP, exige au moins 49.5 RLUSD.
    expect(plan.offer.TakerGets).toBe("100000000");
    expect(plan.offer.TakerPays).toEqual({ currency: RLUSD, issuer: ISSUER, value: "49.5" });
  });

  it("refuse un actif non tradable en Live (base ≠ XRP)", async () => {
    await expect(
      planLiveOffer(deps({ XRP: 0.5, DOGE: 0.1 }), { ...BUY, base: "DOGE" }),
    ).rejects.toThrow(LiveExecError);
  });

  it("refuse une base identique au quote", async () => {
    await expect(planLiveOffer(deps({ XRP: 0.5 }), { ...BUY, base: "RLUSD" })).rejects.toThrow(
      LiveExecError,
    );
  });

  it("refuse un prix de référence indisponible", async () => {
    await expect(planLiveOffer(deps({}), BUY)).rejects.toThrow(LiveExecError);
  });

  it("laisse le moteur rejeter un slippage hors borne (InvalidAmountError)", async () => {
    await expect(
      planLiveOffer(deps({ XRP: 0.5 }), { ...BUY, slippageTolerance: 1.5 }),
    ).rejects.toThrow(InvalidAmountError);
  });
});

describe("planLiveOffer — prix on-chain (DEX)", () => {
  /** Lecteur on-chain factice : AMM fixe + carnet ask/bid distincts. */
  const reader = (amm: number, ask: number, bid: number): OnchainExecReader => ({
    ammSpotPrice: async () => amm,
    bookQuote: async () => ({ ask, bid }),
  });

  it("achat : réference = ask du carnet (côté sens), ignore le prix CEX", async () => {
    // CEX à 999 (ne doit pas être lu) ; carnet ask=0.52, bid=0.48 ; AMM=0.60.
    const plan = await planLiveOffer(deps({ XRP: 999 }, reader(0.6, 0.52, 0.48)), BUY);
    // Best execution à l'achat = le moins cher entre AMM (0.60) et ask (0.52) → 0.52.
    expect(plan.referencePrice).toBe(0.52);
    expect(plan.venue).toBe("book");
  });

  it("vente : réference = bid du carnet (côté sens)", async () => {
    const plan = await planLiveOffer(
      deps({ XRP: 999 }, reader(0.4, 0.52, 0.48)),
      { ...BUY, side: "sell" },
    );
    // Best execution à la vente = le plus cher entre AMM (0.40) et bid (0.48) → 0.48.
    expect(plan.referencePrice).toBe(0.48);
    expect(plan.venue).toBe("book");
  });

  it("propage un prix on-chain incohérent (carnet renvoie 0)", async () => {
    await expect(
      planLiveOffer(deps({ XRP: 0.5 }, reader(0.5, 0, 0)), BUY),
    ).rejects.toThrow(LiveExecError);
  });
});
