import { describe, expect, it } from "vitest";
import { convertStringToHex } from "xrpl";
import { buildBuyInPayment } from "@tide/xrpl";
import { assertVerifiedCompetitionEntry } from "./competition-payment-service";
import { CompetitionPaymentInvalidError } from "./errors";

const ACCOUNT = "rPh1pu5PSEPBv45NWPYTN7gUEMmaGNePGY";
const POOL = "r3ZrdNvM99kxJjtYXL7twctbexdeCyD9hp";
const expected = buildBuyInPayment({
  account: ACCOUNT,
  destination: POOL,
  amount: "10000",
  sourceTag: 7777,
  competitionId: "cup",
});

function result(overrides: Record<string, unknown> = {}) {
  return {
    ...expected,
    validated: true,
    meta: { TransactionResult: "tesSUCCESS" },
    ...overrides,
  };
}

describe("vérification d'un ticket de compétition", () => {
  it("accepte uniquement le Payment exact validé", () => {
    expect(() => assertVerifiedCompetitionEntry(result(), expected, "cup")).not.toThrow();
  });

  it.each([
    { validated: false },
    { meta: { TransactionResult: "tecPATH_DRY" } },
    { Destination: ACCOUNT },
    { Amount: "9999" },
    { SourceTag: 42 },
    {
      Memos: [{ Memo: { MemoType: convertStringToHex("tide/join"), MemoData: convertStringToHex("other") } }],
    },
  ])("rejette une preuve altérée %#", (override) => {
    expect(() => assertVerifiedCompetitionEntry(result(override), expected, "cup")).toThrow(
      CompetitionPaymentInvalidError,
    );
  });
});
