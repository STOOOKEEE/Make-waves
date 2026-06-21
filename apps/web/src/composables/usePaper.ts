import { ref } from "vue";
import { TideApiError, type TideClient } from "@tide/client";
import type { Balances, Fill, MarketOrderInput } from "@tide/core";
import { errorMessage } from "./messages";

const ACCOUNT_EXISTS = 409;

/** Logique du terminal paper : connexion, soldes, ordres. État réactif Vue. */
export function usePaper(client: TideClient) {
  const userId = ref("");
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
      try {
        await client.openAccount(userId.value);
      } catch (e) {
        // 409 = compte déjà ouvert : on continue. Toute autre erreur remonte.
        if (!(e instanceof TideApiError && e.status === ACCOUNT_EXISTS)) {
          throw e;
        }
      }
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
