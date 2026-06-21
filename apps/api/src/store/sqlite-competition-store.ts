import { InvalidCompetitionError, type Competition } from "@tide/core";
import { openDatabase } from "./sqlite";
import type { DatabaseSync } from "./sqlite";
import type { CompetitionStore } from "./competition-store";

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function parseWeights(value: unknown): number[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value));
  } catch {
    throw new InvalidCompetitionError("payout_weights corrompu (JSON invalide)");
  }
  if (!Array.isArray(parsed)) {
    throw new InvalidCompetitionError("payout_weights corrompu (tableau attendu)");
  }
  return parsed.map((weight) => {
    if (typeof weight !== "number") {
      throw new InvalidCompetitionError("payout_weights corrompu (number attendu)");
    }
    return weight;
  });
}

/**
 * Persistance SQLite des compétitions (`node:sqlite`). Deux tables :
 * `competitions` (poids de répartition sérialisés en JSON) et `entries`
 * (un participant par ligne). Les opérations sont des requêtes uniques (atomiques).
 */
export class SqliteCompetitionStore implements CompetitionStore {
  private readonly db: DatabaseSync;

  /** `database` : un chemin (ou `:memory:`) à ouvrir, ou une connexion partagée. */
  constructor(database: string | DatabaseSync = ":memory:") {
    this.db = typeof database === "string" ? openDatabase(database) : database;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS competitions (
        id TEXT PRIMARY KEY,
        buy_in REAL NOT NULL,
        rake_ratio REAL NOT NULL,
        payout_weights TEXT NOT NULL,
        closed INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS entries (
        competition_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (competition_id, user_id)
      );
    `);
  }

  has(id: string): boolean {
    return (
      this.db.prepare("SELECT 1 FROM competitions WHERE id = ?").get(id) !==
      undefined
    );
  }

  create(competition: Competition): void {
    this.db
      .prepare(
        "INSERT INTO competitions (id, buy_in, rake_ratio, payout_weights, closed) VALUES (?, ?, ?, ?, 0)",
      )
      .run(
        competition.id,
        competition.buyIn,
        competition.rakeRatio,
        JSON.stringify(competition.payoutWeights),
      );
  }

  getCompetition(id: string): Competition | undefined {
    const row = this.db
      .prepare(
        "SELECT id, buy_in, rake_ratio, payout_weights FROM competitions WHERE id = ?",
      )
      .get(id);
    if (row === undefined) {
      return undefined;
    }
    const record = asRecord(row);
    return {
      id: String(record["id"]),
      buyIn: Number(record["buy_in"]),
      rakeRatio: Number(record["rake_ratio"]),
      payoutWeights: parseWeights(record["payout_weights"]),
    };
  }

  isClosed(id: string): boolean | undefined {
    const row = this.db
      .prepare("SELECT closed FROM competitions WHERE id = ?")
      .get(id);
    if (row === undefined) {
      return undefined;
    }
    return Number(asRecord(row)["closed"]) !== 0;
  }

  participants(id: string): string[] | undefined {
    if (!this.has(id)) {
      return undefined;
    }
    return this.db
      .prepare(
        "SELECT user_id FROM entries WHERE competition_id = ? ORDER BY rowid",
      )
      .all(id)
      .map((row) => String(asRecord(row)["user_id"]));
  }

  hasParticipant(id: string, userId: string): boolean {
    return (
      this.db
        .prepare(
          "SELECT 1 FROM entries WHERE competition_id = ? AND user_id = ?",
        )
        .get(id, userId) !== undefined
    );
  }

  addParticipant(id: string, userId: string): void {
    this.db
      .prepare("INSERT INTO entries (competition_id, user_id) VALUES (?, ?)")
      .run(id, userId);
  }

  markClosed(id: string): void {
    this.db
      .prepare("UPDATE competitions SET closed = 1 WHERE id = ?")
      .run(id);
  }

  /** Ferme la connexion. */
  close(): void {
    this.db.close();
  }
}
