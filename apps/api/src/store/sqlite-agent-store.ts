import type { DatabaseSync } from "./sqlite";
import {
  AgentNotFoundError,
  type Agent,
  type AgentStore,
  type AgentStatus,
  type AgentType,
} from "./agent-store";

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function toAgent(row: unknown): Agent {
  const record = asRecord(row);
  return {
    id: String(record["id"]),
    userId: String(record["user_id"]),
    name: String(record["name"]),
    type: String(record["type"]) as AgentType,
    status: String(record["status"]) as AgentStatus,
    hasLiveAccount: Number(record["has_live_account"]) !== 0,
    createdAt: Number(record["created_at"]),
    updatedAt: Number(record["updated_at"]),
  };
}

/**
 * Persistance SQLite des agents (`node:sqlite`). Table `agents`. Le schéma est
 * installé au boot via `migrateAgentTables` ; le constructeur n'exécute pas de
 * migration ici — il partage le `DatabaseSync` injecté.
 */
export class SqliteAgentStore implements AgentStore {
  private readonly db: DatabaseSync;

  /** `database` : une connexion partagée (créée par l'appelant). */
  constructor(database: DatabaseSync) {
    this.db = database;
  }

  async create(agent: Agent): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO agents (id, user_id, name, type, status, has_live_account, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        agent.id,
        agent.userId,
        agent.name,
        agent.type,
        agent.status,
        agent.hasLiveAccount ? 1 : 0,
        agent.createdAt,
        agent.updatedAt,
      );
  }

  async get(id: string): Promise<Agent | null> {
    const row = this.db
      .prepare(`SELECT * FROM agents WHERE id = ?`)
      .get(id);
    return row ? toAgent(row) : null;
  }

  async listByUser(userId: string): Promise<Agent[]> {
    const rows = this.db
      .prepare(`SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId);
    return rows.map(toAgent);
  }

  async list(): Promise<Agent[]> {
    const rows = this.db
      .prepare(`SELECT * FROM agents ORDER BY created_at DESC`)
      .all();
    return rows.map(toAgent);
  }

  async update(id: string, patch: Partial<Agent>): Promise<Agent> {
    const current = await this.get(id);
    if (!current) {
      throw new AgentNotFoundError(id);
    }
    const next: Agent = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: Date.now(),
    };
    this.db
      .prepare(
        `UPDATE agents SET name = ?, type = ?, status = ?, has_live_account = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        next.name,
        next.type,
        next.status,
        next.hasLiveAccount ? 1 : 0,
        next.updatedAt,
        id,
      );
    return next;
  }

  async delete(id: string): Promise<void> {
    this.db.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
  }
}
