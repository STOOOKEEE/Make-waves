import type { DatabaseSync } from "./sqlite";
import {
  startOfUtcDay,
  type AgentAction,
  type AgentActionsStore,
} from "./agent-actions-store";

type Row = {
  id: string;
  agent_id: string;
  user_id: string;
  tool_name: string;
  tool_params: string;
  result: string | null;
  error: string | null;
  idempotency_key: string | null;
  executed_at: number;
};

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function toAction(row: unknown): AgentAction {
  const record = asRecord(row);
  return {
    id: String(record["id"]),
    agentId: String(record["agent_id"]),
    userId: String(record["user_id"]),
    toolName: String(record["tool_name"]),
    toolParams: String(record["tool_params"]),
    result: record["result"] === null ? null : String(record["result"]),
    error: record["error"] === null ? null : String(record["error"]),
    idempotencyKey:
      record["idempotency_key"] === null
        ? null
        : String(record["idempotency_key"]),
    executedAt: Number(record["executed_at"]),
  };
}

/**
 * Persistance SQLite des actions d'agent (`node:sqlite`). Table `agent_actions`.
 * Idempotence garantie par l'index unique `idx_agent_actions_idempotency` —
 * `INSERT OR IGNORE` neutralise les doublons. `countToday` borne sur le début du
 * jour UTC courant.
 */
export class SqliteAgentActionsStore implements AgentActionsStore {
  private readonly db: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.db = database;
  }

  async record(action: AgentAction): Promise<void> {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO agent_actions (
          id, agent_id, user_id, tool_name, tool_params, result,
          error, idempotency_key, executed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        action.id,
        action.agentId,
        action.userId,
        action.toolName,
        action.toolParams,
        action.result,
        action.error,
        action.idempotencyKey,
        action.executedAt,
      );
  }

  async findByIdempotencyKey(
    userId: string,
    key: string,
  ): Promise<AgentAction | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM agent_actions
         WHERE user_id = ? AND idempotency_key = ?
         LIMIT 1`,
      )
      .get(userId, key);
    return row ? toAction(row) : null;
  }

  async listByAgent(agentId: string, limit = 100): Promise<AgentAction[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM agent_actions
         WHERE agent_id = ?
         ORDER BY executed_at DESC
         LIMIT ?`,
      )
      .all(agentId, limit);
    return rows.map(toAction);
  }

  async countToday(agentId: string, userId: string): Promise<number> {
    const todayStart = startOfUtcDay(Date.now());
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM agent_actions
         WHERE agent_id = ? AND user_id = ? AND executed_at >= ?`,
      )
      .get(agentId, userId, todayStart);
    return row === undefined ? 0 : Number(asRecord(row)["count"]);
  }
}
