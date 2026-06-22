import { describe, it, expect } from "vitest";
import { extractTaggedTxs } from "../src/metrics/observe";
import { InvalidSourceTagError } from "../src/errors";

const TAG = 7777;
const ISSUER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

interface PaymentOpts {
  result?: string;
  validated?: boolean;
  hash?: string | null;
}

function payment(
  account: string,
  sourceTag: number,
  amount: unknown,
  ledger: number,
  opts: PaymentOpts = {},
): unknown {
  const hash = opts.hash === undefined ? `HASH_${account}_${String(ledger)}` : opts.hash;
  return {
    ledger_index: ledger,
    validated: opts.validated ?? true,
    meta: { TransactionResult: opts.result ?? "tesSUCCESS" },
    ...(hash !== null ? { hash } : {}),
    tx_json: {
      TransactionType: "Payment",
      Account: account,
      SourceTag: sourceTag,
      Amount: amount,
    },
  };
}

describe("extractTaggedTxs", () => {
  it("extrait un Payment taggé, validé et réussi (tx_json, v2)", () => {
    const result = extractTaggedTxs([payment("rA", TAG, "1000000", 100)], TAG);
    expect(result.txs).toHaveLength(1);
    expect(result.txs[0]).toMatchObject({
      account: "rA",
      sourceTag: TAG,
      ledgerIndex: 100,
      transactionType: "Payment",
      amount: "1000000",
      hash: "HASH_rA_100",
    });
    expect(result.skippedTagged).toBe(0);
  });

  it("extrait un OfferCreate taggé avec takerGets/takerPays", () => {
    const offer = {
      ledger_index: 101,
      validated: true,
      meta: { TransactionResult: "tesSUCCESS" },
      hash: "HASH_OFFER",
      tx_json: {
        TransactionType: "OfferCreate",
        Account: "rB",
        SourceTag: TAG,
        TakerGets: "2000000",
        TakerPays: { currency: "USD", issuer: ISSUER, value: "1" },
      },
    };
    const result = extractTaggedTxs([offer], TAG);
    expect(result.txs[0]?.takerGets).toBe("2000000");
    expect(result.txs[0]?.takerPays).toEqual({ currency: "USD", issuer: ISSUER, value: "1" });
  });

  it("ignore les tx d'un autre SourceTag (sans les compter comme trou)", () => {
    const result = extractTaggedTxs(
      [payment("rA", TAG, "1000000", 100), payment("rC", 9999, "1000000", 100)],
      TAG,
    );
    expect(result.txs).toHaveLength(1);
    expect(result.skippedTagged).toBe(0);
  });

  it("IGNORE une tx taggée ÉCHOUÉE (tec*) — pas de sur-comptage, pas un trou", () => {
    const result = extractTaggedTxs(
      [payment("rA", TAG, "1000000", 100, { result: "tecPATH_DRY" })],
      TAG,
    );
    expect(result.txs).toHaveLength(0);
    expect(result.skippedTagged).toBe(0);
  });

  it("IGNORE une tx taggée non encore validée", () => {
    const result = extractTaggedTxs(
      [payment("rA", TAG, "1000000", 100, { validated: false })],
      TAG,
    );
    expect(result.txs).toHaveLength(0);
    expect(result.skippedTagged).toBe(0);
  });

  it("supporte la forme v1 (champ tx)", () => {
    const v1 = {
      ledger_index: 102,
      validated: true,
      meta: { TransactionResult: "tesSUCCESS" },
      tx: {
        TransactionType: "Payment",
        Account: "rD",
        SourceTag: TAG,
        Amount: "500000",
        hash: "HASH_V1",
      },
    };
    expect(extractTaggedTxs([v1], TAG).txs[0]?.account).toBe("rD");
    expect(extractTaggedTxs([v1], TAG).txs[0]?.hash).toBe("HASH_V1");
  });

  it("ignore une entrée sans tx interne exploitable", () => {
    const result = extractTaggedTxs([{ ledger_index: 1 }, null, 42], TAG);
    expect(result.txs).toHaveLength(0);
    expect(result.skippedTagged).toBe(0);
  });

  it("compte comme trou une tx taggée réussie sans hash", () => {
    const result = extractTaggedTxs([payment("rA", TAG, "1", 103, { hash: null })], TAG);
    expect(result.txs).toHaveLength(0);
    expect(result.skippedTagged).toBe(1);
  });

  it("compte comme trou une tx taggée au statut illisible (meta absente)", () => {
    const noMeta = {
      ledger_index: 104,
      validated: true,
      hash: "H",
      tx_json: { TransactionType: "Payment", Account: "rA", SourceTag: TAG, Amount: "1" },
    };
    const result = extractTaggedTxs([noMeta], TAG);
    expect(result.txs).toHaveLength(0);
    expect(result.skippedTagged).toBe(1);
  });

  it("rejette le SourceTag 0 (métrique reine)", () => {
    expect(() => extractTaggedTxs([], 0)).toThrow(InvalidSourceTagError);
  });
});
