import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { BadgeDto, GiveawayStatusDto } from "@tide/client";
import {
  FIRST_TRADE_BADGE_CODE,
  GIVEAWAY_CLOSES_AT,
  GIVEAWAY_WEIGHTS,
} from "../data/giveaway";
import { errorMessage } from "./messages";

/*
 * État de participation d'un visiteur à la tombola.
 *
 * C'est la SEULE couture entre la page et les données : `GiveawayView` ne parle
 * jamais au client directement. Le serveur est prioritaire ; le calcul par
 * badges reste un repli pour les clients/test doubles plus anciens.
 */

/** Identifiant d'une règle d'entrée. */
export type GiveawayRuleId = "wallet" | "first_trade" | "referral";

export interface GiveawayRule {
  readonly id: GiveawayRuleId;
  /** Nombre d'entrées que la règle rapporte. */
  readonly weight: number;
  /** La règle est-elle remplie par ce visiteur ? */
  readonly done: boolean;
  /**
   * Règle affichée mais pas encore comptabilisée. Le parrainage reste `pending`
   * tant que le backend n'existe pas : on annonce la règle sans prétendre la
   * compter.
   */
  readonly pending: boolean;
}

/** Sous-ensemble du client utilisé ici (implémenté par `TideClient`). */
export interface GiveawayClient {
  badges(userId: string): Promise<readonly BadgeDto[]>;
  giveawayStatus?(userId: string): Promise<GiveawayStatusDto>;
  saveGiveawayConsent?(userId: string, termsVersion: string, xHandle: string): Promise<GiveawayStatusDto>;
}

export interface GiveawayApi {
  readonly rules: ComputedRef<readonly GiveawayRule[]>;
  /** Total personnel : somme des règles remplies ET comptabilisables. */
  readonly entries: ComputedRef<number>;
  /** Les participations sont-elles closes ? */
  readonly closed: ComputedRef<boolean>;
  readonly loading: Ref<boolean>;
  readonly error: Ref<string>;
  readonly walletAddress: Ref<string | null>;
  readonly xHandle: Ref<string>;
  readonly saving: Ref<boolean>;
  load(userId: string, hasWallet: boolean): Promise<void>;
  save(userId: string, termsVersion: string, xHandle: string): Promise<void>;
}

export function useGiveaway(client: GiveawayClient): GiveawayApi {
  const hasWallet = ref(false);
  const hasFirstTrade = ref(false);
  const walletAddress = ref<string | null>(null);
  const xHandle = ref("");
  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");
  const now = ref(Date.now());

  const rules = computed<readonly GiveawayRule[]>(() => [
    {
      id: "wallet",
      weight: GIVEAWAY_WEIGHTS.wallet,
      done: hasWallet.value,
      pending: false,
    },
    {
      id: "first_trade",
      weight: GIVEAWAY_WEIGHTS.firstTrade,
      done: hasFirstTrade.value,
      pending: false,
    },
    // Le parrainage reste annoncé mais non comptabilisé tant que son mécanisme
    // n'est pas ouvert.
    {
      id: "referral",
      weight: GIVEAWAY_WEIGHTS.referral,
      done: false,
      pending: true,
    },
  ]);

  const entries = computed(() =>
    rules.value.reduce((total, rule) => (rule.done && !rule.pending ? total + rule.weight : total), 0),
  );

  const closed = computed(() => now.value >= GIVEAWAY_CLOSES_AT);

  // La connexion du wallet et la lecture des badges arrivent par deux chemins
  // asynchrones : ce jeton ignore la réponse d'un chargement dépassé plutôt que
  // de laisser la dernière réponse arrivée gagner.
  let generation = 0;

  function applyStatus(status: GiveawayStatusDto): void {
    walletAddress.value = status.walletAddress;
    xHandle.value = status.xHandle ?? "";
    hasWallet.value = status.rules.some((rule) => rule.id === "wallet" && rule.awardedAt !== null);
    hasFirstTrade.value = status.rules.some(
      (rule) => rule.id === "first_trade" && rule.awardedAt !== null,
    );
  }

  /**
   * `walletConnected` vient de `useSession` : sur Tide, un compte EST un wallet
   * XRPL signé (Xaman ou GemWallet). Il n'y a pas d'inscription par e-mail, et
   * c'est cette signature qui rattache les entrées à quelqu'un de réel.
   */
  async function load(userId: string, walletConnected: boolean): Promise<void> {
    const current = (generation += 1);
    now.value = Date.now();
    hasWallet.value = walletConnected;
    walletAddress.value = null;
    xHandle.value = "";
    if (userId.trim() === "") {
      hasFirstTrade.value = false;
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      if (client.giveawayStatus !== undefined) {
        const status = await client.giveawayStatus(userId);
        if (current !== generation) return;
        applyStatus(status);
        return;
      }
      const badges = await client.badges(userId);
      if (current !== generation) return;
      walletAddress.value = walletConnected ? userId : null;
      hasFirstTrade.value = badges.some(
        (badge) => badge.code === FIRST_TRADE_BADGE_CODE && badge.earned,
      );
    } catch (e) {
      if (current !== generation) return;
      // Les badges ne sont montés que si un issuer NFT est configuré : sans eux
      // la page reste utilisable, la ligne « premier trade » est juste vide.
      hasFirstTrade.value = false;
      walletAddress.value = null;
      error.value = errorMessage(e);
    } finally {
      if (current === generation) loading.value = false;
    }
  }

  async function save(userId: string, termsVersion: string, handle: string): Promise<void> {
    if (client.saveGiveawayConsent === undefined) return;
    saving.value = true;
    error.value = "";
    try {
      applyStatus(await client.saveGiveawayConsent(userId, termsVersion, handle));
    } catch (e) {
      error.value = errorMessage(e);
      throw e;
    } finally {
      saving.value = false;
    }
  }

  return {
    rules,
    entries,
    closed,
    loading,
    error,
    walletAddress,
    xHandle,
    saving,
    load,
    save,
  };
}
