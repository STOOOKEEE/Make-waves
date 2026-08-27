import { BADGE_CODES } from "../badges/catalog";
import type { BadgeStore } from "../store/badge-store";
import type { PaperBadgeRewardStore } from "../store/paper-badge-reward-store";
import type { PaperWalletStore } from "../store/paper-wallet-store";
import type { WalletLinkStore } from "../store/wallet-link-store";

/** Claim First Trade sur wallet connecté refusé (→ 403). */
export class FirstTradeExternalClaimDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirstTradeExternalClaimDeniedError";
  }
}

export interface FirstTradeExternalGuardDeps {
  readonly links: WalletLinkStore;
  readonly firstTradeRows: PaperBadgeRewardStore;
  readonly starters: PaperWalletStore;
  readonly badgeClaims: BadgeStore;
  /** Plafond journalier global de claims First Trade sur wallet connecté. */
  readonly maxExternalMintsPerDay?: number;
  readonly now?: () => number;
}

/** Au-delà, on accuse un farming : le programme est gelé pour la journée. */
const DEFAULT_MAX_EXTERNAL_MINTS_PER_DAY = 50;

/**
 * Garde de l'option B (« connecter son wallet » puis claim du NFT dessus).
 * Un user honnête = 1 NFT, quel que soit le nombre de wallets connectés :
 * - l'identité doit être l'adresse XRPL authentifiée (jamais paper:*) ;
 * - si ce wallet a été lié à une identité Paper qui a déjà entamé le funnel
 *   (éligibilité first_trade ou wallet 1 réclamé), le claim est refusé ;
 * - plafond journalier global de mints externes (frein dur anti-farming).
 * L'idempotence 1 NFT par adresse reste garantie par le BadgeStore.
 */
export function createFirstTradeExternalGuard(
  deps: FirstTradeExternalGuardDeps,
): (userId: string, walletAddress: string, code: string) => Promise<void> {
  const now = deps.now ?? Date.now;
  return async (userId, walletAddress, code) => {
    if (code !== BADGE_CODES.FIRST_TRADE) {
      throw new FirstTradeExternalClaimDeniedError("Badge non réclamable sur wallet connecté");
    }
    if (userId.startsWith("paper:") || userId !== walletAddress) {
      throw new FirstTradeExternalClaimDeniedError(
        "Le claim First Trade sur wallet connecté exige l'identité XRPL authentifiée",
      );
    }
    const linked = await deps.links.getPaperUserId(walletAddress);
    if (linked !== null) {
      const linkedWallets = await deps.links.listWalletsForPaperUser(linked);
      const otherWallets = linkedWallets.filter((address) => address !== walletAddress);
      const [paperReward, starter, otherRewards, otherClaims] = await Promise.all([
        deps.firstTradeRows.get(linked, BADGE_CODES.FIRST_TRADE),
        deps.starters.get(linked),
        Promise.all(
          otherWallets.map((address) =>
            deps.firstTradeRows.get(address, BADGE_CODES.FIRST_TRADE),
          ),
        ),
        Promise.all(
          otherWallets.map((address) =>
            deps.badgeClaims.get(address, BADGE_CODES.FIRST_TRADE),
          ),
        ),
      ]);
      const starterUsed = starter !== null && starter.status !== "pending_funding";
      const anotherWalletUsed =
        otherRewards.some((reward) => reward !== null) ||
        otherClaims.some((claim) => claim !== null);
      if (paperReward !== null || starterUsed || anotherWalletUsed) {
        throw new FirstTradeExternalClaimDeniedError(
          "Récompense First Trade déjà obtenue avec un autre compte de ce navigateur",
        );
      }
    }
    const cap = deps.maxExternalMintsPerDay ?? DEFAULT_MAX_EXTERNAL_MINTS_PER_DAY;
    const startOfDay = Math.floor(now() / 86_400_000) * 86_400_000;
    const today = await deps.badgeClaims.countByCodeSince(BADGE_CODES.FIRST_TRADE, startOfDay);
    if (today >= cap) {
      throw new FirstTradeExternalClaimDeniedError(
        `Plafond quotidien de claims First Trade atteint (${String(cap)})`,
      );
    }
  };
}
