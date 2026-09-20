/**
 * Espace de noms réservé au banc de charge Paper. Ces identifiants ne sont
 * jamais des comptes XRPL, ni des utilisateurs authentifiables du produit.
 */
export const ARENA_SIMULATION_USER_PREFIX = "sim:arena:";
/** Wallets custodiaux créés manuellement depuis la console locale Mainnet. */
export const MANAGED_WALLET_USER_PREFIX = "wallet:mainnet:";

/** Distingue explicitement les profils de charge des utilisateurs Tide. */
export function isArenaSimulationUserId(userId: string): boolean {
  return userId.startsWith(ARENA_SIMULATION_USER_PREFIX);
}

/** Comptes techniques, exclus de toute surface et métrique d'utilisateur humain. */
export function isTechnicalTestUserId(userId: string): boolean {
  return (
    isArenaSimulationUserId(userId) || userId.startsWith(MANAGED_WALLET_USER_PREFIX)
  );
}
