/* ===== Bac à sable — état réactif =====
 *
 * Lit de **vraies données de marché** via les seules routes publiques et non
 * authentifiées (`/markets`, `/history/:symbol`, `/book/:symbol`) et exécute
 * **tout en local**.
 *
 * La garantie « aucune écriture serveur » n'est pas une convention mais une
 * contrainte de compilation : `SandboxFeed` ne contient que trois méthodes de
 * lecture, donc appeler `placeOrder`, `openPosition` ou `claimPaperWallet`
 * depuis ce module est une erreur TypeScript.
 */
import { computed, ref, shallowRef } from "vue";
import type { BookDepth, Candle, MarketRow, TideClient } from "@tide/client";
import {
  closeSim,
  openSim,
  simEquity,
  triggerFor,
  SIM_STARTING_EQUITY,
  type SimClosed,
  type SimFill,
  type SimPosition,
  type SimProduct,
  type SimSide,
} from "../lib/sandbox/engine";
import type { SandboxSnapshot } from "../lib/sandbox/goals";
import { nextPrice, seededRandom } from "../lib/sandbox/walk";
import { FALLBACK_CANDLES, FALLBACK_MARKETS } from "../data/tutorial/fallback";

/** Surface de lecture seule du client : c'est tout ce que le bac à sable voit. */
export type SandboxFeed = Pick<TideClient, "markets" | "history" | "bookDepth">;

/** Marchés proposés dans la watchlist du tutoriel : assez pour choisir, pas trop. */
const WATCHLIST_SIZE = 6;
/**
 * Les stablecoins sont exclus : un actif qui vaut 1 $ en permanence ne permet
 * d'enseigner ni une bougie, ni un stop, ni une liquidation. Ils remplissent
 * pourtant le top des marchés par capitalisation.
 */
const STABLECOINS = new Set(["USDT", "USDC", "DAI", "FDUSD", "USDE", "TUSD", "BUSD", "PYUSD"]);
/** Nombre de pas rejoués par « accélérer » : environ une heure de marché. */
const FAST_FORWARD_STEPS = 60;

export function useSandbox(feed: SandboxFeed, now: () => number = () => Date.now()) {
  const markets = shallowRef<MarketRow[]>([]);
  const candles = shallowRef<Candle[]>([]);
  const book = shallowRef<BookDepth | null>(null);
  const symbol = ref("BTC");
  const mark = ref(0);
  const marketSelections = ref(0);
  const loading = ref(true);

  // Ticket
  const product = ref<SimProduct>("spot");
  const orderKind = ref<"market" | "limit">("market");
  const side = ref<SimSide>("buy");
  const liquidity = ref<"maker" | "taker">("taker");
  const amount = ref(0);
  const leverage = ref(1);
  const takeProfit = ref<number | null>(null);
  const stopLoss = ref<number | null>(null);
  const limitPrice = ref<number | null>(null);
  const chartMode = ref<"candles" | "line">("line");

  // Compte simulé
  const cash = ref(SIM_STARTING_EQUITY);
  const positions = ref<SimPosition[]>([]);
  const fills = ref<SimFill[]>([]);
  const closed = ref<SimClosed[]>([]);
  const accelerations = ref<number[]>([]);

  const rand = seededRandom(20260828);
  let drift = 0;
  let seq = 0;

  const equity = computed(() => simEquity(cash.value, positions.value, mark.value));
  const available = computed(() =>
    Math.max(0, cash.value - positions.value.reduce((sum, p) => sum + p.margin, 0)),
  );

  const snapshot = computed<SandboxSnapshot>(() => ({
    symbol: symbol.value,
    product: product.value,
    orderKind: orderKind.value,
    liquidity: liquidity.value,
    side: side.value,
    amount: amount.value,
    leverage: leverage.value,
    takeProfit: takeProfit.value,
    stopLoss: stopLoss.value,
    chartMode: chartMode.value,
    mark: mark.value,
    equity: equity.value,
    positions: positions.value,
    fills: fills.value,
    closed: closed.value,
    accelerations: accelerations.value,
    marketSelections: marketSelections.value,
  }));

  /**
   * Le tutoriel n'affiche jamais d'erreur réseau : si le feed est indisponible
   * (rate-limit, API coupée, démo hors ligne), on bascule silencieusement sur un
   * jeu de bougies figé. Un écran d'erreur au premier contact serait pire que
   * des données de repli clairement étiquetées « simulation ».
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      const rows = await feed.markets();
      markets.value = rows
        .filter((row) => !STABLECOINS.has(row.symbol.toUpperCase()))
        .slice(0, WATCHLIST_SIZE);
    } catch {
      markets.value = [...FALLBACK_MARKETS];
    }
    if (markets.value.length === 0) markets.value = [...FALLBACK_MARKETS];
    const first = markets.value[0];
    if (first !== undefined) symbol.value = first.symbol;
    await loadSymbol();
    loading.value = false;
  }

  async function loadSymbol(): Promise<void> {
    try {
      const history = await feed.history(symbol.value, "1h", 120);
      candles.value = history.length > 0 ? history : [...FALLBACK_CANDLES];
    } catch {
      candles.value = [...FALLBACK_CANDLES];
    }
    const last = candles.value.at(-1);
    const row = markets.value.find((m) => m.symbol === symbol.value);
    mark.value = row?.price ?? last?.c ?? 100;
    try {
      book.value = await feed.bookDepth(symbol.value, 8);
    } catch {
      book.value = null;
    }
  }

  async function selectMarket(row: MarketRow): Promise<void> {
    if (row.symbol === symbol.value) {
      marketSelections.value += 1;
      return;
    }
    symbol.value = row.symbol;
    marketSelections.value += 1;
    await loadSymbol();
  }

  /** Avance le prix d'un pas et applique les déclencheurs TP/SL/liquidation. */
  function tick(): void {
    if (mark.value <= 0) return;
    mark.value = nextPrice(mark.value, rand, { drift });
    settleTriggers();
  }

  function settleTriggers(): void {
    for (const position of [...positions.value]) {
      const reason = triggerFor(position, mark.value);
      if (reason !== null) close(position, reason);
    }
  }

  function fastForward(): void {
    accelerations.value = [...accelerations.value, now()];
    for (let i = 0; i < FAST_FORWARD_STEPS; i += 1) tick();
  }

  function setDrift(value: number): void {
    drift = value;
  }

  function place(): SimFill | null {
    if (amount.value <= 0 || amount.value > available.value || mark.value <= 0) return null;
    seq += 1;
    const { position, fill } = openSim(
      {
        symbol: symbol.value,
        product: product.value,
        side: side.value,
        amount: amount.value,
        leverage: leverage.value,
        liquidity: liquidity.value,
        takeProfit: takeProfit.value,
        stopLoss: stopLoss.value,
      },
      mark.value,
      book.value,
      now(),
      `sim-${String(seq)}`,
    );
    cash.value -= position.fee;
    positions.value = [...positions.value, position];
    fills.value = [...fills.value, fill];
    return fill;
  }

  function close(position: SimPosition, reason: SimClosed["reason"] = "manual"): void {
    const result = closeSim(position, mark.value, reason, now());
    cash.value += result.pnl - result.fee;
    positions.value = positions.value.filter((p) => p.id !== position.id);
    closed.value = [...closed.value, result];
  }

  function reset(): void {
    cash.value = SIM_STARTING_EQUITY;
    positions.value = [];
    fills.value = [];
    closed.value = [];
    accelerations.value = [];
    amount.value = 0;
    leverage.value = 1;
    takeProfit.value = null;
    stopLoss.value = null;
    limitPrice.value = null;
    drift = 0;
  }

  return {
    markets,
    candles,
    book,
    symbol,
    mark,
    loading,
    product,
    orderKind,
    side,
    liquidity,
    amount,
    leverage,
    takeProfit,
    stopLoss,
    limitPrice,
    chartMode,
    positions,
    fills,
    closed,
    equity,
    available,
    snapshot,
    load,
    selectMarket,
    tick,
    fastForward,
    setDrift,
    place,
    close,
    reset,
  };
}
