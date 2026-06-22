import { describe, it, expect } from "vitest";
import type { AccountTxOptions, AccountTxPage, ObservedTx } from "@tide/xrpl";
import { AttributionIndexer } from "../src/indexer/indexer";
import type {
  AccountTxReader,
  AttributionRecorder,
} from "../src/indexer/indexer";
import type { FeedLogger } from "../src/feed/compose-price";

const TAG = 7777;

interface EntryOpts {
  result?: string;
  validated?: boolean;
}

function entry(
  account: string,
  sourceTag: number,
  ledger: number,
  amount?: unknown,
  opts: EntryOpts = {},
): unknown {
  return {
    ledger_index: ledger,
    validated: opts.validated ?? true,
    meta: { TransactionResult: opts.result ?? "tesSUCCESS" },
    hash: `H_${account}_${String(ledger)}`,
    tx_json: {
      TransactionType: "Payment",
      Account: account,
      SourceTag: sourceTag,
      ...(amount !== undefined ? { Amount: amount } : {}),
    },
  };
}

class FakeReader implements AccountTxReader {
  calls: Array<{ account: string; options: AccountTxOptions }> = [];
  private queue: AccountTxPage[];
  constructor(pages: AccountTxPage[]) {
    this.queue = [...pages];
  }
  async accountTx(account: string, options: AccountTxOptions = {}): Promise<AccountTxPage> {
    this.calls.push({ account, options });
    return this.queue.shift() ?? { transactions: [], ledgerIndexMax: 0 };
  }
}

class FakeRecorder implements AttributionRecorder {
  records: ObservedTx[] = [];
  record(tx: ObservedTx): void {
    this.records.push(tx);
  }
}

function collectLogger(): { warnings: string[]; logger: FeedLogger } {
  const warnings: string[] = [];
  return { warnings, logger: { warn: (m) => warnings.push(m) } };
}

const prices = (): Record<string, number> => ({ XRP: 0.5 });

function indexer(
  reader: AccountTxReader,
  recorder: AttributionRecorder,
  accounts: string[],
  extra: { startLedger?: number; logger?: FeedLogger } = {},
): AttributionIndexer {
  return new AttributionIndexer(
    { client: reader, recorder, getPrices: prices, logger: extra.logger },
    { accounts, sourceTag: TAG, referenceCurrency: "USD", startLedger: extra.startLedger },
  );
}

describe("AttributionIndexer", () => {
  it("enregistre les tx taggées (réussies) avec volume normalisé + hash + curseur", async () => {
    const reader = new FakeReader([
      {
        transactions: [entry("rA", TAG, 50, "2000000"), entry("rB", 9999, 51, "1000000")],
        ledgerIndexMax: 60,
      },
    ]);
    const recorder = new FakeRecorder();
    const idx = indexer(reader, recorder, ["rPool"]);

    const result = await idx.sync();

    expect(result.recorded).toBe(1);
    expect(recorder.records).toEqual([
      { account: "rA", sourceTag: TAG, volume: 1, ledgerIndex: 50, hash: "H_rA_50" },
    ]);
    expect(idx.ledgerCursor).toBe(60);
  });

  it("ne compte PAS une tx taggée échouée (anti sur-comptage)", async () => {
    const reader = new FakeReader([
      { transactions: [entry("rA", TAG, 50, "2000000", { result: "tecPATH_DRY" })], ledgerIndexMax: 60 },
    ]);
    const recorder = new FakeRecorder();
    const result = await indexer(reader, recorder, ["rPool"]).sync();
    expect(result.recorded).toBe(0);
    expect(recorder.records).toHaveLength(0);
  });

  it("pagine avec une borne haute FIGÉE sur toutes les pages", async () => {
    const reader = new FakeReader([
      { transactions: [entry("rA", TAG, 50, "1000000")], ledgerIndexMax: 60, marker: "m1" },
      { transactions: [entry("rB", TAG, 52, "1000000")], ledgerIndexMax: 60 },
    ]);
    const recorder = new FakeRecorder();
    const idx = indexer(reader, recorder, ["rPool"]);

    const result = await idx.sync();

    expect(result.recorded).toBe(2);
    expect(reader.calls).toHaveLength(2);
    expect(reader.calls[0]?.options.ledgerIndexMax).toBeUndefined(); // 1re page : fige
    expect(reader.calls[1]?.options.ledgerIndexMax).toBe(60); // pages suivantes : figé
    expect(reader.calls[1]?.options.marker).toBe("m1");
    expect(idx.ledgerCursor).toBe(60);
  });

  it("scanne plusieurs comptes en partageant la fenêtre figée", async () => {
    const reader = new FakeReader([
      { transactions: [entry("rA", TAG, 50, "2000000")], ledgerIndexMax: 70 },
      { transactions: [entry("rB", TAG, 51, "2000000")], ledgerIndexMax: 70 },
    ]);
    const recorder = new FakeRecorder();
    const idx = indexer(reader, recorder, ["rPool", "rPlayer"]);

    const result = await idx.sync();

    expect(result.recorded).toBe(2);
    expect(reader.calls.map((c) => c.account)).toEqual(["rPool", "rPlayer"]);
    expect(reader.calls[1]?.options.ledgerIndexMax).toBe(70); // fenêtre partagée
    expect(idx.ledgerCursor).toBe(70);
  });

  it("repart de cursor+1 au sync suivant (anti-double-comptage intra-process)", async () => {
    const reader = new FakeReader([
      { transactions: [entry("rA", TAG, 50, "1000000")], ledgerIndexMax: 100 },
      { transactions: [], ledgerIndexMax: 100 },
    ]);
    const idx = indexer(reader, new FakeRecorder(), ["rPool"], { startLedger: 10 });

    await idx.sync();
    await idx.sync();

    expect(reader.calls[0]?.options.ledgerIndexMin).toBe(10);
    expect(reader.calls[1]?.options.ledgerIndexMin).toBe(101);
  });

  it("signale (sans avaler) les tx taggées inexploitables", async () => {
    const malformed = {
      ledger_index: 50,
      validated: true,
      meta: { TransactionResult: "tesSUCCESS" },
      hash: "H",
      tx_json: { TransactionType: "Payment", SourceTag: TAG, Amount: "1" }, // Account manquant
    };
    const reader = new FakeReader([{ transactions: [malformed], ledgerIndexMax: 60 }]);
    const { warnings, logger } = collectLogger();
    const result = await indexer(reader, new FakeRecorder(), ["rPool"], { logger }).sync();

    expect(result.skippedTagged).toBe(1);
    expect(warnings.some((w) => w.includes("inexploitables"))).toBe(true);
  });

  it("volume non normalisable → 0 journalisé (jamais inventé)", async () => {
    const fooTx = {
      ledger_index: 50,
      validated: true,
      meta: { TransactionResult: "tesSUCCESS" },
      hash: "H_foo",
      tx_json: {
        TransactionType: "Payment",
        Account: "rA",
        SourceTag: TAG,
        Amount: { currency: "FOO", issuer: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh", value: "5" },
      },
    };
    const reader = new FakeReader([{ transactions: [fooTx], ledgerIndexMax: 60 }]);
    const recorder = new FakeRecorder();
    const { warnings, logger } = collectLogger();
    await indexer(reader, recorder, ["rPool"], { logger }).sync();

    expect(recorder.records[0]?.volume).toBe(0);
    expect(warnings.some((w) => w.includes("non normalisable"))).toBe(true);
  });
});
