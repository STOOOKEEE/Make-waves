/**
 * Opérations on-chain du `MarginVault` dont le backend a besoin. Interface
 * **injectable** : le `SettlementService` en dépend (testé avec un fake), et
 * l'adaptateur concret (viem + clé opérateur + RPC) la branche au runtime —
 * cf. `createViemVaultClient`.
 *
 * Toutes les valeurs monétaires sont en **unités de base** du token (cf. `units.ts`).
 *
 * `idempotencyKey` : identifiant **stable** de l'instruction fourni par l'appelant
 * (backend). L'adaptateur le hache en `bytes32 settlementId` consommé on-chain :
 * un retry réseau réutilise la même clé → même id → le contrat rejette le rejeu
 * (`AlreadySettled`) au lieu de double-appliquer le mouvement. La clé doit donc
 * être déterministe pour une instruction donnée (ex. `positionId:action:seq`).
 */
export interface VaultClient {
  /** Comptabilise une ouverture (verrou de marge + débit du fee). */
  openAccounting(
    account: string,
    idempotencyKey: string,
    marginBase: bigint,
    feeBase: bigint,
  ): Promise<void>;
  /** Comptabilise une fermeture (libération de marge + PnL signé). */
  closeAccounting(
    account: string,
    idempotencyKey: string,
    marginReleaseBase: bigint,
    pnlBase: bigint,
  ): Promise<void>;
  /** Collatéral total comptabilisé pour un compte (plafond de marge réel). */
  collateralOf(account: string): Promise<bigint>;
}
