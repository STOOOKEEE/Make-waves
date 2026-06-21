import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteAttributionStore } from "../src/store/attribution-store";
import { InvalidMetricError, InvalidSourceTagError } from "@tide/xrpl";
import type { ObservedTx } from "@tide/xrpl";

const TIDE_TAG = 777;
const OTHER_TAG = 999;

function tx(
  account: string,
  sourceTag: number,
  volume: number,
  ledgerIndex = 100,
): ObservedTx {
  return { account, sourceTag, volume, ledgerIndex };
}

describe("SqliteAttributionStore", () => {
  let store: SqliteAttributionStore;
  beforeEach(() => {
    store = new SqliteAttributionStore();
  });
  afterEach(() => {
    store.close();
  });

  it("persiste et relit les transactions", () => {
    store.record(tx("a", TIDE_TAG, 100));
    store.record(tx("b", TIDE_TAG, 50, 200));
    const all = store.all();
    expect(all).toHaveLength(2);
    expect(all).toContainEqual(tx("a", TIDE_TAG, 100));
    expect(all).toContainEqual(tx("b", TIDE_TAG, 50, 200));
  });

  it("calcule les métriques d'attribution (filtre par tag, comptes distincts)", () => {
    store.record(tx("a", TIDE_TAG, 100));
    store.record(tx("a", TIDE_TAG, 20));
    store.record(tx("b", TIDE_TAG, 30));
    store.record(tx("c", OTHER_TAG, 9999));
    const metrics = store.metrics(TIDE_TAG);
    expect(metrics).toEqual({
      totalVolume: 150,
      activeAccounts: 2,
      txCount: 3,
    });
  });

  it("calcule des métriques fenêtrées par ledger", () => {
    store.record(tx("a", TIDE_TAG, 10, 100));
    store.record(tx("b", TIDE_TAG, 20, 150));
    store.record(tx("c", TIDE_TAG, 30, 250));
    const metrics = store.windowedMetrics(TIDE_TAG, 120, 200);
    expect(metrics.txCount).toBe(1);
    expect(metrics.totalVolume).toBe(20);
  });

  it("autorise un volume nul (tx taggée sans valeur)", () => {
    store.record(tx("a", TIDE_TAG, 0));
    expect(store.metrics(TIDE_TAG).activeAccounts).toBe(1);
  });

  it("rejette un volume aberrant à l'écriture", () => {
    expect(() => store.record(tx("a", TIDE_TAG, -1))).toThrow(InvalidMetricError);
    expect(() => store.record(tx("a", TIDE_TAG, Number.NaN))).toThrow(
      InvalidMetricError,
    );
  });

  it("rejette un SourceTag invalide à l'écriture", () => {
    expect(() => store.record(tx("a", -1, 100))).toThrow(InvalidSourceTagError);
  });

  it("rejette un ledgerIndex invalide à l'écriture", () => {
    expect(() => store.record(tx("a", TIDE_TAG, 100, -5))).toThrow(
      InvalidMetricError,
    );
  });

  it("part vide", () => {
    expect(store.all()).toEqual([]);
    expect(store.metrics(TIDE_TAG)).toEqual({
      totalVolume: 0,
      activeAccounts: 0,
      txCount: 0,
    });
  });
});
