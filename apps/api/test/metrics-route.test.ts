import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildServer } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { SqliteAttributionStore } from "../src/store/attribution-store";
import { AttributionIndexer } from "../src/indexer/indexer";
import type {
  AccountTxReader,
  AttributionRecorder,
} from "../src/indexer/indexer";
import type { AccountTxPage } from "@tide/xrpl";

const TIDE_TAG = 7777;
const OTHER_TAG = 9999;

/** Forge une entrée `account_tx` brute (forme réseau non fiable → parsing défensif). */
function entry(
  account: string,
  sourceTag: number,
  ledger: number,
  amount?: unknown,
): unknown {
  return {
    ledger_index: ledger,
    validated: true,
    meta: { TransactionResult: "tesSUCCESS" },
    hash: `H_${account}_${String(ledger)}`,
    tx_json: {
      TransactionType: "Payment",
      Account: account,
      SourceTag: sourceTag,
      ...(amount !== undefined ? { Amount: amount } : {}),
    },
  };
}

/** Lecteur piloté par une file de pages (pagination déterministe). */
class StubReader implements AccountTxReader {
  private readonly pages: AccountTxPage[];
  constructor(pages: AccountTxPage[]) {
    this.pages = [...pages];
  }
  async accountTx(): Promise<AccountTxPage> {
    return this.pages.shift() ?? { transactions: [], ledgerIndexMax: 0 };
  }
}

/** Indexeur câblé au VRAI store SQLite (pas un fake). */
function realIndexer(
  store: SqliteAttributionStore,
  pages: AccountTxPage[],
): AttributionIndexer {
  const reader = new StubReader(pages);
  return new AttributionIndexer(
    {
      client: reader,
      recorder: store as unknown as AttributionRecorder,
      getPrices: () => ({ XRP: 0.5 }),
    },
    {
      accounts: ["rPool", "rPlayer"],
      sourceTag: TIDE_TAG,
      referenceCurrency: "USD",
    },
  );
}

const silentLogger: { warn: () => void } = { warn: () => undefined };

/**
 * CHAÎNE COMPLÈTE : `AttributionIndexer` (vrai) pousse dans `SqliteAttributionStore`
 * (vrai), `GET /metrics` lit le store → `aggregateAttribution` (vrai). Réponse
 * JSON = somme des volumes + comptes distincts + tx count. Comble le trou où
 * chaque maillon est testé séparément mais jamais composé bout en bout.
 */
describe("GET /metrics — chaîne indexeur → store → route", () => {
  let store: SqliteAttributionStore;
  let app: ReturnType<typeof buildServer>;

  beforeEach(async () => {
    store = new SqliteAttributionStore();
    const indexer = realIndexer(store, [
      // rPool : 1 Payment XRP de 2 000 000 drops (= 2 XRP × 0.5 = 1 USD)
      {
        transactions: [entry("rPool", TIDE_TAG, 50, "2000000")],
        ledgerIndexMax: 60,
      },
      // rPlayer : 1 Payment XRP de 1 000 000 drops (= 1 XRP × 0.5 = 0.5 USD)
      {
        transactions: [entry("rPlayer", TIDE_TAG, 51, "1000000")],
        ledgerIndexMax: 60,
      },
    ]);
    const result = await indexer.sync();
    expect(result.recorded).toBe(2); // sanity : l'indexeur a bien poussé 2 lignes

    app = buildServer({
      paper: new PaperService(1000),
      competition: new CompetitionService(),
      getPrices: () => ({ XRP: 0.5 }),
      metrics: { store, sourceTag: TIDE_TAG },
    });
  });

  afterEach(() => {
    store.close();
    void app.close();
  });

  it("agrège et expose volume + comptes distincts + tx count", async () => {
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      totalVolume: 1.5,
      activeAccounts: 2,
      txCount: 2,
    });
  });

  it("ignore les tx d'un autre SourceTag (ne gonfle pas la métrique)", async () => {
    const otherStore = new SqliteAttributionStore();
    const indexer = realIndexer(otherStore, [
      {
        transactions: [
          entry("rA", TIDE_TAG, 50, "1000000"), // 0.5 USD, on garde
          entry("rB", OTHER_TAG, 51, "9999000000"), // énorme, mais pas notre tag
        ],
        ledgerIndexMax: 60,
      },
    ]);
    await indexer.sync();

    const otherApp = buildServer({
      paper: new PaperService(1000),
      competition: new CompetitionService(),
      getPrices: () => ({ XRP: 0.5 }),
      metrics: { store: otherStore, sourceTag: TIDE_TAG },
    });

    const res = await otherApp.inject({ method: "GET", url: "/metrics" });
    expect(res.json()).toEqual({
      totalVolume: 0.5,
      activeAccounts: 1, // seul rA
      txCount: 1,
    });

    otherStore.close();
    void otherApp.close();
  });

  it("compte une tx à volume nul comme tx et compte actif (sans gonfler le volume)", async () => {
    // IOU d'une devise sans prix → volume normalisé à 0 (DEVLOG 22/06, dette
    // tracée : volume conservateur). Le compte compte quand même (la tx a eu
    // lieu et porte notre tag).
    const zeroStore = new SqliteAttributionStore();
    const noPrice: Record<string, number> = { XRP: 0.5 }; // pas de FOO
    const indexer = new AttributionIndexer(
      {
        client: new StubReader([
          {
            transactions: [
              {
                ledger_index: 50,
                validated: true,
                meta: { TransactionResult: "tesSUCCESS" },
                hash: "H_foo",
                tx_json: {
                  TransactionType: "Payment",
                  Account: "rA",
                  SourceTag: TIDE_TAG,
                  Amount: {
                    currency: "FOO",
                    issuer: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
                    value: "5",
                  },
                },
              },
            ],
            ledgerIndexMax: 60,
          },
        ]),
        recorder: zeroStore as unknown as AttributionRecorder,
        getPrices: () => noPrice,
        logger: silentLogger,
      },
      {
        accounts: ["rA"],
        sourceTag: TIDE_TAG,
        referenceCurrency: "USD",
      },
    );
    await indexer.sync();

    const zeroApp = buildServer({
      paper: new PaperService(1000),
      competition: new CompetitionService(),
      getPrices: () => noPrice,
      metrics: { store: zeroStore, sourceTag: TIDE_TAG },
    });

    const res = await zeroApp.inject({ method: "GET", url: "/metrics" });
    expect(res.json()).toEqual({
      totalVolume: 0,
      activeAccounts: 1,
      txCount: 1,
    });

    zeroStore.close();
    void zeroApp.close();
  });

  it("dé-duplique par hash (réindexer ne double-compte pas)", async () => {
    // L'indexeur a déjà poussé 2 lignes dans `beforeEach`. On relance un sync
    // qui rejoue exactement les mêmes hashes (simule un rescan après reboot) :
    // `INSERT OR IGNORE` doit neutraliser le double-comptage.
    const samePages: AccountTxPage[] = [
      {
        transactions: [
          entry("rPool", TIDE_TAG, 50, "2000000"), // même hash que dans beforeEach
          entry("rPlayer", TIDE_TAG, 51, "1000000"),
        ],
        ledgerIndexMax: 100,
      },
    ];
    const reader = new StubReader(samePages);
    const indexer = new AttributionIndexer(
      {
        client: reader,
        recorder: store as unknown as AttributionRecorder,
        getPrices: () => ({ XRP: 0.5 }),
      },
      {
        accounts: ["rPool", "rPlayer"],
        sourceTag: TIDE_TAG,
        referenceCurrency: "USD",
        startLedger: 61, // au-dessus du curseur avant : forcerait un rescan,
        // mais c'est le store qui dédoublonne via hash, pas le curseur.
      },
    );
    await indexer.sync();

    const res = await app.inject({ method: "GET", url: "/metrics" });
    // Toujours 2 tx, jamais 4 — l'idempotence tient.
    expect(res.json()).toEqual({
      totalVolume: 1.5,
      activeAccounts: 2,
      txCount: 2,
    });
  });
});