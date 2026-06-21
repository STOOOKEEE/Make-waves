import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncInstance } from "node:sqlite";
import {
  aggregateAttribution,
  assertValidSourceTag,
  filterByLedgerRange,
  InvalidMetricError,
} from "@tide/xrpl";
import type { AttributionMetrics, ObservedTx } from "@tide/xrpl";

// `node:sqlite` est un builtin récent que le bundler de vitest (vite) ne sait pas
// résoudre statiquement. On le charge au runtime via createRequire (hors analyse
// de vite), en gardant le typage grâce à l'import de type ci-dessus.
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire("node:sqlite") as typeof import("node:sqlite");

function rowToTx(row: unknown): ObservedTx {
  if (typeof row !== "object" || row === null) {
    throw new InvalidMetricError("ligne SQLite invalide");
  }
  const record = row as Record<string, unknown>;
  return {
    account: String(record["account"]),
    sourceTag: Number(record["source_tag"]),
    volume: Number(record["volume"]),
    ledgerIndex: Number(record["ledger_index"]),
  };
}

/**
 * Persistance SQLite (module natif `node:sqlite`, sans dépendance externe) des
 * transactions d'attribution observées on-chain. L'indexeur (à venir) y écrit
 * chaque tx taggée ; les métriques du hackathon se calculent en relisant le
 * store via `@tide/xrpl` (logique d'agrégation déjà testée et auditée).
 *
 * Par défaut en mémoire (`:memory:`) ; passer un chemin pour persister sur disque.
 */
export class SqliteAttributionStore {
  private readonly db: DatabaseSyncInstance;

  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS observed_tx (
        account TEXT NOT NULL,
        source_tag INTEGER NOT NULL,
        volume REAL NOT NULL,
        ledger_index INTEGER NOT NULL
      )
    `);
  }

  /** Enregistre une transaction observée (valide les entrées critiques). */
  record(tx: ObservedTx): void {
    assertValidSourceTag(tx.sourceTag);
    if (!Number.isFinite(tx.volume) || tx.volume < 0) {
      throw new InvalidMetricError(`Volume invalide: ${String(tx.volume)}`);
    }
    if (!Number.isInteger(tx.ledgerIndex) || tx.ledgerIndex < 0) {
      throw new InvalidMetricError(
        `ledgerIndex invalide: ${String(tx.ledgerIndex)}`,
      );
    }
    this.db
      .prepare(
        "INSERT INTO observed_tx (account, source_tag, volume, ledger_index) VALUES (?, ?, ?, ?)",
      )
      .run(tx.account, tx.sourceTag, tx.volume, tx.ledgerIndex);
  }

  /** Toutes les transactions observées. */
  all(): ObservedTx[] {
    return this.db
      .prepare(
        "SELECT account, source_tag, volume, ledger_index FROM observed_tx",
      )
      .all()
      .map(rowToTx);
  }

  /** Métriques d'attribution cumulées pour le SourceTag de Tide. */
  metrics(tideSourceTag: number): AttributionMetrics {
    return aggregateAttribution(this.all(), tideSourceTag);
  }

  /** Métriques sur une fenêtre de ledgers (leaderboard hebdo). */
  windowedMetrics(
    tideSourceTag: number,
    fromLedger: number,
    toLedger: number,
  ): AttributionMetrics {
    return aggregateAttribution(
      filterByLedgerRange(this.all(), fromLedger, toLedger),
      tideSourceTag,
    );
  }

  /** Ferme la connexion (libère le fichier / la mémoire). */
  close(): void {
    this.db.close();
  }
}
