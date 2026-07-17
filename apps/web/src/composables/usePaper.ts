import { ref } from "vue";
import type { PaperWalletRewardDto, TideClient } from "@tide/client";
import type { Balances, Fill, MarketOrderInput } from "@tide/core";
import { errorMessage } from "./messages";
import { useAuth } from "./useAuth";
import { useSession } from "./useSession";

/** Logique du terminal paper : connexion, soldes, ordres. État réactif Vue. */
export function usePaper(client: TideClient) {
  // L'identifiant vit dans la session partagée et correspond à l'adresse XRPL
  // connectée. Portfolio et compétitions ciblent donc le même wallet comptable.
  const session = useSession();
  const auth = useAuth(client);
  const { userId } = session;
  const connected = ref(false);
  const balances = ref<Balances | null>(null);
  const orders = ref<readonly Fill[]>([]);
  const walletReward = ref<PaperWalletRewardDto | null>(null);
  const error = ref("");

  async function resolveUserId(): Promise<string> {
    if (session.walletConnected.value && session.liveAddress.value.trim() !== "") {
      userId.value = session.liveAddress.value;
      return userId.value;
    }
    userId.value = await auth.ensurePaperSession();
    return userId.value;
  }

  async function refresh(): Promise<void> {
    const id = await resolveUserId();
    // Deux requêtes indépendantes (mêmes paramètres) → en parallèle.
    const [nextBalances, nextOrders, nextWalletReward] = await Promise.all([
      client.balances(id),
      client.orders(id),
      client.paperWalletStatus(id),
    ]);
    balances.value = nextBalances;
    orders.value = nextOrders;
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
    }
  }

  return {
    userId,
    connected,
    balances,
    orders,
    walletReward,
    error,
    connect,
    refresh,
    placeOrder,
  };
}
