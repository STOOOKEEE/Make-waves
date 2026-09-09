import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { BadgeDto } from "@tide/client";
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
 * jamais au client directement. Aujourd'hui ce composable recompose ce que le
 * produit sait déjà (wallet XRPL connecté + mérite du badge `first_trade`) ;
 * quand la route serveur existera (cf.
 * docs/superpowers/specs/2026-09-09-giveaway-entries-design.md) il suffira de
 * remplacer la source ici, sans toucher à la vue.
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
}

export interface GiveawayApi {
  readonly rules: ComputedRef<readonly GiveawayRule[]>;
  /** Total personnel : somme des règles remplies ET comptabilisables. */
  readonly entries: ComputedRef<number>;
  /** Les participations sont-elles closes ? */
  readonly closed: ComputedRef<boolean>;
  readonly loading: Ref<boolean>;
  readonly error: Ref<string>;
  load(userId: string, hasWallet: boolean): Promise<void>;
}

export function useGiveaway(client: GiveawayClient): GiveawayApi {
  const hasWallet = ref(false);
  const hasFirstTrade = ref(false);
  const loading = ref(false);
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
    // Le parrainage a besoin d'un code et d'un compteur côté serveur : il est
    // annoncé, jamais compté, tant que cette route n'existe pas.
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

  /**
   * `walletConnected` vient de `useSession` : sur Tide, un compte EST un wallet
   * XRPL signé (Xaman ou GemWallet). Il n'y a pas d'inscription par e-mail, et
   * c'est cette signature qui rattache les entrées à quelqu'un de réel.
   */
  async function load(userId: string, walletConnected: boolean): Promise<void> {
    const current = (generation += 1);
    now.value = Date.now();
    hasWallet.value = walletConnected;
    if (userId.trim() === "") {
      hasFirstTrade.value = false;
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      const badges = await client.badges(userId);
      if (current !== generation) return;
      hasFirstTrade.value = badges.some(
        (badge) => badge.code === FIRST_TRADE_BADGE_CODE && badge.earned,
      );
    } catch (e) {
      if (current !== generation) return;
      // Les badges ne sont montés que si un issuer NFT est configuré : sans eux
      // la page reste utilisable, la ligne « premier trade » est juste vide.
      hasFirstTrade.value = false;
      error.value = errorMessage(e);
    } finally {
      if (current === generation) loading.value = false;
    }
  }

  return { rules, entries, closed, loading, error, load };
}
