import { describe, it, expect } from "vitest";
import {
  aggregateAttribution,
  filterByLedgerRange,
} from "../src/metrics/aggregate";
import { InvalidMetricError, InvalidSourceTagError } from "../src/errors";
import type { ObservedTx } from "../src/metrics/types";

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

describe("aggregateAttribution", () => {
  it("ne retient que les tx du SourceTag de Tide", () => {
    const txs = [
      tx("a", TIDE_TAG, 100),
      tx("b", OTHER_TAG, 9999),
      tx("c", TIDE_TAG, 50),
    ];
    const m = aggregateAttribution(txs, TIDE_TAG);
    expect(m.totalVolume).toBe(150);
    expect(m.txCount).toBe(2);
    expect(m.activeAccounts).toBe(2);
  });

  it("compte les comptes actifs DISTINCTS", () => {
    const txs = [
      tx("a", TIDE_TAG, 10),
      tx("a", TIDE_TAG, 20),
      tx("b", TIDE_TAG, 30),
    ];
    const m = aggregateAttribution(txs, TIDE_TAG);
    expect(m.activeAccounts).toBe(2);
    expect(m.txCount).toBe(3);
    expect(m.totalVolume).toBe(60);
  });

  it("retourne des métriques nulles sans tx attribuée", () => {
    const m = aggregateAttribution([tx("a", OTHER_TAG, 100)], TIDE_TAG);
    expect(m).toEqual({ totalVolume: 0, activeAccounts: 0, txCount: 0 });
  });

  it("retourne des métriques nulles sur une liste vide", () => {
    expect(aggregateAttribution([], TIDE_TAG)).toEqual({
      totalVolume: 0,
      activeAccounts: 0,
      txCount: 0,
    });
  });

  it("autorise un volume nul (tx taggée sans valeur)", () => {
    const m = aggregateAttribution([tx("a", TIDE_TAG, 0)], TIDE_TAG);
    expect(m.activeAccounts).toBe(1);
    expect(m.totalVolume).toBe(0);
  });

  it("lève sur un volume aberrant d'une tx attribuée", () => {
    expect(() =>
      aggregateAttribution([tx("a", TIDE_TAG, -1)], TIDE_TAG),
    ).toThrow(InvalidMetricError);
    expect(() =>
      aggregateAttribution([tx("a", TIDE_TAG, Number.NaN)], TIDE_TAG),
    ).toThrow(InvalidMetricError);
  });

  it("rejette un SourceTag invalide", () => {
    expect(() => aggregateAttribution([], -1)).toThrow(InvalidSourceTagError);
  });

  it("rejette un SourceTag à 0 (attribution perdue)", () => {
    expect(() => aggregateAttribution([], 0)).toThrow(InvalidSourceTagError);
  });
});

describe("filterByLedgerRange", () => {
  const txs = [
    tx("a", TIDE_TAG, 10, 100),
    tx("b", TIDE_TAG, 20, 150),
    tx("c", TIDE_TAG, 30, 200),
  ];

  it("garde les tx dans la fenêtre (bornes incluses)", () => {
    const windowed = filterByLedgerRange(txs, 100, 150);
    expect(windowed.map((t) => t.account)).toEqual(["a", "b"]);
  });

  it("se compose avec aggregateAttribution pour une période", () => {
    const m = aggregateAttribution(filterByLedgerRange(txs, 150, 300), TIDE_TAG);
    expect(m.totalVolume).toBe(50);
    expect(m.txCount).toBe(2);
  });

  it("retourne une liste vide si la fenêtre ne capture rien", () => {
    expect(filterByLedgerRange(txs, 300, 400)).toEqual([]);
  });

  it("rejette une plage incohérente", () => {
    expect(() => filterByLedgerRange(txs, 200, 100)).toThrow(InvalidMetricError);
    expect(() => filterByLedgerRange(txs, -1, 100)).toThrow(InvalidMetricError);
  });
});
