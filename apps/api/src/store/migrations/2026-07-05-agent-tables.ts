import type { DatabaseSync } from "node:sqlite";

/**
 * Migration : ajoute les tables agents, mandates, agent_actions, agent_xrpl_keys
 * + index pour le calcul de trades_per_day et l'idempotence.
 * Idempotente : `CREATE ... IF NOT EXISTS`. À appeler depuis main.ts au boot.
 */
export function migrateAgentTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      has_live_account INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mandates (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      capital_max REAL NOT NULL,
      perte_max_jour REAL NOT NULL,
      max_trades_per_day INTEGER NOT NULL,
      max_leverage REAL NOT NULL,
      paires_autorisees TEXT NOT NULL,
      style TEXT,
      valid_until INTEGER NOT NULL,
      signed_at INTEGER,
      signature TEXT,
      status TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS agent_actions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      tool_params TEXT NOT NULL,
      result TEXT,
      error TEXT,
      idempotency_key TEXT,
      executed_at INTEGER NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_actions_idempotency
      ON agent_actions(user_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_agent_actions_lookup
      ON agent_actions(user_id, agent_id, executed_at);

    CREATE TABLE IF NOT EXISTS agent_xrpl_keys (
      agent_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      master_key_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);
}