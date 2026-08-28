import { BADGE_CODES } from "../badges/catalog";
import type { BadgeStore } from "../store/badge-store";
import type { PaperBadgeRewardStore } from "../store/paper-badge-reward-store";
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
 * - un wallet 1 simplement créé/financé ne consomme pas la récompense : l'user
 *   peut encore choisir de recevoir le NFT sur son wallet externe ;
 * - si l'identité Paper liée ou un autre wallet lié a déjà gagné/commencé le
 *   claim First Trade, le claim est refusé ;
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
      const [paperReward, otherRewards, otherClaims] = await Promise.all([
        deps.firstTradeRows.get(linked, BADGE_CODES.FIRST_TRADE),
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
      const anotherWalletUsed =
        otherRewards.some((reward) => reward !== null) ||
        otherClaims.some((claim) => claim !== null);
      if (paperReward !== null || anotherWalletUsed) {
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

export interface FirstTradeManagedGuardDeps {
  readonly links: Pick<WalletLinkStore, "listWalletsForPaperUser">;
  readonly badgeClaims: Pick<BadgeStore, "get">;
}

/**
 * Garde symétrique du funnel custodial : dès qu'un wallet externe lié a créé
 * une offre First Trade (même encore en attente de signature), le compte Paper
 * ne peut plus provisionner wallet 2 et remint le même NFT.
 */
export function createFirstTradeManagedGuard(
  deps: FirstTradeManagedGuardDeps,
): (paperUserId: string) => Promise<void> {
  return async (paperUserId) => {
    if (!paperUserId.startsWith("paper:")) return;
    const linkedWallets = await deps.links.listWalletsForPaperUser(paperUserId);
    const externalClaims = await Promise.all(
      linkedWallets.map((address) =>
        deps.badgeClaims.get(address, BADGE_CODES.FIRST_TRADE),
      ),
    );
    if (externalClaims.some((claim) => claim !== null)) {
      throw new FirstTradeExternalClaimDeniedError(
        "Récompense First Trade déjà réclamée sur un wallet externe lié",
      );
    }
  };
}
