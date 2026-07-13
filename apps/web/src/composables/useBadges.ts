import { ref } from "vue";
import type { BadgeDto } from "@tide/client";
import { errorMessage } from "./messages";

/** Sous-ensemble du client utilisé ici (implémenté par `TideClient`). */
export interface BadgeClient {
  badges(userId: string): Promise<readonly BadgeDto[]>;
  claimBadge(
    userId: string,
    code: string,
    walletAddress: string,
  ): Promise<{ sellOfferId: string; nftTokenId: string }>;
  confirmBadgeClaim(userId: string, code: string, txHash?: string): Promise<void>;
}

/** Signature de l'accept par le user : renvoie le hash de tx, ou null si annulé. */
export type SignAccept = (sellOfferId: string) => Promise<string | null>;

/**
 * Badges de l'utilisateur : chargement du statut + claim NFT (mint serveur +
 * signature de l'accept par le user via `sign`). La signature est injectée pour
 * découpler le composable du wallet (testable sans extension).
 */
export function useBadges(client: BadgeClient) {
  const badges = ref<readonly BadgeDto[]>([]);
  const loading = ref(false);
  /** Code du badge en cours de claim, sinon null. */
  const claiming = ref<string | null>(null);
  const error = ref("");

  async function load(userId: string): Promise<void> {
    if (userId.trim() === "") {
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      badges.value = await client.badges(userId);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  async function claim(
    userId: string,
    code: string,
    walletAddress: string,
    sign: SignAccept,
  ): Promise<void> {
    claiming.value = code;
    error.value = "";
    try {
      const { sellOfferId } = await client.claimBadge(userId, code, walletAddress);
      const txHash = await sign(sellOfferId);
      if (txHash === null) {
        // Signature annulée : le badge reste en offer_pending côté serveur.
        return;
      }
      await client.confirmBadgeClaim(userId, code, txHash);
      await load(userId);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      claiming.value = null;
    }
  }

  return { badges, loading, claiming, error, load, claim };
}
