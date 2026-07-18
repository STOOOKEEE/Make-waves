/**
 * Espace de noms réservé au banc de charge Paper. Ces identifiants ne sont
 * jamais des comptes XRPL, ni des utilisateurs authentifiables du produit.
 */
export const ARENA_SIMULATION_USER_PREFIX = "sim:arena:";
export const TESTNET_E2E_USER_PREFIX = "e2e:testnet:";
/** Wallets custodiaux créés manuellement depuis la console locale Testnet. */
export const MANAGED_TESTNET_WALLET_USER_PREFIX = "wallet:testnet:";

/** Identifiant stable d'un profil de l'arène (indexé à partir de 0). */
export function arenaSimulationUserId(index: number): string {
  return `${ARENA_SIMULATION_USER_PREFIX}${String(index + 1).padStart(3, "0")}`;
}

/** Distingue explicitement les profils de charge des utilisateurs Tide. */
export function isArenaSimulationUserId(userId: string): boolean {
  return userId.startsWith(ARENA_SIMULATION_USER_PREFIX);
}

/** Comptes techniques, exclus de toute surface et métrique d'utilisateur humain. */
export function isTechnicalTestUserId(userId: string): boolean {
  return (
    isArenaSimulationUserId(userId) ||
    userId.startsWith(TESTNET_E2E_USER_PREFIX) ||
    userId.startsWith(MANAGED_TESTNET_WALLET_USER_PREFIX)
  );
}
