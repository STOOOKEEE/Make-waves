import type { DatabaseSync } from "./sqlite";
import {
  MandateNotFoundError,
  type Mandate,
  type MandateStatus,
  type MandateStore,
  type MandateStyle,
} from "./mandate-store";

type Row = {
  id: string;
  agent_id: string;
  user_id: string;
  capital_max: number;
  perte_max_jour: number;
  max_trades_per_day: number;
  max_leverage: number;
  paires_autorisees: string;
  style: string | null;
  valid_until: number;
  signed_at: number | null;
  signature: string | null;
  status: string;
};

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function parsePaires(value: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(String(value));
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((p) => String(p));
  } catch {
    return [];
  }
}

function toMandate(row: unknown): Mandate {
  const record = asRecord(row);
  return {
    id: String(record["id"]),
    agentId: String(record["agent_id"]),
    userId: String(record["user_id"]),
    capitalMax: Number(record["capital_max"]),
    perteMaxJour: Number(record["perte_max_jour"]),
    maxTradesPerDay: Number(record["max_trades_per_day"]),
    maxLeverage: Number(record["max_leverage"]),
    pairesAutorisees: parsePaires(record["paires_autorisees"]),
    style: (record["style"] as string | null) as MandateStyle | null,
    validUntil: Number(record["valid_until"]),
    signedAt:
      record["signed_at"] === null ? null : Number(record["signed_at"]),
    signature:
      record["signature"] === null ? null : String(record["signature"]),
    status: String(record["status"]) as MandateStatus,
  };
}

/**
 * Persistance SQLite des mandats (`node:sqlite`). Table `mandates`. `paires_autorisees`
 * est stocké en JSON (TEXT). Le schéma est installé via `migrateAgentTables`.
 */
export class SqliteMandateStore implements MandateStore {
  private readonly db: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.db = database;
  }

  async create(mandate: Mandate): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO mandates (
          id, agent_id, user_id, capital_max, perte_max_jour,
          max_trades_per_day, max_leverage, paires_autorisees, style,
          valid_until, signed_at, signature, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        mandate.id,
        mandate.agentId,
        mandate.userId,
        mandate.capitalMax,
        mandate.perteMaxJour,
        mandate.maxTradesPerDay,
        mandate.maxLeverage,
        JSON.stringify(mandate.pairesAutorisees),
        mandate.style,
        mandate.validUntil,
        mandate.signedAt,
        mandate.signature,
        mandate.status,
      );
  }

  async getActive(agentId: string): Promise<Mandate | null> {
    const now = Date.now();
    const row = this.db
      .prepare(
        `SELECT * FROM mandates
         WHERE agent_id = ? AND status = 'active' AND valid_until > ?
         LIMIT 1`,
      )
      .get(agentId, now);
    return row ? toMandate(row) : null;
  }

  async get(id: string): Promise<Mandate | null> {
    const row = this.db
      .prepare(`SELECT * FROM mandates WHERE id = ?`)
      .get(id);
    return row ? toMandate(row) : null;
  }

  async listByAgent(agentId: string): Promise<Mandate[]> {
    const rows = this.db
      .prepare(`SELECT * FROM mandates WHERE agent_id = ? ORDER BY valid_until DESC`)
      .all(agentId);
    return rows.map(toMandate);
  }

  async update(id: string, patch: Partial<Mandate>): Promise<Mandate> {
    const current = await this.get(id);
    if (!current) {
      throw new MandateNotFoundError(id);
    }
    const next: Mandate = { ...current, ...patch, id: current.id };
    this.db
      .prepare(
        `UPDATE mandates SET
          agent_id = ?, user_id = ?, capital_max = ?, perte_max_jour = ?,
          max_trades_per_day = ?, max_leverage = ?, paires_autorisees = ?,
          style = ?, valid_until = ?, signed_at = ?, signature = ?, status = ?
         WHERE id = ?`,
      )
      .run(
        next.agentId,
        next.userId,
        next.capitalMax,
        next.perteMaxJour,
        next.maxTradesPerDay,
        next.maxLeverage,
        JSON.stringify(next.pairesAutorisees),
        next.style,
        next.validUntil,
        next.signedAt,
        next.signature,
        next.status,
        id,
      );
    return next;
  }
}
