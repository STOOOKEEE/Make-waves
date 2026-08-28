import type { DatabaseSync } from "../sqlite";

/** Coffre séparé des deux tables du funnel Paper custodial. */
export function migrateManagedExternalWalletTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS managed_external_wallets (
      address TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      encrypted_seed TEXT NOT NULL,
      master_key_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}
