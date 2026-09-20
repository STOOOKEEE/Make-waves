import { ref } from "vue";
import type { PaperWalletRewardDto, Portfolio, TideClient } from "@tide/client";
import type { Balances, Fill, MarketOrderInput } from "@tide/core";
import { errorMessage } from "./messages";
import { useAuth } from "./useAuth";
import { useSession } from "./useSession";

/** Logique du terminal paper : connexion, soldes, ordres. État réactif Vue. */
export function usePaper(client: TideClient) {
  // L'identifiant vit dans la session partagée : identité `paper:*` anonyme par
  // défaut, ou adresse XRPL authentifiée lorsqu'un wallet est connecté.
  const session = useSession();
  const auth = useAuth(client);
  const { userId } = session;
  const connected = ref(false);
  const balances = ref<Balances | null>(null);
  const orders = ref<readonly Fill[]>([]);
  const portfolio = ref<Portfolio | null>(null);
  const walletReward = ref<PaperWalletRewardDto | null>(null);
  const error = ref("");

  async function resolveUserId(): Promise<string> {
    if (session.walletConnected.value && session.liveAddress.value.trim() !== "") {
      userId.value = session.liveAddress.value;
      return userId.value;
    }
    const paperUserId = await auth.ensurePaperSession();
    // Une connexion wallet peut aboutir pendant le renouvellement Paper. Dans
    // ce cas, l'adresse + son JWT gagnent : on ne doit jamais réécrire le
    // `userId` global ni laisser le token Paper actif après le SIWX.
    if (session.walletConnected.value && session.liveAddress.value.trim() !== "") {
      auth.restore(session.liveAddress.value);
      userId.value = session.liveAddress.value;
      return userId.value;
    }
    userId.value = paperUserId;
    return userId.value;
  }

  async function refresh(): Promise<void> {
    const id = await resolveUserId();
    // Requêtes indépendantes du même compte → en parallèle.
    const [nextBalances, nextOrders, nextPortfolio, nextWalletReward] = await Promise.all([
      client.balances(id),
      client.orders(id),
      client.portfolio(id),
      client.paperWalletStatus(id),
    ]);
    balances.value = nextBalances;
    orders.value = nextOrders;
    portfolio.value = nextPortfolio;
    walletReward.value = nextWalletReward;
  }

  async function connect(): Promise<void> {
    error.value = "";
    try {
      const id = await resolveUserId();
      await client.ensureAccount(id);
      await refresh();
      connected.value = true;
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  async function placeOrder(order: MarketOrderInput): Promise<void> {
    error.value = "";
    try {
      if (!connected.value) {
        await connect();
      }
      await client.placeOrder(await resolveUserId(), order);
      await refresh();
    } catch (e) {
      error.value = errorMessage(e);
      throw e;
    }
  }

  async function claimWallet(): Promise<void> {
    error.value = "";
    try {
      walletReward.value = await client.claimPaperWallet(await resolveUserId());
    } catch (e) {
      error.value = errorMessage(e);
      throw e;
    }
  }

  async function claimRewardWallet(): Promise<void> {
    error.value = "";
    try {
      walletReward.value = await client.claimPaperRewardWallet(await resolveUserId());
    } catch (e) {
      error.value = errorMessage(e);
      throw e;
    }
  }

  return {
    userId,
    connected,
    balances,
    orders,
    portfolio,
    walletReward,
    error,
    connect,
    refresh,
    placeOrder,
    claimWallet,
    claimRewardWallet,
  };
}
