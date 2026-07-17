import { InvalidCompetitionError } from "@tide/core";
import { openDatabase } from "./sqlite";
import type { DatabaseSync } from "./sqlite";
import type {
  CompetitionDefinition,
  CompetitionEntry,
  CompetitionMode,
  CompetitionStore,
} from "./competition-store";

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function parseJsonNumbers(value: unknown, field: string): number[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value));
  } catch {
    throw new InvalidCompetitionError(`${field} corrompu (JSON invalide)`);
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "number")) {
    throw new InvalidCompetitionError(`${field} corrompu (number[] attendu)`);
  }
  return parsed;
}

function rowToCompetition(row: unknown): CompetitionDefinition {
  const record = asRecord(row);
  const mode: CompetitionMode = record["mode"] === "live" ? "live" : "paper";
  return {
    id: String(record["id"]),
    nameEn: String(record["name_en"]),
    nameFr: String(record["name_fr"]),
    descriptionEn: String(record["description_en"]),
    descriptionFr: String(record["description_fr"]),
    mode,
    buyIn: Number(record["buy_in"]),
    rakeRatio: Number(record["rake_ratio"]),
    payoutWeights: parseJsonNumbers(record["payout_weights"], "payout_weights"),
    startsAt: Number(record["starts_at"]),
    endsAt: Number(record["ends_at"]),
  };
}

function rowToEntry(row: unknown): CompetitionEntry {
  const record = asRecord(row);
  return {
    competitionId: String(record["competition_id"]),
    userId: String(record["user_id"]),
    walletAddress: String(record["wallet_address"]),
    paymentTxHash: String(record["payment_tx_hash"]),
    entryEquity: Number(record["entry_equity"]),
    joinedAt: Number(record["joined_at"]),
  };
}

/**
 * Persistance des compétitions réelles et de leurs tickets validés. L'ancien
 * schéma ne contenait que des compétitions/participants de démonstration sans
 * preuve de paiement. Il est supprimé une seule fois lorsqu'il est détecté : on
 * ne transforme jamais une fausse inscription en ticket payé.
 */
export class SqliteCompetitionStore implements CompetitionStore {
  private readonly db: DatabaseSync;

  constructor(database: string | DatabaseSync = ":memory:") {
    this.db = typeof database === "string" ? openDatabase(database) : database;
    this.removeUnverifiableLegacySchema();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS competitions (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_fr TEXT NOT NULL,
        description_en TEXT NOT NULL,
        description_fr TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
        buy_in REAL NOT NULL,
        rake_ratio REAL NOT NULL,
        payout_weights TEXT NOT NULL,
        starts_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL,
        closed INTEGER NOT NULL DEFAULT 0,
        winner_user_id TEXT
      );
      CREATE TABLE IF NOT EXISTS competition_entries (
        competition_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        payment_tx_hash TEXT NOT NULL UNIQUE,
        entry_equity REAL NOT NULL,
        joined_at INTEGER NOT NULL,
        PRIMARY KEY (competition_id, user_id),
        FOREIGN KEY (competition_id) REFERENCES competitions(id)
      );
    `);
  }

  private removeUnverifiableLegacySchema(): void {
    const table = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'competitions'")
      .get();
    if (table === undefined) return;
    const columns = this.db.prepare("PRAGMA table_info(competitions)").all();
    const hasRealSchema = columns.some(
      (row) => String(asRecord(row)["name"]) === "name_en",
    );
    if (hasRealSchema) return;
    this.db.exec("DROP TABLE IF EXISTS entries; DROP TABLE IF EXISTS competitions;");
  }

  has(id: string): boolean {
    return this.db.prepare("SELECT 1 FROM competitions WHERE id = ?").get(id) !== undefined;
  }

  create(competition: CompetitionDefinition): void {
    this.db
      .prepare(`
        INSERT INTO competitions (
          id, name_en, name_fr, description_en, description_fr, mode,
          buy_in, rake_ratio, payout_weights, starts_at, ends_at, closed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `)
      .run(
        competition.id,
        competition.nameEn,
        competition.nameFr,
        competition.descriptionEn,
        competition.descriptionFr,
        competition.mode,
        competition.buyIn,
        competition.rakeRatio,
        JSON.stringify(competition.payoutWeights),
        competition.startsAt,
        competition.endsAt,
      );
  }

  getCompetition(id: string): CompetitionDefinition | undefined {
    const row = this.db.prepare("SELECT * FROM competitions WHERE id = ?").get(id);
    return row === undefined ? undefined : rowToCompetition(row);
  }

  list(): CompetitionDefinition[] {
    return this.db
      .prepare("SELECT * FROM competitions ORDER BY starts_at DESC, id")
      .all()
      .map(rowToCompetition);
  }

  isClosed(id: string): boolean | undefined {
    const row = this.db.prepare("SELECT closed FROM competitions WHERE id = ?").get(id);
    return row === undefined ? undefined : Number(asRecord(row)["closed"]) !== 0;
  }

  entries(id: string): CompetitionEntry[] | undefined {
    if (!this.has(id)) return undefined;
    return this.db
      .prepare("SELECT * FROM competition_entries WHERE competition_id = ? ORDER BY joined_at, rowid")
      .all(id)
      .map(rowToEntry);
  }

  hasParticipant(id: string, userId: string): boolean {
    return (
      this.db
        .prepare("SELECT 1 FROM competition_entries WHERE competition_id = ? AND user_id = ?")
        .get(id, userId) !== undefined
    );
  }

  hasPaymentTx(txHash: string): boolean {
    return (
      this.db
        .prepare("SELECT 1 FROM competition_entries WHERE payment_tx_hash = ?")
        .get(txHash) !== undefined
    );
  }

  addEntry(entry: CompetitionEntry): void {
    this.db
      .prepare(`
        INSERT INTO competition_entries (
          competition_id, user_id, wallet_address, payment_tx_hash, entry_equity, joined_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        entry.competitionId,
        entry.userId,
        entry.walletAddress,
        entry.paymentTxHash,
        entry.entryEquity,
        entry.joinedAt,
      );
  }

  markClosed(id: string, winnerUserId: string | null): void {
    this.db
      .prepare("UPDATE competitions SET closed = 1, winner_user_id = ? WHERE id = ?")
      .run(winnerUserId, id);
  }

  winner(id: string): string | null | undefined {
    const row = this.db
      .prepare("SELECT winner_user_id FROM competitions WHERE id = ?")
      .get(id);
    if (row === undefined) return undefined;
    const value = asRecord(row)["winner_user_id"];
    return typeof value === "string" ? value : null;
  }

  close(): void {
    this.db.close();
  }
}
