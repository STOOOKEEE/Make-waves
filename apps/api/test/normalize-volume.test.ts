import { describe, it, expect } from "vitest";
import type { TaggedTx } from "@tide/xrpl";
import { normalizeVolume } from "../src/indexer/normalize-volume";
import { PriceFeedError } from "../src/feed/errors";

const ISSUER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

function tagged(partial: Partial<TaggedTx>): TaggedTx {
  return {
    account: "rA",
    sourceTag: 7777,
    ledgerIndex: 1,
    transactionType: "Payment",
    hash: "H",
    ...partial,
  };
}

describe("normalizeVolume", () => {
  it("Payment XRP : drops → XRP × prix de référence", () => {
    const v = normalizeVolume(tagged({ amount: "2000000" }), { XRP: 0.5 }, "USD");
    expect(v).toBe(1); // 2 XRP × 0.5
  });

  it("Payment dans la devise de référence (IOU) : prix = 1", () => {
    const v = normalizeVolume(
      tagged({ amount: { currency: "RLUSD", issuer: ISSUER, value: "10" } }),
      {},
      "RLUSD",
    );
    expect(v).toBe(10);
  });

  it("OfferCreate : valorise le côté fourni (TakerGets)", () => {
    const v = normalizeVolume(
      tagged({ transactionType: "OfferCreate", takerGets: "4000000" }),
      { XRP: 0.5 },
      "USD",
    );
    expect(v).toBe(2); // 4 XRP × 0.5
  });

  it("tx sans montant valorisable → 0 (compte actif quand même)", () => {
    expect(normalizeVolume(tagged({ transactionType: "AccountSet" }), {}, "USD")).toBe(0);
  });

  it("devise sans prix de référence → PriceFeedError (pas de volume inventé)", () => {
    expect(() =>
      normalizeVolume(
        tagged({ amount: { currency: "FOO", issuer: ISSUER, value: "5" } }),
        { XRP: 0.5 },
        "USD",
      ),
    ).toThrow(PriceFeedError);
  });
});
