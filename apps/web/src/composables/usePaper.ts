import { ref } from "vue";
import type { TideClient } from "@tide/client";
import type { Balances, Fill, MarketOrderInput } from "@tide/core";
import { errorMessage } from "./messages";
import { useSession } from "./useSession";

const PAPER_USER_KEY = "tide.paperUserId";

function loadPaperUserId(): string {
  try {
    const existing = localStorage.getItem(PAPER_USER_KEY);
    if (existing !== null && existing.trim() !== "") {
      return existing;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `paper:${crypto.randomUUID()}`
        : `paper:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(PAPER_USER_KEY, id);
    return id;
  } catch {
    return `paper:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  }
}

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

  function resolveUserId(): string {
    if (session.walletConnected.value && session.liveAddress.value.trim() !== "") {
      userId.value = session.liveAddress.value;
      return userId.value;
    }
    if (userId.value.trim() === "") {
      userId.value = loadPaperUserId();
    }
    return userId.value;
  }

  async function refresh(): Promise<void> {
    const id = resolveUserId();
    // Deux requêtes indépendantes (mêmes paramètres) → en parallèle.
    const [nextBalances, nextOrders] = await Promise.all([
      client.balances(id),
      client.orders(id),
    ]);
    balances.value = nextBalances;
    orders.value = nextOrders;
  }

  async function connect(): Promise<void> {
    error.value = "";
    const id = resolveUserId();
    try {
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
      await client.placeOrder(resolveUserId(), order);
      await refresh();
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  return { userId, connected, balances, orders, error, connect, refresh, placeOrder };
}
