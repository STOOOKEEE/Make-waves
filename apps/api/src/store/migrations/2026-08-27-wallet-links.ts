import type { DatabaseSync } from "../sqlite";

/** Liaison déclarative identité Paper ↔ wallet connecté (anti-farming option B). */
export function migrateWalletLinkTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_paper_links (
      address TEXT PRIMARY KEY,
      paper_user_id TEXT NOT NULL,
      linked_at INTEGER NOT NULL
    );
  `);
}
