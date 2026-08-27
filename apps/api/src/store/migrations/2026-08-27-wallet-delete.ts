import type { DatabaseSync } from "../sqlite";

/**
 * Ajoute la trace de clôture (AccountDelete) aux deux tables de wallets Paper.
 * Le statut "deleted" + le hash permettent à la console de distinguer un
 * wallet fermé par le funnel d'un wallet simplement financé.
 */
export function migrateWalletDeleteColumns(db: DatabaseSync): void {
  for (const table of ["paper_wallets_mainnet", "paper_reward_wallets_mainnet"]) {
    const exists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(table);
    if (exists === undefined) continue;
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as ReadonlyArray<{
      readonly name: string;
    }>;
    if (!columns.some((column) => column.name === "delete_tx_hash")) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN delete_tx_hash TEXT`);
    }
  }
}
