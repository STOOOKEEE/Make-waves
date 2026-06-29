import { ref } from "vue";
import type { TideClient } from "@tide/client";
import type { Balances, Fill, MarketOrderInput } from "@tide/core";
import { errorMessage } from "./messages";
import { useSession } from "./useSession";

/** Logique du terminal paper : connexion, soldes, ordres. État réactif Vue. */
export function usePaper(client: TideClient) {
  // L'identifiant vit dans la session partagée : connecter le terminal renseigne
  // l'identité de toute l'app (portfolio et compétitions ciblent le même compte).
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
    if (userId.value.trim() === "") {
      error.value = "Entre un identifiant";
      return;
    }
    try {
      await client.ensureAccount(userId.value);
      await refresh();
      connected.value = true;
      session.setUserId(userId.value); // persiste l'identité après une connexion réussie
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
