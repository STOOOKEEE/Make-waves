import type { DatabaseSync } from "node:sqlite";

/** Identités email/social liées à un compte Tide existant. */
export function migrateExternalIdentityTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS external_identities (
      issuer TEXT NOT NULL,
      subject TEXT NOT NULL,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      email TEXT,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER NOT NULL,
      PRIMARY KEY (issuer, subject)
    );
    CREATE INDEX IF NOT EXISTS idx_external_identities_user
      ON external_identities(user_id);
  `);
}
