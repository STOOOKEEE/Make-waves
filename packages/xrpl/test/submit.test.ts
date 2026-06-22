import { describe, it, expect } from "vitest";
import { classifyEngineResult, parseSubmitResult } from "../src/client/submit";
import { XrplRequestError } from "../src/client/errors";

describe("classifyEngineResult", () => {
  it("classe chaque famille de résultat", () => {
    expect(classifyEngineResult("tesSUCCESS")).toBe("success");
    expect(classifyEngineResult("tecUNFUNDED_PAYMENT")).toBe("failed");
    expect(classifyEngineResult("tefPAST_SEQ")).toBe("failed");
    expect(classifyEngineResult("terQUEUED")).toBe("retry");
    expect(classifyEngineResult("temMALFORMED")).toBe("malformed");
    expect(classifyEngineResult("telBAD_FEE")).toBe("local");
    expect(classifyEngineResult("zzzWAT")).toBe("unknown");
  });
});

describe("parseSubmitResult", () => {
  it("parse un succès provisoire", () => {
    const outcome = parseSubmitResult({
      engine_result: "tesSUCCESS",
      engine_result_code: 0,
      engine_result_message: "The transaction was applied.",
      accepted: true,
      applied: true,
      queued: false,
      validated_ledger_index: 1234,
    });
    expect(outcome).toEqual({
      engineResult: "tesSUCCESS",
      engineResultCode: 0,
      category: "success",
      includedInLedger: true,
      accepted: true,
      applied: true,
      queued: false,
      validatedLedgerIndex: 1234,
      message: "The transaction was applied.",
      provisional: true,
    });
  });

  it("garde === true : accepted/applied non-booléens tombent à false", () => {
    const outcome = parseSubmitResult({
      engine_result: "tesSUCCESS",
      accepted: "true",
      applied: 1,
    });
    expect(outcome.accepted).toBe(false);
    expect(outcome.applied).toBe(false);
  });

  it("distingue tec (inclus au ledger) de tef (jamais inclus)", () => {
    expect(parseSubmitResult({ engine_result: "tecUNFUNDED_PAYMENT" }).includedInLedger).toBe(true);
    expect(parseSubmitResult({ engine_result: "tefPAST_SEQ" }).includedInLedger).toBe(false);
    expect(parseSubmitResult({ engine_result: "tesSUCCESS" }).includedInLedger).toBe(true);
  });

  it("parse un échec sans l'avaler (tec)", () => {
    const outcome = parseSubmitResult({ engine_result: "tecUNFUNDED_PAYMENT" });
    expect(outcome.category).toBe("failed");
    expect(outcome.accepted).toBe(false);
    expect(outcome.message).toBe("");
  });

  it("lève si engine_result manque ou si la réponse n'est pas un objet", () => {
    expect(() => parseSubmitResult({ accepted: true })).toThrow(XrplRequestError);
    expect(() => parseSubmitResult(null)).toThrow(XrplRequestError);
  });
});
