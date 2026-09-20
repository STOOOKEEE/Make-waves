import { ref } from "vue";
import type { BadgeAcceptTx, BadgeDto, ClaimBadgeResult } from "@tide/client";
import { errorMessage } from "./messages";

/** Sous-ensemble du client utilisé ici (implémenté par `TideClient`). */
export interface BadgeClient {
  badges(userId: string): Promise<readonly BadgeDto[]>;
  claimBadge(
    userId: string,
    code: string,
    walletAddress: string,
  ): Promise<ClaimBadgeResult>;
  resumeBadgeClaim?: (
    userId: string,
    code: string,
    walletAddress: string,
  ) => Promise<ClaimBadgeResult>;
  confirmBadgeClaim(userId: string, code: string, txHash?: string): Promise<void>;
}

/** Contexte d'un claim transmis à la signature (Xaman en a besoin pour créer le payload). */
export interface BadgeClaimContext {
  /** Accept construit par le serveur (signature GemWallet). */
  readonly acceptTx: BadgeAcceptTx;
  readonly userId: string;
  readonly code: string;
  readonly walletAddress: string;
}

/** Signature de l'accept (tx taggée) par le user : hash de tx, ou null si annulé. */
export type SignAccept = (claim: BadgeClaimContext) => Promise<string | null>;

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
      const pending = badges.value.find(
        (badge) => badge.code === code && badge.status === "offer_pending",
      );
      const claim =
        pending !== undefined && client.resumeBadgeClaim !== undefined
          ? await client.resumeBadgeClaim(userId, code, walletAddress)
          : await client.claimBadge(userId, code, walletAddress);
      const { acceptTx } = claim;
      const txHash = await sign({ acceptTx, userId, code, walletAddress });
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
