import type { DatabaseSync } from "./sqlite";
import type {
  AgentXrplKey,
  AgentXrplKeysStore,
} from "./agent-xrpl-keys-store";

function asRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function toKey(row: unknown): AgentXrplKey {
  const record = asRecord(row);
  return {
    agentId: String(record["agent_id"]),
    userId: String(record["user_id"]),
    publicKey: String(record["public_key"]),
    encryptedPrivateKey: String(record["encrypted_private_key"]),
    masterKeyId: String(record["master_key_id"]),
    createdAt: Number(record["created_at"]),
  };
}

/**
 * Persistance SQLite des clés XRPL d'agent (`node:sqlite`). Table
 * `agent_xrpl_keys`. `INSERT OR REPLACE` sur PK `agent_id` rend `save`
 * idempotent (un revoke suivi d'un generate ré-utilise la même ligne).
 * Schéma installé au boot via `migrateAgentTables`.
 */
export class SqliteAgentXrplKeysStore implements AgentXrplKeysStore {
  private readonly db: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.db = database;
  }

  async save(key: AgentXrplKey): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO agent_xrpl_keys (
          agent_id, user_id, public_key, encrypted_private_key,
          master_key_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        key.agentId,
        key.userId,
        key.publicKey,
        key.encryptedPrivateKey,
        key.masterKeyId,
        key.createdAt,
      );
  }

  async get(agentId: string): Promise<AgentXrplKey | null> {
    const row = this.db
      .prepare(`SELECT * FROM agent_xrpl_keys WHERE agent_id = ?`)
      .get(agentId);
    return row ? toKey(row) : null;
  }

  async delete(agentId: string): Promise<void> {
    this.db
      .prepare(`DELETE FROM agent_xrpl_keys WHERE agent_id = ?`)
      .run(agentId);
  }
}