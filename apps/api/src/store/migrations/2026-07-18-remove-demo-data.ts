import type { DatabaseSync } from "../sqlite";

const LEGACY_DEMO_USERS = [
  "quant_viper",
  "degen_maxi",
  "satoshi_heir",
  "liquid_zen",
  "night_fader",
  "apex_owl",
] as const;

/**
 * Supprime uniquement les identités exactes anciennement injectées au boot.
 * Les vrais comptes (wallets et sessions paper:) ne sont jamais concernés.
 */
export function removeLegacyDemoAccounts(db: DatabaseSync): void {
  const placeholders = LEGACY_DEMO_USERS.map(() => "?").join(", ");
  db.exec("BEGIN");
  try {
    for (const table of ["positions", "orders", "balances", "accounts"]) {
      db.prepare(`DELETE FROM ${table} WHERE user_id IN (${placeholders})`).run(
        ...LEGACY_DEMO_USERS,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
