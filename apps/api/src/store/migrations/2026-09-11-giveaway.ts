import type { DatabaseSync } from "../sqlite";

/** Identité et entrées de la tombola, dans la même SQLite que le produit. */
export function migrateGiveawayTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaway_profiles (
      operation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      x_handle TEXT NOT NULL,
      terms_version TEXT NOT NULL,
      accepted_at INTEGER NOT NULL,
      PRIMARY KEY (operation_id, user_id),
      UNIQUE (operation_id, wallet_address)
    );
    CREATE TABLE IF NOT EXISTS giveaway_entries (
      operation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rule TEXT NOT NULL,
      weight INTEGER NOT NULL,
      awarded_at INTEGER NOT NULL,
      PRIMARY KEY (operation_id, user_id, rule)
    );
    CREATE INDEX IF NOT EXISTS idx_giveaway_profiles_user
      ON giveaway_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_giveaway_entries_user
      ON giveaway_entries(operation_id, user_id);
  `);
}
