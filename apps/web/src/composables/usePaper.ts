import { ref } from "vue";
import type { TideClient } from "@tide/client";
import type { Balances, Fill, MarketOrderInput } from "@tide/core";
import { errorMessage } from "./messages";
import { useSession } from "./useSession";

/** Logique du terminal paper : connexion, soldes, ordres. État réactif Vue. */
export function usePaper(client: TideClient) {
  // L'identifiant vit dans la session partagée et correspond à l'adresse XRPL
  // connectée. Portfolio et compétitions ciblent donc le même wallet comptable.
  const session = useSession();
  const { userId } = session;
  const connected = ref(false);
  const balances = ref<Balances | null>(null);
  const orders = ref<readonly Fill[]>([]);
  const error = ref("");

  async function refresh(): Promise<void> {
    balances.value = await client.balances(userId.value);
    orders.value = await client.orders(userId.value);
  }

  async function connect(): Promise<void> {
    error.value = "";
    if (!session.walletConnected.value || session.liveAddress.value.trim() === "") {
      error.value = "Connecte ton wallet XRP";
      return;
    }
    userId.value = session.liveAddress.value;
    try {
      await client.ensureAccount(userId.value);
      await refresh();
      connected.value = true;
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  async function placeOrder(order: MarketOrderInput): Promise<void> {
    error.value = "";
    try {
      await client.placeOrder(userId.value, order);
      await refresh();
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  return { userId, connected, balances, orders, error, connect, placeOrder };
}
