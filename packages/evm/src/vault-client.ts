/**
 * Opérations on-chain du `MarginVault` dont le backend a besoin. Interface
 * **injectable** : le `SettlementService` en dépend (testé avec un fake), et
 * l'adaptateur concret (viem + clé opérateur + RPC) la branche au runtime —
 * frontière `[env]`, hors de ce package pur.
 *
 * Toutes les valeurs sont en **unités de base** du token (cf. `units.ts`).
 */
export interface VaultClient {
  /** Comptabilise une ouverture (verrou de marge + débit du fee). */
  openAccounting(account: string, marginBase: bigint, feeBase: bigint): Promise<void>;
  /** Comptabilise une fermeture (libération de marge + PnL signé). */
  closeAccounting(account: string, marginReleaseBase: bigint, pnlBase: bigint): Promise<void>;
  /** Collatéral total comptabilisé pour un compte (plafond de marge réel). */
  collateralOf(account: string): Promise<bigint>;
}
