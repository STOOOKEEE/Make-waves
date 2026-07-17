<script setup lang="ts">
// Terminal de trading — porté depuis design_site/dashboard.html.
// Bento 3 colonnes : watchlist, chart + positions, ticket + carnet d'ordres.
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { BookDepth, Candle, TideClient } from "@tide/client";
import { positionPnl as corePositionPnl, reservedMargin } from "@tide/core";
import type { MarketOrderInput, Position } from "@tide/core";
import { MARKETS, fmtNum, type Market } from "../data/markets";
import { usePaper } from "../composables/usePaper";
import { useWallet } from "../composables/useWallet";
import { useSession } from "../composables/useSession";
import { useI18n } from "../i18n/useI18n";
import LearnHint from "../components/learn/LearnHint.vue";

const props = defineProps<{ client: TideClient }>();

const { t } = useI18n({
  en: {
    markets: "Markets",
    searchPlaceholder: "Search…",
    noMarket: "No market",
    high24h: "24h High",
    low24h: "24h Low",
    chartSource: "Chart source",
    liveFeed: "Live feed",
    priceFeed: "Price feed",
    chartUnavailable: "Real chart unavailable",
    priceAxisZoom: "Drag to zoom the price scale",
    candles: "Candles",
    candlesUnavailable: "Candles unavailable for price-only history",
    line: "Line",
    positionsTab: "Positions",
    openOrdersTab: "Orders",
    historyTab: "History",
    market: "Market",
    side: "Side",
    entryToMarket: "Entry → Market",
    close: "Close",
    closed: "Closed",
    noPositions: "No open position",
    noOrders: "No pending order",
    noTrades: "No trades yet",
    buy: "Buy",
    sell: "Sell",
    amount: "Amount",
    available: "Avail.",
    estQty: "Est. quantity",
    estFees: "Est. fees",
    product: "Product",
    spot: "Spot",
    perp: "Perp",
    orderType: "Order",
    marketOrder: "Market",
    limitOrder: "Limit",
    execution: "Execution",
    maker: "Maker",
    taker: "Taker",
    limitPrice: "Limit price",
    leverage: "Leverage",
    takeProfit: "TP",
    stopLoss: "SL",
    hintProduct: "Spot vs perp — what's the difference?",
    hintOrder: "Market vs limit orders",
    hintExecution: "Maker vs taker & fees",
    hintLeverage: "How leverage & margin work",
    hintRisk: "Take-profit & stop-loss explained",
    margin: "Margin",
    liqApprox: "Liq. approx",
    cancel: "Cancel",
    buyAsset: "Buy {asset}",
    sellAsset: "Sell {asset}",
    longAsset: "Long {asset}",
    shortAsset: "Short {asset}",
    orderSent: "✓ Paper order sent",
    orderQueued: "✓ Limit order queued",
    orderNoAmount: "Enter an amount",
    orderInsufficient: "Insufficient balance",
    orderFailed: "Order rejected",
    orderBook: "Order book",
    bookLive: "Binance live",
    bookLoading: "Loading...",
    bookUnavailable: "No central order book source",
    price: "Price",
    size: "Size",
    total: "Total",
    modePaper: "Paper",
    modeLive: "Live",
    liveXrpOnly: "Live: XRP only",
    liveNotConfigured: "Live not configured",
    virtualBalance: "Virtual balance",
    testnetWallet: "Testnet wallet",
    firstTradeNft: "First Trade NFT",
    paperSession: "Paper session",
    realBadge: "REAL FUNDS",
    connectToTrade: "Connect wallet",
    paperHint: "Simulated — no real funds",
    liveHint: "Real swap on XRPL, signed in your wallet",
  },
  fr: {
    markets: "Marchés",
    searchPlaceholder: "Rechercher…",
    noMarket: "Aucun marché",
    high24h: "Haut 24h",
    low24h: "Bas 24h",
    chartSource: "Source graphique",
    liveFeed: "Flux live",
    priceFeed: "Flux prix",
    chartUnavailable: "Graphique réel indisponible",
    priceAxisZoom: "Glisser pour zoomer l'échelle des prix",
    candles: "Chandeliers",
    candlesUnavailable: "Chandeliers indisponibles pour un historique de prix",
    line: "Ligne",
    positionsTab: "Positions",
    openOrdersTab: "Ordres",
    historyTab: "Historique",
    market: "Marché",
    side: "Sens",
    entryToMarket: "Entrée → Marché",
    close: "Fermer",
    closed: "Fermée",
    noPositions: "Aucune position ouverte",
    noOrders: "Aucun ordre en attente",
    noTrades: "Aucun trade pour l'instant",
    buy: "Acheter",
    sell: "Vendre",
    amount: "Montant",
    available: "Dispo.",
    estQty: "Quantité estimée",
    estFees: "Frais estimés",
    product: "Produit",
    spot: "Spot",
    perp: "Perp",
    orderType: "Ordre",
    marketOrder: "Marché",
    limitOrder: "Limit",
    execution: "Exécution",
    maker: "Maker",
    taker: "Taker",
    limitPrice: "Prix limite",
    leverage: "Levier",
    takeProfit: "TP",
    stopLoss: "SL",
    hintProduct: "Spot vs perp — quelle différence ?",
    hintOrder: "Ordres market vs limit",
    hintExecution: "Maker vs taker & frais",
    hintLeverage: "Comment marchent levier & marge",
    hintRisk: "Take-profit & stop-loss expliqués",
    margin: "Marge",
    liqApprox: "Liq. approx",
    cancel: "Annuler",
    buyAsset: "Acheter {asset}",
    sellAsset: "Vendre {asset}",
    longAsset: "Long {asset}",
    shortAsset: "Short {asset}",
    orderSent: "✓ Ordre simulé envoyé",
    orderQueued: "✓ Ordre limit placé",
    orderNoAmount: "Saisis un montant",
    orderInsufficient: "Solde insuffisant",
    orderFailed: "Ordre refusé",
    orderBook: "Carnet d'ordres",
    bookLive: "Flux Binance réel",
    bookLoading: "Chargement...",
    bookUnavailable: "Aucun carnet central disponible",
    price: "Prix",
    size: "Taille",
    total: "Total",
    modePaper: "Paper",
    modeLive: "Live",
    liveXrpOnly: "Live : XRP uniquement",
    liveNotConfigured: "Live non configuré",
    virtualBalance: "Solde virtuel",
    testnetWallet: "Wallet Testnet",
    firstTradeNft: "NFT First Trade",
    paperSession: "Session Paper",
    realBadge: "ARGENT RÉEL",
    connectToTrade: "Connecter le wallet",
    paperHint: "Simulé — aucun fonds réel",
    liveHint: "Swap réel sur XRPL, signé dans ton wallet",
  },
});

// ---------- backend paper (best-effort, ne bloque jamais l'UX) ----------
const paper = usePaper(props.client);
const wallet = useWallet(props.client);
const session = useSession();

// Mode d'exécution : Paper (simulé) ou Live (swap réel XRPL signé Xaman/GemWallet).
const mode = ref<"paper" | "live">("paper");

// Mode Live : seul XRP est un actif XRPL réel, tradé contre le quote configuré
// côté serveur (RLUSD). Tolérance de slippage du swap (le serveur borne l'ordre).
const LIVE_SLIPPAGE = 0.01; // 1 %
// Symbole du quote Live exposé par le serveur (null ⇒ Live non configuré). Le
// front n'a plus besoin de l'issuer : tout l'OfferCreate est calculé côté serveur.
const liveQuoteSymbol = ref<string | null>(null);

function liveConfigured(): boolean {
  return liveQuoteSymbol.value !== null;
}

function liveTradable(): boolean {
  return cur.value.s === "XRP" && liveConfigured();
}

// Bascule de mode. Passer en Live SANS wallet connecté ouvre directement la
// connexion (Xaman/GemWallet) puis bascule une fois résolue — jamais de cul-de-sac.
const pendingLive = ref(false);
function setMode(m: "paper" | "live"): void {
  if (m === "paper") {
    mode.value = "paper";
    pendingLive.value = false;
    return;
  }
  if (!liveConfigured()) {
    return; // Live non configuré côté serveur → segment inerte (cf. template)
  }
  if (session.walletConnected.value) {
    mode.value = "live";
  } else {
    pendingLive.value = true;
    wallet.connect();
  }
}
// La connexion réussie (depuis la barre OU le header) confirme l'intention Live.
watch(session.walletConnected, (connectedNow) => {
  if (connectedNow && pendingLive.value) {
    mode.value = "live";
    pendingLive.value = false;
  }
  void reloadPaperIdentity();
});

/** Adresse XRPL raccourcie pour l'affichage (rXXXX…abcd). */
function shorten(addr: string): string {
  return addr.length > 12 ? addr.slice(0, 6) + "…" + addr.slice(-4) : addr;
}
function paperIdentityLabel(): string {
  const reward = paper.walletReward.value;
  if (reward?.walletAddress === null || reward?.walletAddress === undefined) {
    const id = paper.userId.value.replace(/^paper:/, "");
    return id === "" ? "" : `${t("paperSession")} ${shorten(id)}`;
  }
  const nft = reward.rewardStatus === "claimed" ? "✓" : "…";
  return `${t("testnetWallet")} ${shorten(reward.walletAddress)} · ${t("firstTradeNft")} ${nft}`;
}
/** Nom lisible du wallet connecté. */
function walletKind(): string {
  return session.walletType.value === "gem" ? "GemWallet" : "Xaman";
}

// ---------- état réactif (équivalent du <script> source) ----------
// Devise de référence du moteur paper (les comptes sont fondés en RLUSD).
const REFERENCE_QUOTE = "RLUSD";

// Watchlist réactive : part du catalogue mock, enrichie des prix réels du backend.
const markets = ref<Market[]>([...MARKETS]);
const [FIRST_MARKET] = MARKETS;
if (!FIRST_MARKET) {
  throw new Error("MARKETS ne doit jamais être vide");
}
const cur = ref<Market>(FIRST_MARKET);
const side = ref<"buy" | "sell">("buy");
const amount = ref(5000);
const product = ref<"spot" | "perp">("spot");
const orderKind = ref<"market" | "limit">("market");
const liquidity = ref<"taker" | "maker">("taker");
const leverage = ref(5);
const limitPrice = ref("");
const takeProfit = ref("");
const stopLoss = ref("");
const activeBlotter = ref<"positions" | "orders" | "history">("positions");

const PAPER_MAKER_FEE = 0.0002;
const PAPER_TAKER_FEE = 0.0006;
const PAPER_STATE_KEY_PREFIX = "tide.paperTerminal";

// Position d'affichage = position financière du domaine (@tide/core) + métadonnées
// de trigger locales (cf. PositionMeta, défini plus bas).
type PaperPosition = Position & PositionMeta;

interface PaperPendingOrder {
  readonly id: string;
  readonly product: "spot" | "perp";
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly orderKind: "limit";
  readonly liquidity: "maker" | "taker";
  readonly qty: number;
  readonly price: number;
  readonly margin: number;
  readonly leverage: number;
  readonly takeProfit?: number;
  readonly stopLoss?: number;
  readonly createdAt: number;
}

interface PaperTrade {
  readonly id: string;
  readonly product: "spot" | "perp";
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly qty: number;
  readonly price: number;
  readonly fee: number;
  readonly pnl: number;
  readonly reason: "market" | "limit" | "tp" | "sl" | "close";
  readonly at: number;
}

// Le backend est la source de vérité financière des positions (qty/entry/marge/PnL).
// Il ne modélise PAS les déclencheurs : TP/SL et l'horodatage d'ouverture vivent
// côté front, indexés par id de position backend, et pilotent `evaluatePaperTriggers`.
interface PositionMeta {
  readonly takeProfit?: number;
  readonly stopLoss?: number;
  readonly openedAt: number;
}

interface SavedPaperTerminal {
  readonly positionMeta?: Record<string, PositionMeta>;
  readonly pendingOrders?: PaperPendingOrder[];
  readonly trades?: PaperTrade[];
}

const paperPositions = ref<PaperPosition[]>([]);
const pendingOrders = ref<PaperPendingOrder[]>([]);
const tradeHistory = ref<PaperTrade[]>([]);
const positionMeta = ref<Record<string, PositionMeta>>({});
// Positions en cours de fermeture : garde anti double-déclenchement pendant l'appel
// réseau (TP/SL et fermeture manuelle pourraient sinon fermer deux fois la même).
const closingPositions = new Set<string>();

// Recherche de la watchlist : filtre par symbole ou nom (insensible à la casse).
const search = ref("");
const filteredMarkets = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (q === "") {
    return markets.value;
  }
  return markets.value.filter(
    (m) => m.s.toLowerCase().includes(q) || m.full.toLowerCase().includes(q),
  );
});

// Requête historique par bouton. `1D` est une fenêtre 24h, pas une bougie daily :
// sinon un token récent comme RAIN affiche une échelle historique hors sujet.
const TF_QUERY: Readonly<Record<string, { interval: string; limit: number }>> = {
  "5m": { interval: "5m", limit: 120 },
  "15m": { interval: "15m", limit: 120 },
  "1H": { interval: "1h", limit: 120 },
  "4H": { interval: "4h", limit: 120 },
  "1D": { interval: "5m", limit: 288 },
};
const TF_LIST = ["5m", "15m", "1H", "4H", "1D"] as const;
const tf = ref<string>("1D");
const chartType = ref<"candles" | "line">("candles");
// Échelle des prix interactive : zoom (glissement sur l'axe) + déplacement vertical
// (pan, glissement sur la zone du graphe). `priceOffset` = décalage en fraction du range.
const priceZoom = ref(1);
const priceOffset = ref(0);
const MIN_PRICE_ZOOM = 0.25;
const MAX_PRICE_ZOOM = 8;
// Navigation horizontale : `visibleCount` = nombre de bougies affichées (molette pour
// zoomer), `hOffset` = décalage en bougies vers le passé (0 = les plus récentes). On
// n'affiche par défaut qu'une fraction des bougies chargées → il reste de quoi faire
// défiler horizontalement dès le départ (réglé au chargement de l'historique).
const MIN_VISIBLE_CANDLES = 12;
const VISIBLE_FRACTION = 0.72;
const visibleCount = ref(0);
const hOffset = ref(0);
const INTERVAL_MS: Readonly<Record<string, number>> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

// Historique marché chargé depuis le backend. Si vide, on n'affiche pas de faux chart.
const realCandles = ref<Candle[]>([]);
const historyMode = ref<"ohlc" | "price" | "unavailable">("unavailable");

// Stats 24h FIXES (variation / haut / bas) — indépendantes de la taille de bougie
// du chart. Calculées sur les 24 dernières bougies 1h (= 24h), pas sur la fenêtre
// affichée (sinon elles varieraient d'un timeframe à l'autre).
const stats24h = ref<{ change: number; high: number; low: number } | null>(null);
const stat24High = computed(() => stats24h.value?.high ?? cur.value.hi);
const stat24Low = computed(() => stats24h.value?.low ?? cur.value.lo);
const stat24Change = computed(() => stats24h.value?.change ?? cur.value.c);
const chartSourceLabel = computed(() => {
  const source = realCandles.value[0]?.source;
  if (source !== undefined) {
    return source;
  }
  return historyMode.value === "price" ? t("priceFeed") : t("chartUnavailable");
});

// Prix réels du feed off-chain (devise → prix). Détermine ce que le backend peut
// réellement coter : seuls ces actifs donnent lieu à un ordre paper effectif.
const livePrices = ref<Record<string, number>>({});

// Index du raccourci % actif (-1 = aucun).
const pctIdx = ref(-1);

// Markup SVG injecté via v-html (chart + carnet).
const chartHtml = ref("");
const book = ref<BookDepth | null>(null);
const bookStatus = ref<"idle" | "loading" | "ready" | "error">("idle");
const bookError = ref<string | null>(null);
let bookRequestSeq = 0;
const BOOK_REFRESH_MS = 1_500;
const HISTORY_REFRESH_MS = 30_000;
let bookRefreshTimer: ReturnType<typeof setInterval> | null = null;
let historyRefreshTimer: ReturnType<typeof setInterval> | null = null;
let historyRequestSeq = 0;
let statsRequestSeq = 0;
let lastPriceMove:
  | { symbol: string; low: number; high: number; close: number; at: number }
  | null = null;
const askRows = computed(() => book.value?.asks.slice().reverse() ?? []);
const askMaxTotal = computed(() => book.value?.asks[book.value.asks.length - 1]?.total ?? 0);
const bidMaxTotal = computed(() => book.value?.bids[book.value.bids.length - 1]?.total ?? 0);

// Réf du <svg> du chart pour staggerer le fade-in des bougies.
const chartSvg = ref<SVGSVGElement | null>(null);

// ---------- helpers ----------
const fmt = fmtNum;

function newId(prefix: string): string {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function parsePositive(raw: string): number | undefined {
  const n = Number(raw.replace(/,/g, "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Ne conserve un TP/SL que s'il est du BON côté du prix d'entrée. Un niveau du
// mauvais côté (ex. SL au-dessus du prix pour un long, ou une valeur sans rapport
// avec l'échelle de l'actif) fermerait la position dès le premier tick — on
// l'ignore plutôt que de le déclencher à tort.
function coherentTpSl(
  side: "buy" | "sell",
  entry: number,
  tp: number | undefined,
  sl: number | undefined,
): { tp: number | undefined; sl: number | undefined } {
  const long = side === "buy";
  return {
    tp: tp !== undefined && (long ? tp > entry : tp < entry) ? tp : undefined,
    sl: sl !== undefined && (long ? sl < entry : sl > entry) ? sl : undefined,
  };
}

function paperFeeRate(): number {
  return liquidity.value === "maker" ? PAPER_MAKER_FEE : PAPER_TAKER_FEE;
}

function notional(): number {
  return product.value === "perp" ? amount.value * leverage.value : amount.value;
}

/** Sparkline inline pour une ligne de la watchlist. */
function spark(up: boolean): string {
  const d = up
    ? "M0,18 L10,15 L20,16 L30,10 L40,12 L50,5 L60,2"
    : "M0,4 L10,7 L20,5 L30,11 L40,9 L50,15 L60,17";
  return `<svg viewBox="0 0 60 22" preserveAspectRatio="none" style="width:56px;height:22px"><path d="${d}" fill="none" stroke="${up ? "var(--up)" : "var(--down)"}" stroke-width="1.6"/></svg>`;
}

/** Libellé d'axe temporel : heure (intraday) ou date selon l'intervalle. */
function fmtAxisDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const interval = TF_QUERY[tf.value]?.interval;
  const intraday =
    interval === "5m" || interval === "15m" || interval === "1h" || interval === "4h";
  if (intraday) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mo} ${hh}:${mi}`;
  }
  return `${dd}/${mo}`;
}

interface ChartCandle {
  o: number;
  c: number;
  hi: number;
  lo: number;
  t?: number;
}

/** Bougies à tracer (mémoïsé) : uniquement des données réelles fournies par le backend. */
const chartCandles = computed<ChartCandle[]>(() =>
  realCandles.value.map((k) => ({ o: k.o, c: k.c, hi: k.h, lo: k.l, t: k.t })),
);

// Nombre de bougies réellement affichables (borné par les données chargées).
function visibleSpan(): number {
  const total = chartCandles.value.length;
  return Math.max(MIN_VISIBLE_CANDLES, Math.min(total, Math.round(visibleCount.value)));
}

function visibleChartCandles(): ChartCandle[] {
  const all = chartCandles.value;
  if (all.length === 0) {
    return all;
  }
  const count = visibleSpan();
  const maxStart = all.length - count;
  const start = Math.max(0, Math.min(maxStart, maxStart - Math.round(hOffset.value)));
  return all.slice(start, start + count);
}

function setVisibleCount(next: number): void {
  const total = chartCandles.value.length;
  visibleCount.value = Math.max(MIN_VISIBLE_CANDLES, Math.min(total, next));
  renderChart(false);
}

// Molette sur le graphe : zoom horizontal (moins de bougies = zoom in).
function onChartWheel(event: WheelEvent): void {
  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  setVisibleCount(Math.round(visibleCount.value * (delta < 0 ? 1 / 1.15 : 1.15)));
}

function setPriceZoom(next: number): void {
  priceZoom.value = Math.min(MAX_PRICE_ZOOM, Math.max(MIN_PRICE_ZOOM, next));
  renderChart(false);
}

// Réinitialise l'échelle des prix : zoom auto + recentrage vertical (double-clic).
function resetPriceView(): void {
  priceZoom.value = 1;
  priceOffset.value = 0;
  visibleCount.value = Math.round(chartCandles.value.length * VISIBLE_FRACTION);
  hOffset.value = 0;
  renderChart(false);
}

// Démarre un glissement : enregistre les listeners window le temps du geste et les
// retire au relâchement. `cancelDrag` coupe un drag encore actif (démontage, double down).
let cancelDrag: (() => void) | null = null;

function startDrag(onMove: (event: MouseEvent) => void): void {
  cancelDrag?.();
  function onUp(): void {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    cancelDrag = null;
  }
  cancelDrag = onUp;
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

// Glissement vertical sur l'axe des prix : monter resserre l'échelle (zoom in),
// descendre l'élargit (zoom out).
let priceDragStartY = 0;
let priceDragStartZoom = 1;

function onPriceAxisMove(event: MouseEvent): void {
  const delta = priceDragStartY - event.clientY; // pixels parcourus vers le haut
  setPriceZoom(priceDragStartZoom * Math.pow(1.006, delta));
}

function onPriceAxisDown(event: MouseEvent): void {
  event.preventDefault();
  priceDragStartY = event.clientY;
  priceDragStartZoom = priceZoom.value;
  startDrag(onPriceAxisMove);
}

// Déplacement de la courbe (glissement sur la zone du graphe) : décale la fenêtre
// de prix verticalement (fraction du range) ET temporellement (nombre de bougies).
let panStartX = 0;
let panStartY = 0;
let panStartOffset = 0;
let panStartHOffset = 0;

function onChartPanMove(event: MouseEvent): void {
  const svg = chartSvg.value;
  const height = svg?.clientHeight ?? 400;
  const width = svg?.clientWidth ?? 820;
  // Vertical : décalage en fraction de la hauteur.
  priceOffset.value = panStartOffset + (event.clientY - panStartY) / height;
  // Horizontal : décalage en bougies (drag vers la droite = remonter le passé).
  const count = visibleSpan();
  const candlePx = width / Math.max(1, count);
  const maxOffset = Math.max(0, chartCandles.value.length - count);
  const maxRight = Math.floor(count * 0.5); // espace libre autorisé à droite (en bougies)
  hOffset.value = Math.min(
    maxOffset,
    Math.max(-maxRight, panStartHOffset + (event.clientX - panStartX) / candlePx),
  );
  renderChart(false);
}

function onChartPanDown(event: MouseEvent): void {
  event.preventDefault();
  panStartX = event.clientX;
  panStartY = event.clientY;
  panStartOffset = priceOffset.value;
  panStartHOffset = hOffset.value;
  startDrag(onChartPanMove);
}

interface ChartTimeLabel {
  readonly key: string;
  readonly text: string;
  readonly left: number;
  readonly anchor: "start" | "middle" | "end";
}

const chartTimeLabels = computed<ChartTimeLabel[]>(() => {
  const candles = visibleChartCandles();
  const n = candles.length;
  if (n === 0) {
    return [];
  }
  // Même nombre de slots que le rendu SVG (espace à droite inclus) pour rester aligné.
  const rightPad = Math.max(0, -Math.round(hOffset.value));
  const cw = 100 / (n + rightPad);
  const labelCount = 5;
  const labels: ChartTimeLabel[] = [];
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (n - 1));
    const k = candles[idx];
    if (k === undefined || k.t === undefined) {
      continue;
    }
    labels.push({
      key: `${String(idx)}:${String(k.t)}`,
      text: fmtAxisDate(k.t),
      left: Math.min(100, Math.max(0, idx * cw + cw / 2)),
      anchor: i === 0 ? "start" : i === labelCount - 1 ? "end" : "middle",
    });
  }
  return labels;
});

function axisLabelTransform(anchor: ChartTimeLabel["anchor"]): string {
  if (anchor === "start") {
    return "none";
  }
  return anchor === "end" ? "translateX(-100%)" : "translateX(-50%)";
}

function axisLabelAlign(anchor: ChartTimeLabel["anchor"]): "left" | "center" | "right" {
  if (anchor === "start") {
    return "left";
  }
  return anchor === "end" ? "right" : "center";
}

// Décimales de l'axe des prix adaptées au range visible : plus on zoome (range
// petit), plus on affiche de décimales pour distinguer des niveaux rapprochés.
function priceDecimals(range: number): number {
  if (!(range > 0)) {
    return 2;
  }
  return Math.min(8, Math.max(2, Math.ceil(-Math.log10(range / 50))));
}

// ---------- chart ----------
function renderChart(animate = true): void {
  const W = 820;
  const H = 400;
  const pad = 46;
  const m = cur.value;
  const candles = visibleChartCandles();
  const n = candles.length;
  if (n === 0) {
    chartHtml.value =
      `<line x1="0" y1="${H / 2}" x2="${W - pad}" y2="${H / 2}" stroke="var(--line)" stroke-width="1"/>` +
      `<text class="axis" x="${(W - pad) / 2}" y="${H / 2 - 10}" text-anchor="middle">${t("chartUnavailable")}</text>` +
      `<rect x="${W - pad}" y="${H / 2 - 9}" width="${pad}" height="18" fill="var(--blue)" rx="3"/>` +
      `<text class="axis" x="${W - pad + 5}" y="${H / 2 + 3}" fill="#fff" style="font-weight:700">${fmt(m.p)}</text>`;
    return;
  }
  let mx = -1e9;
  let mn = 1e9;
  candles.forEach((k) => {
    mx = Math.max(mx, k.hi);
    mn = Math.min(mn, k.lo);
  });
  // Marge verticale (8 %) autour de la plage : sinon les bougies collent aux bords
  // et le tracé paraît « trop zoomé ». Garde-fou si la plage est nulle (prix plats).
  const range = mx - mn || mx * 0.02 || 1;
  const padY = range * 0.08;
  mn -= padY;
  mx += padY;
  // Zoom vertical : resserre (zoom in) ou élargit (zoom out) la plage de prix
  // autour de son centre, sans changer le nombre de bougies affichées.
  const center = (mn + mx) / 2;
  const half = (mx - mn) / 2 / priceZoom.value;
  mn = center - half;
  mx = center + half;
  // Déplacement vertical (pan) : décale la fenêtre de prix d'une fraction du range.
  const shift = (mx - mn) * priceOffset.value;
  mn += shift;
  mx += shift;
  const decimals = priceDecimals(mx - mn);
  const Y = (v: number): number => pad + ((mx - v) / (mx - mn)) * (H - pad * 2);
  // Espace libre à droite (déplacement de la courbe vers la gauche) : hOffset < 0.
  const rightPad = Math.max(0, -Math.round(hOffset.value));
  const slots = n + rightPad;
  const cw = (W - pad - 12) / slots;
  const bw = cw * 0.62;
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const y = pad + (i * (H - pad * 2)) / 4;
    const v = mx - ((mx - mn) * i) / 4;
    g += `<line class="gridln" x1="0" y1="${y}" x2="${W - pad}" y2="${y}"/><text class="axis" x="${W - pad + 6}" y="${y + 3}">${v.toFixed(decimals)}</text>`;
  }
  const startX = 8;
  const cx = (i: number): number => startX + i * cw + cw / 2;
  const effectiveChartType = historyMode.value === "price" ? "line" : chartType.value;
  if (effectiveChartType === "line") {
    // Vue en ligne : polyligne des clôtures + aire dégradée.
    const d = candles.map((k, i) => `${cx(i)},${Y(k.c)}`).join(" L");
    g += `<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BFF6CE" stop-opacity=".22"/><stop offset="100%" stop-color="#BFF6CE" stop-opacity="0"/></linearGradient></defs>`;
    g += `<path fill="url(#lg)" d="M${d} L${cx(n - 1)},${H} L${cx(0)},${H} Z"/>`;
    g += `<path fill="none" stroke="#BFF6CE" stroke-width="2" d="M${d}"/>`;
  } else {
    candles.forEach((k, i) => {
      const x = cx(i);
      const up = k.c >= k.o;
      const col = up ? "var(--up)" : "var(--down)";
      const yb = Y(Math.max(k.o, k.c));
      const yt = Y(Math.min(k.o, k.c));
      g += `<line class="candle" x1="${x}" y1="${Y(k.hi)}" x2="${x}" y2="${Y(k.lo)}" stroke="${col}" stroke-width="1"/>`;
      g += `<rect class="candle" x="${x - bw / 2}" y="${yb}" width="${bw}" height="${Math.max(1, yt - yb)}" fill="${col}" rx="1"/>`;
    });
  }
  const ly = Y(m.p);
  g += `<line x1="0" y1="${ly}" x2="${W - pad}" y2="${ly}" stroke="var(--blue)" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/>`;
  g += `<rect x="${W - pad}" y="${ly - 9}" width="${pad}" height="18" fill="var(--blue)" rx="3"/><text class="axis" x="${W - pad + 5}" y="${ly + 3}" fill="#fff" style="font-weight:700">${m.p.toFixed(decimals)}</text>`;
  const labelCount = 5;
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (n - 1));
    const k = candles[idx];
    if (k === undefined || k.t === undefined) {
      continue;
    }
    const anchor = i === 0 ? "start" : i === labelCount - 1 ? "end" : "middle";
    g += `<text class="timeaxis" x="${cx(idx)}" y="${H - 12}" text-anchor="${anchor}">${fmtAxisDate(k.t)}</text>`;
  }
  chartHtml.value = g;
  if (!animate) {
    return;
  }
  // Stagger du fade-in après que le DOM ait reçu le innerHTML.
  requestAnimationFrame(() => {
    const svg = chartSvg.value;
    if (!svg) return;
    svg.querySelectorAll<SVGElement>(".candle").forEach((el, i) => {
      el.style.opacity = "0";
      setTimeout(() => {
        el.style.opacity = "1";
      }, i * 7);
    });
  });
}

function onResizeChart(): void {
  renderChart(false);
}

function bookPairLabel(): string {
  return book.value !== null
    ? `${book.value.symbol}/${book.value.quoteSymbol}`
    : `${cur.value.s}/USDT`;
}

function bookSourceLabel(): string {
  if (bookStatus.value === "loading") {
    return t("bookLoading");
  }
  if (bookStatus.value === "error") {
    return bookError.value ?? t("bookUnavailable");
  }
  return book.value !== null
    ? `${book.value.source} live · ${bookPairLabel()}`
    : `${t("bookLive")} · ${bookPairLabel()}`;
}

function rowWidth(total: number, max: number): string {
  if (max <= 0) {
    return "0%";
  }
  return `${Math.max(0, Math.min(100, (total / max) * 100))}%`;
}

function fmtBookSize(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
  if (value >= 1) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  }
  if (value >= 0.01) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtBookPrice(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
  if (value >= 100) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}

function fmtSpread(spread: number): string {
  const bps = spread * 10_000;
  return `${bps.toFixed(bps < 10 ? 2 : 1)} bp`;
}

async function loadBook(silent = false): Promise<void> {
  const seq = ++bookRequestSeq;
  if (!silent || book.value === null) {
    bookStatus.value = "loading";
  }
  if (!silent) {
    book.value = null;
  }
  bookError.value = null;
  try {
    const depth = await props.client.bookDepth(cur.value.s, 8);
    if (seq !== bookRequestSeq) {
      return;
    }
    book.value = depth;
    bookStatus.value = "ready";
    if (depth.symbol === cur.value.s) {
      updateLiveCandle(depth.mid);
    }
  } catch {
    if (seq !== bookRequestSeq) {
      return;
    }
    book.value = null;
    bookStatus.value = "error";
    bookError.value = t("bookUnavailable");
  }
}

function startBookRefresh(): void {
  if (bookRefreshTimer !== null) {
    clearInterval(bookRefreshTimer);
  }
  bookRefreshTimer = setInterval(() => {
    if (document.visibilityState === "visible") {
      void loadBook(true);
    }
  }, BOOK_REFRESH_MS);
}

function startHistoryRefresh(): void {
  if (historyRefreshTimer !== null) {
    clearInterval(historyRefreshTimer);
  }
  historyRefreshTimer = setInterval(() => {
    if (document.visibilityState === "visible") {
      void loadHistory(false); // refresh : ajoute/maj les bougies sans recadrer la vue
      void loadStats24h();
    }
  }, HISTORY_REFRESH_MS);
}

// ---------- sélection de marché ----------
function selectMarket(m: Market): void {
  cur.value = m;
}

// ---------- timeframe du chart ----------
const tfOptions = TF_LIST.map((v) => ({ v, l: v }));
function setTf(value: string): void {
  tf.value = value;
  void loadHistory();
}
function setChartType(value: "candles" | "line"): void {
  if (value === "candles" && historyMode.value === "price") {
    return;
  }
  chartType.value = value;
  renderChart();
}

function inferHistoryMode(candles: readonly Candle[]): "ohlc" | "price" | "unavailable" {
  const firstMode = candles[0]?.mode;
  if (firstMode === "ohlc" || firstMode === "price") {
    return firstMode;
  }
  if (candles.length === 0) {
    return "unavailable";
  }
  const flat = candles.filter((k) => k.o === k.h && k.h === k.l && k.l === k.c).length;
  return flat / candles.length > 0.8 ? "price" : "ohlc";
}

function syncSelectedPrice(candles: readonly Candle[]): void {
  const last = candles[candles.length - 1];
  if (last === undefined || !Number.isFinite(last.c) || last.c <= 0) {
    return;
  }
  const symbol = cur.value.s;
  cur.value.p = last.c;
  cur.value.hi = Math.max(cur.value.hi, last.h);
  cur.value.lo = Math.min(cur.value.lo, last.l);
  livePrices.value = { ...livePrices.value, [symbol]: last.c };
  evaluatePaperTriggers();
}

function activeIntervalMs(): number {
  const interval = TF_QUERY[tf.value]?.interval ?? "1h";
  return INTERVAL_MS[interval] ?? 60_000;
}

function updateLiveCandle(price: number, at = Date.now()): void {
  if (!Number.isFinite(price) || price <= 0 || realCandles.value.length === 0) {
    return;
  }
  const intervalMs = activeIntervalMs();
  const bucket = Math.floor(at / intervalMs) * intervalMs;
  const last = realCandles.value[realCandles.value.length - 1];
  if (last === undefined) {
    return;
  }
  const query = TF_QUERY[tf.value] ?? { interval: "1h", limit: 120 };
  const limit = query.limit;
  const source = last.source;
  const mode = last.mode;
  lastPriceMove = {
    symbol: cur.value.s,
    low: Math.min(last.c, price),
    high: Math.max(last.c, price),
    close: price,
    at,
  };
  if (bucket <= last.t) {
    const next = [...realCandles.value];
    next[next.length - 1] = {
      ...last,
      h: Math.max(last.h, price),
      l: Math.min(last.l, price),
      c: price,
    };
    realCandles.value = next;
  } else {
    realCandles.value = [
      ...realCandles.value,
      {
        t: bucket,
        o: last.c,
        h: Math.max(last.c, price),
        l: Math.min(last.c, price),
        c: price,
        source,
        mode,
      },
    ].slice(-limit);
  }
  cur.value.p = price;
  cur.value.hi = Math.max(cur.value.hi, price);
  cur.value.lo = Math.min(cur.value.lo, price);
  livePrices.value = { ...livePrices.value, [cur.value.s]: price };
  evaluatePaperTriggers();
  renderChart(false);
}

// Charge les vraies bougies (Binance) du marché/intervalle courant puis re-render.
async function loadHistory(resetView = true): Promise<void> {
  const symbol = cur.value.s;
  const query = TF_QUERY[tf.value] ?? { interval: "1h", limit: 120 };
  const requestId = ++historyRequestSeq;
  try {
    const candles = await props.client.history(symbol, query.interval, query.limit);
    if (requestId !== historyRequestSeq || symbol !== cur.value.s) {
      return;
    }
    realCandles.value = candles;
    historyMode.value = inferHistoryMode(realCandles.value);
    if (resetView) {
      // Changement d'actif/timeframe : on recadre (fenêtre par défaut). Un refresh
      // périodique préserve le zoom et le déplacement (sinon le graphe « se recrée »).
      visibleCount.value = Math.max(MIN_VISIBLE_CANDLES, Math.round(candles.length * VISIBLE_FRACTION));
      hOffset.value = 0;
    }
    syncSelectedPrice(candles);
  } catch {
    if (requestId !== historyRequestSeq || symbol !== cur.value.s) {
      return;
    }
    realCandles.value = [];
    historyMode.value = "unavailable";
  }
  renderChart(resetView);
}

// Stats 24h du marché courant (24 bougies 1h) — indépendantes du timeframe du chart.
async function loadStats24h(): Promise<void> {
  const symbol = cur.value.s;
  const requestId = ++statsRequestSeq;
  try {
    const candles = await props.client.history(symbol, "5m", 288);
    if (requestId !== statsRequestSeq || symbol !== cur.value.s) {
      return;
    }
    const first = candles[0];
    const last = candles[candles.length - 1];
    if (first === undefined || last === undefined || first.o <= 0) {
      stats24h.value = null;
      return;
    }
    stats24h.value = {
      high: Math.max(...candles.map((k) => k.h)),
      low: Math.min(...candles.map((k) => k.l)),
      change: ((last.c - first.o) / first.o) * 100,
    };
  } catch {
    if (requestId !== statsRequestSeq || symbol !== cur.value.s) {
      return;
    }
    stats24h.value = null;
  }
}

// Recharge l'historique + les stats 24h + re-render le carnet quand le marché change.
watch(cur, () => {
  // Nouvel actif : on repart en vue auto (le décalage horizontal et la fenêtre sont
  // réinitialisés dans loadHistory une fois les bougies connues).
  priceZoom.value = 1;
  priceOffset.value = 0;
  void loadHistory();
  void loadStats24h();
  void loadBook();
});

// ---------- ticket : valeurs dérivées (spot pur, sans levier) ----------
function estimatedQty(): number {
  return notional() / cur.value.p;
}
function estQtyLabel(): string {
  return estimatedQty().toFixed(cur.value.p < 1 ? 0 : 2) + " " + cur.value.s;
}
function estFeeValue(): number {
  return notional() * paperFeeRate();
}
function estMarginLabel(): string {
  return "$" + fmt(product.value === "perp" ? amount.value : notional());
}
function reservedPaperCash(): number {
  // Marge des positions (règle du domaine) + marge des ordres limit en attente.
  const orderMargin = pendingOrders.value.reduce((sum, order) => sum + order.margin, 0);
  return reservedMargin(paperPositions.value) + orderMargin;
}
function availablePaperCash(): number {
  return Math.max(0, (paper.balances.value?.[REFERENCE_QUOTE] ?? 0) - reservedPaperCash());
}
function liquidationLabel(): string {
  if (product.value !== "perp") {
    return "—";
  }
  const dir = side.value === "buy" ? -1 : 1;
  const liq = cur.value.p * (1 + dir / leverage.value);
  return "$" + fmt(Math.max(0, liq));
}
/** Cash disponible réel du compte (devise de référence). */
function availLabel(): string {
  return "$" + fmt(availablePaperCash());
}

// ---------- handlers ticket ----------
function setSide(s: "buy" | "sell"): void {
  side.value = s;
}
function setPct(i: number): void {
  pctIdx.value = i;
  const pct = [25, 50, 75, 100][i] ?? 100;
  const cash = availablePaperCash();
  amount.value = Math.round((cash * pct) / 100);
}
function onAmountInput(e: Event): void {
  const raw = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, "");
  amount.value = parseFloat(raw) || 0;
  pctIdx.value = -1;
}
function onLimitInput(e: Event): void {
  limitPrice.value = (e.target as HTMLInputElement).value.replace(/[^0-9.,]/g, "");
}
function onTpInput(e: Event): void {
  takeProfit.value = (e.target as HTMLInputElement).value.replace(/[^0-9.,]/g, "");
}
function onSlInput(e: Event): void {
  stopLoss.value = (e.target as HTMLInputElement).value.replace(/[^0-9.,]/g, "");
}

// Valeur affichée du champ montant (séparateurs de milliers).
function amountDisplay(): string {
  return amount.value.toLocaleString("en-US");
}

// ---------- positions / ordres / historique Paper ----------
interface PosRow {
  id: string;
  product: "spot" | "perp";
  symbol: string;
  pair: string;
  sideCls: "l" | "s";
  sideLabel: string;
  size: string;
  px: string;
  pnl: string;
  pnlCls: "up" | "down";
  closed: boolean;
}

interface PendingRow {
  id: string;
  pair: string;
  sideLabel: string;
  sideCls: "l" | "s";
  size: string;
  price: string;
  meta: string;
}

interface TradeRow {
  id: string;
  pair: string;
  sideLabel: string;
  sideCls: "l" | "s";
  size: string;
  price: string;
  pnl: string;
  pnlCls: "up" | "down";
}

function loadPaperTerminal(): void {
  // Un changement de session doit repartir d'un état local vide. Les positions
  // financières seront ensuite rechargées depuis SQLite via l'API.
  positionMeta.value = {};
  pendingOrders.value = [];
  tradeHistory.value = [];
  try {
    const raw = localStorage.getItem(paperTerminalKey());
    if (raw === null) {
      return;
    }
    const parsed = JSON.parse(raw) as SavedPaperTerminal;
    positionMeta.value = parsed.positionMeta ?? {};
    pendingOrders.value = parsed.pendingOrders ?? [];
    tradeHistory.value = parsed.trades ?? [];
  } catch {
    positionMeta.value = {};
    pendingOrders.value = [];
    tradeHistory.value = [];
  }
}

function savePaperTerminal(): void {
  try {
    localStorage.setItem(
      paperTerminalKey(),
      JSON.stringify({
        positionMeta: positionMeta.value,
        pendingOrders: pendingOrders.value,
        trades: tradeHistory.value.slice(0, 80),
      } satisfies SavedPaperTerminal),
    );
  } catch {
    // Stockage indisponible : l'état reste valable en mémoire.
  }
}

function paperTerminalKey(): string {
  const id = paper.userId.value.trim();
  return id === "" ? PAPER_STATE_KEY_PREFIX : `${PAPER_STATE_KEY_PREFIX}:${id}`;
}

/**
 * Recharge les positions depuis le backend (vérité financière) et les enrichit
 * des métadonnées de trigger locales (TP/SL/openedAt). Purge les métadonnées
 * orphelines (positions fermées côté serveur).
 */
async function refreshPositions(): Promise<void> {
  try {
    const backend = await props.client.positions(paper.userId.value);
    const liveIds = new Set(backend.map((p) => p.id));
    for (const id of Object.keys(positionMeta.value)) {
      if (!liveIds.has(id)) {
        delete positionMeta.value[id];
      }
    }
    paperPositions.value = backend.map((p) => {
      const meta = positionMeta.value[p.id];
      return {
        ...p,
        takeProfit: meta?.takeProfit,
        stopLoss: meta?.stopLoss,
        openedAt: meta?.openedAt ?? Date.now(),
      } satisfies PaperPosition;
    });
    savePaperTerminal();
  } catch {
    // Backend indisponible : on conserve l'affichage courant.
  }
}

function markPrice(symbol: string): number {
  return livePrices.value[symbol] ?? (symbol === cur.value.s ? cur.value.p : 0);
}

function positionPnl(p: PaperPosition): number {
  const mark = markPrice(p.symbol);
  // PnL net affiché : formule du domaine (@tide/core) moins les frais d'ouverture.
  return mark <= 0 ? 0 : corePositionPnl(p, mark) - p.fee;
}

function recordTrade(trade: PaperTrade): void {
  tradeHistory.value = [trade, ...tradeHistory.value].slice(0, 80);
}

function latestRangeFor(symbol: string): { low: number; high: number; close: number } | undefined {
  if (symbol !== cur.value.s) {
    const price = markPrice(symbol);
    return price > 0 ? { low: price, high: price, close: price } : undefined;
  }
  const last = realCandles.value[realCandles.value.length - 1];
  if (last === undefined) {
    const price = markPrice(symbol);
    return price > 0 ? { low: price, high: price, close: price } : undefined;
  }
  return { low: last.l, high: last.h, close: last.c };
}

function limitOrderTouched(order: PaperPendingOrder): boolean {
  const range = latestRangeFor(order.symbol);
  if (range === undefined) {
    return false;
  }
  const marketable =
    order.side === "buy" ? order.price >= range.close : order.price <= range.close;
  if (marketable) {
    return true;
  }
  if (
    lastPriceMove === null ||
    lastPriceMove.symbol !== order.symbol ||
    lastPriceMove.at < order.createdAt
  ) {
    return false;
  }
  return lastPriceMove.low <= order.price && order.price <= lastPriceMove.high;
}

function levelTouchedAfter(symbol: string, level: number, since: number): boolean {
  const price = markPrice(symbol);
  if (price === level) {
    return true;
  }
  if (
    lastPriceMove === null ||
    lastPriceMove.symbol !== symbol ||
    lastPriceMove.at < since
  ) {
    return false;
  }
  return lastPriceMove.low <= level && level <= lastPriceMove.high;
}

async function openPaperPosition(input: {
  product: "spot" | "perp";
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  margin: number;
  leverage: number;
  fee: number;
  takeProfit?: number;
  stopLoss?: number;
  reason: "market" | "limit";
}): Promise<boolean> {
  try {
    const position = await props.client.openPosition(paper.userId.value, {
      product: input.product,
      symbol: input.symbol,
      side: input.side === "buy" ? "long" : "short",
      qty: input.qty,
      entry: input.price,
      leverage: input.leverage,
      margin: input.margin,
      fee: input.fee,
    });
    positionMeta.value[position.id] = {
      takeProfit: input.takeProfit,
      stopLoss: input.stopLoss,
      openedAt: Date.now(),
    };
    recordTrade({
      id: newId("trade"),
      product: input.product,
      symbol: input.symbol,
      side: input.side,
      qty: input.qty,
      price: input.price,
      fee: input.fee,
      pnl: -input.fee,
      reason: input.reason,
      at: Date.now(),
    });
    await Promise.all([refreshPositions(), paper.refresh()]);
    return true;
  } catch {
    // Ouverture refusée par le backend (marge/frais > disponible, etc.).
    return false;
  }
}

async function closePaperPosition(
  pos: PaperPosition,
  reason: PaperTrade["reason"] = "close",
): Promise<void> {
  if (closingPositions.has(pos.id)) {
    return;
  }
  closingPositions.add(pos.id);
  try {
    const { realizedPnl } = await props.client.closePosition(paper.userId.value, pos.id);
    delete positionMeta.value[pos.id];
    const exitPrice = markPrice(pos.symbol);
    recordTrade({
      id: newId("trade"),
      product: pos.product,
      symbol: pos.symbol,
      side: pos.side === "long" ? "sell" : "buy",
      qty: pos.qty,
      price: exitPrice > 0 ? exitPrice : pos.entry,
      fee: pos.fee,
      pnl: realizedPnl, // PnL réalisé calculé au prix serveur (autoritatif).
      reason,
      at: Date.now(),
    });
    await Promise.all([refreshPositions(), paper.refresh()]);
  } catch {
    // Fermeture refusée (déjà fermée, prix manquant) : sans effet.
  } finally {
    closingPositions.delete(pos.id);
  }
}

function evaluatePaperTriggers(): void {
  const stillPending: PaperPendingOrder[] = [];
  for (const order of pendingOrders.value) {
    if (!limitOrderTouched(order)) {
      stillPending.push(order);
      continue;
    }
    void openPaperPosition({
      product: order.product,
      symbol: order.symbol,
      side: order.side,
      qty: order.qty,
      price: order.price,
      margin: order.margin,
      leverage: order.leverage,
      fee:
        order.margin *
        order.leverage *
        (order.liquidity === "maker" ? PAPER_MAKER_FEE : PAPER_TAKER_FEE),
      takeProfit: order.takeProfit,
      stopLoss: order.stopLoss,
      reason: "limit",
    });
  }
  pendingOrders.value = stillPending;

  for (const pos of [...paperPositions.value]) {
    const range = latestRangeFor(pos.symbol);
    if (range === undefined) {
      continue;
    }
    const close = range.close;
    const hitTp =
      pos.takeProfit !== undefined &&
      ((pos.side === "long" &&
        (close >= pos.takeProfit || levelTouchedAfter(pos.symbol, pos.takeProfit, pos.openedAt))) ||
        (pos.side === "short" &&
          (close <= pos.takeProfit || levelTouchedAfter(pos.symbol, pos.takeProfit, pos.openedAt))));
    const hitSl =
      pos.stopLoss !== undefined &&
      ((pos.side === "long" &&
        (close <= pos.stopLoss || levelTouchedAfter(pos.symbol, pos.stopLoss, pos.openedAt))) ||
        (pos.side === "short" &&
          (close >= pos.stopLoss || levelTouchedAfter(pos.symbol, pos.stopLoss, pos.openedAt))));
    if (hitTp) {
      void closePaperPosition(pos, "tp");
    } else if (hitSl) {
      void closePaperPosition(pos, "sl");
    }
  }
  savePaperTerminal();
}

const positions = computed<PosRow[]>(() => {
  const local = paperPositions.value.map((p) => {
    const mark = markPrice(p.symbol);
    const pnlValue = positionPnl(p);
    return {
      id: p.id,
      product: p.product,
      symbol: p.symbol,
      pair: `${p.symbol}/${REFERENCE_QUOTE}`,
      sideCls: p.side === "long" ? "l" : "s",
      sideLabel:
        `${p.product.toUpperCase()} ${p.side.toUpperCase()}` +
        (p.product === "perp" ? ` ${String(p.leverage)}x` : ""),
      size: fmt(p.qty),
      px: `$${fmt(p.entry)} → $${fmt(mark > 0 ? mark : p.entry)}`,
      pnl: (pnlValue >= 0 ? "+" : "") + "$" + fmt(pnlValue),
      pnlCls: pnlValue >= 0 ? "up" : "down",
      closed: false,
    } satisfies PosRow;
  });
  const bal = paper.balances.value;
  const backendSpot =
    bal === null
      ? []
      : Object.entries(bal)
        .filter(([ccy, amt]) => ccy !== REFERENCE_QUOTE && amt > 0)
        .filter(([ccy]) => !paperPositions.value.some((p) => p.product === "spot" && p.symbol === ccy))
        .map(([ccy, amt]) => {
          const price = livePrices.value[ccy];
          return {
            id: `backend:${ccy}`,
            product: "spot" as const,
            symbol: ccy,
            pair: `${ccy}/${REFERENCE_QUOTE}`,
            sideCls: "l" as const,
            sideLabel: "SPOT",
            size: fmt(amt),
            px: price !== undefined ? `$${fmt(price)}` : "—",
            pnl: price !== undefined ? "$" + fmt(amt * price) : "—",
            pnlCls: "up" as const,
            closed: false,
          };
        });
  return [...local, ...backendSpot];
});

const openOrderRows = computed<PendingRow[]>(() =>
  pendingOrders.value.map((row) => ({
    id: row.id,
    pair: `${row.symbol}/${REFERENCE_QUOTE}`,
    sideLabel: `${row.product.toUpperCase()} ${row.side.toUpperCase()}`,
    sideCls: row.side === "buy" ? "l" : "s",
    size: fmt(row.qty),
    price: "$" + fmt(row.price),
    meta: `${row.liquidity.toUpperCase()} · ${String(row.leverage)}x`,
  })),
);

const tradeRows = computed<TradeRow[]>(() =>
  tradeHistory.value.map((row) => ({
    id: row.id,
    pair: `${row.symbol}/${REFERENCE_QUOTE}`,
    sideLabel: `${row.product.toUpperCase()} ${row.side.toUpperCase()} · ${row.reason.toUpperCase()}`,
    sideCls: row.side === "buy" ? "l" : "s",
    size: fmt(row.qty),
    price: "$" + fmt(row.price),
    pnl: (row.pnl >= 0 ? "+" : "") + "$" + fmt(row.pnl),
    pnlCls: row.pnl >= 0 ? "up" : "down",
  })),
);

const activeBlotterCount = computed(() => {
  if (activeBlotter.value === "positions") {
    return positions.value.length;
  }
  return activeBlotter.value === "orders" ? openOrderRows.value.length : tradeRows.value.length;
});

function cancelPendingOrder(id: string): void {
  pendingOrders.value = pendingOrders.value.filter((row) => row.id !== id);
  savePaperTerminal();
}

function trackedPositionByRow(row: PosRow): PaperPosition | undefined {
  return paperPositions.value.find((p) => p.id === row.id);
}

/** Ferme une position = close local Paper ou vend tout l'avoir spot backend. */
async function closePos(row: PosRow): Promise<void> {
  const tracked = trackedPositionByRow(row);
  if (tracked !== undefined) {
    await closePaperPosition(tracked);
    return;
  }
  const [ccy] = row.pair.split("/");
  const amt = ccy !== undefined ? paper.balances.value?.[ccy] : undefined;
  const price = ccy !== undefined ? livePrices.value[ccy] : undefined;
  if (ccy !== undefined && amt !== undefined && amt > 0 && price !== undefined) {
    await paper.placeOrder({
      pair: { base: ccy, quote: REFERENCE_QUOTE },
      side: "sell",
      amount: amt,
      price,
    });
  }
}

// ---------- bouton placer (UX optimiste + ordre paper réel best-effort) ----------
const placeOverride = ref("");
let placeFlashTimer: ReturnType<typeof setTimeout> | null = null;
// Message transitoire sur le bouton de placement (succès OU refus) : le feedback
// n'est affiché qu'après le résultat réel de l'ordre, jamais de façon optimiste.
function flashPlace(message: string): void {
  placeOverride.value = message;
  if (placeFlashTimer !== null) {
    clearTimeout(placeFlashTimer);
  }
  placeFlashTimer = setTimeout(() => {
    placeOverride.value = "";
  }, 1600);
}
function placeLabel(): string {
  if (placeOverride.value) return placeOverride.value;
  if (mode.value === "live") {
    if (!liveConfigured()) return t("liveNotConfigured");
    if (cur.value.s !== "XRP") return t("liveXrpOnly");
    return t(side.value === "buy" ? "buyAsset" : "sellAsset", { asset: cur.value.s }) + " · Live";
  }
  if (product.value === "perp") {
    return t(side.value === "buy" ? "longAsset" : "shortAsset", { asset: cur.value.s });
  }
  return t(side.value === "buy" ? "buyAsset" : "sellAsset", { asset: cur.value.s });
}

function queueLimitOrder(): void {
  const price = parsePositive(limitPrice.value) ?? cur.value.p;
  const qty = estimatedQty();
  const { tp, sl } = coherentTpSl(
    side.value,
    price,
    parsePositive(takeProfit.value),
    parsePositive(stopLoss.value),
  );
  pendingOrders.value = [
    {
      id: newId("order"),
      product: product.value,
      symbol: cur.value.s,
      side: side.value,
      orderKind: "limit",
      liquidity: liquidity.value,
      qty,
      price,
      margin: product.value === "perp" ? amount.value : notional(),
      leverage: product.value === "perp" ? leverage.value : 1,
      takeProfit: tp,
      stopLoss: sl,
      createdAt: Date.now(),
    },
    ...pendingOrders.value,
  ];
  savePaperTerminal();
  // Pas d'évaluation immédiate : l'ordre reste visible dans « ordres actifs » et
  // sera déclenché aux ticks de prix suivants s'il devient exécutable.
}

async function placePaperOrder(): Promise<void> {
  if (livePrices.value[cur.value.s] === undefined) {
    return;
  }
  // Connexion (donc soldes) AVANT la garde de cash, sinon le 1er ordre est rejeté.
  if (!paper.connected.value) {
    await paper.connect();
  }
  if (amount.value <= 0) {
    flashPlace(t("orderNoAmount"));
    return;
  }
  if (amount.value > availablePaperCash()) {
    flashPlace(t("orderInsufficient"));
    return;
  }
  try {
    if (orderKind.value === "limit") {
      queueLimitOrder();
      flashPlace(t("orderQueued"));
      return;
    }
    const qty = estimatedQty();
    const fee = estFeeValue();
    const { tp, sl } = coherentTpSl(
      side.value,
      cur.value.p,
      parsePositive(takeProfit.value),
      parsePositive(stopLoss.value),
    );
    if (product.value === "perp") {
      const ok = await openPaperPosition({
        product: "perp",
        symbol: cur.value.s,
        side: side.value,
        qty,
        price: cur.value.p,
        margin: amount.value,
        leverage: leverage.value,
        fee,
        takeProfit: tp,
        stopLoss: sl,
        reason: "market",
      });
      flashPlace(ok ? t("orderSent") : t("orderFailed"));
      return;
    }
    const order: MarketOrderInput = {
      pair: { base: cur.value.s, quote: REFERENCE_QUOTE },
      side: side.value,
      amount: qty,
      price: cur.value.p,
    };
    await paper.placeOrder(order);
    recordTrade({
      id: newId("trade"),
      product: "spot",
      symbol: cur.value.s,
      side: side.value,
      qty,
      price: cur.value.p,
      fee,
      pnl: -fee,
      reason: "market",
      at: Date.now(),
    });
    savePaperTerminal();
    flashPlace(t("orderSent"));
  } catch {
    // Ordre refusé par le backend (solde, compte) : feedback honnête, pas d'avalement muet.
    flashPlace(t("orderFailed"));
  }
}
// Swap Live (réel) : envoie l'INTENTION au serveur (base/side/quantité/slippage).
// Le serveur calcule l'OfferCreate borné (best execution + slippage) et le fait
// signer via Xaman ou GemWallet — le front ne construit aucun montant.
async function placeLiveOrder(): Promise<void> {
  if (!liveTradable()) {
    return;
  }
  const amountBase = amount.value / cur.value.p; // quantité de base (XRP)
  await wallet.signLiveOffer(cur.value.s, side.value, amountBase, LIVE_SLIPPAGE);
}

function onPlace(): void {
  if (mode.value === "live") {
    void placeLiveOrder();
    return;
  }
  // Le feedback (envoyé / placé / refusé) est émis par placePaperOrder selon le
  // résultat réel — plus de message optimiste qui masquait un échec silencieux.
  void placePaperOrder();
}

// ---------- marchés réels du backend (top 250 CoinGecko) ----------
let marketsLoaded = false;
async function loadMarkets(): Promise<void> {
  try {
    const rows = await props.client.markets();
    if (rows.length === 0) {
      return;
    }
    // Watchlist dynamique : symbole, nom, prix et %24h réels. hi/lo dérivés du
    // prix (le chart/échelle a besoin de bornes ; l'amplitude exacte est décor).
    markets.value = rows.map((r) => ({
      id: r.id,
      s: r.symbol,
      full: r.name,
      pair: `${r.symbol} / ${REFERENCE_QUOTE}`,
      p: r.price,
      c: r.change24h,
      hi: r.price * 1.04,
      lo: r.price * 0.96,
    }));
    // Prix par symbole : gating des ordres Paper + valorisation (tous cotés).
    livePrices.value = Object.fromEntries(rows.map((r) => [r.symbol, r.price]));
    evaluatePaperTriggers();
    // Sélection : XRP par défaut au 1er chargement (actif Live) ; ensuite on
    // conserve le marché choisi par l'utilisateur s'il existe toujours.
    const keep = markets.value.find((m) => m.s === cur.value.s);
    const xrp = markets.value.find((m) => m.s === "XRP");
    const [first] = markets.value;
    cur.value = (marketsLoaded ? keep ?? xrp : xrp ?? keep) ?? first ?? cur.value;
    marketsLoaded = true;
  } catch {
    // Feed indisponible : on conserve la watchlist mock (dégradation propre).
  }
}

// Config Live : récupère le symbole du quote (présent ⇔ swap réel activable).
async function loadLiveConfig(): Promise<void> {
  try {
    liveQuoteSymbol.value = (await props.client.config()).quoteSymbol;
  } catch {
    liveQuoteSymbol.value = null; // serveur indisponible → Live désactivé proprement
  }
}

// Init : prix réels puis connexion du compte paper si un wallet XRPL est déjà lié.
async function initDashboard(): Promise<void> {
  await Promise.all([loadMarkets(), loadLiveConfig()]);
  await Promise.all([loadHistory(), loadStats24h()]);
  await reloadPaperIdentity();
}

async function reloadPaperIdentity(): Promise<void> {
  await paper.connect();
  loadPaperTerminal();
  await refreshPositions();
}

// ---------- cycle de vie ----------
onMounted(() => {
  renderChart();
  void loadBook();
  startBookRefresh();
  startHistoryRefresh();
  window.addEventListener("resize", onResizeChart);
  void initDashboard();
});
onUnmounted(() => {
  cancelDrag?.();
  if (placeFlashTimer !== null) {
    clearTimeout(placeFlashTimer);
  }
  if (bookRefreshTimer !== null) {
    clearInterval(bookRefreshTimer);
    bookRefreshTimer = null;
  }
  if (historyRefreshTimer !== null) {
    clearInterval(historyRefreshTimer);
    historyRefreshTimer = null;
  }
  window.removeEventListener("resize", onResizeChart);
});
</script>

<template>
  <div class="main" :class="{ live: mode === 'live' }">
    <!-- BARRE DE MODE : passage Paper ↔ Live (argent réel), contexte du compte -->
    <div class="modebar" :class="{ live: mode === 'live' }">
      <div class="modeseg">
        <button
          type="button"
          :class="{ on: mode === 'paper' }"
          :title="t('paperHint')"
          @click="setMode('paper')"
        >
          {{ t('modePaper') }}
        </button>
        <button
          type="button"
          class="livebtn"
          :class="{ on: mode === 'live' }"
          :disabled="!liveConfigured()"
          :title="liveConfigured() ? t('liveHint') : t('liveNotConfigured')"
          @click="setMode('live')"
        >
          {{ t('modeLive') }}
        </button>
      </div>

      <div class="modectx">
        <template v-if="mode === 'live'">
          <span class="badge">⚡ {{ t('realBadge') }}</span>
          <button v-if="session.walletConnected.value" class="wchip" @click="wallet.disconnect()">
            <span class="dot"></span>{{ shorten(session.liveAddress.value) }}
            <span class="via">· {{ walletKind() }}</span>
          </button>
          <button v-else class="wchip warn" @click="wallet.connect()">
            <span class="dot"></span>{{ t('connectToTrade') }}
          </button>
        </template>
        <template v-else>
          <span v-if="paperIdentityLabel()" class="badge">{{ paperIdentityLabel() }}</span>
          <span class="ctxlabel">{{ t('virtualBalance') }}</span>
          <span class="ctxval">{{ availLabel() }}</span>
        </template>
      </div>
    </div>

    <div class="deck">
    <!-- WATCHLIST -->
    <aside class="card watch">
      <div class="wt-head"><span class="t">{{ t('markets') }}</span><span class="lab">24h</span></div>
      <div class="srch">
        <span class="soft">⌕</span>
        <input v-model="search" :placeholder="t('searchPlaceholder')" />
      </div>
      <div class="wl-scroll">
        <div
          v-for="m in filteredMarkets"
          :key="m.s"
          class="wrow"
          :class="{ on: m.s === cur.s }"
          @click="selectMarket(m)"
        >
          <div class="s"><b>{{ m.s }}</b><span>{{ m.full }}</span></div>
          <span v-html="spark(m.c >= 0)"></span>
          <div class="pr">
            <span class="x">{{ fmt(m.p) }}</span>
            <span class="y" :class="m.c >= 0 ? 'up' : 'down'">{{ m.c >= 0 ? "+" : "" }}{{ m.c }}%</span>
          </div>
        </div>
        <div v-if="filteredMarkets.length === 0" class="wl-empty">{{ t('noMarket') }}</div>
      </div>
    </aside>

    <!-- CENTER -->
    <section class="col">
      <div class="card" style="flex: 1">
        <div class="mkt">
          <div class="pairsel">
            <div class="ic">{{ cur.s }}</div>
            <div class="nm"><b>{{ cur.pair }}</b><span>{{ cur.full }}</span></div>
            <span class="car">▾</span>
          </div>
          <div class="bigprice">
            <div class="p">${{ fmt(cur.p) }}</div>
            <div class="c" :class="stat24Change >= 0 ? 'up' : 'down'">{{ stat24Change >= 0 ? "+" : "" }}{{ stat24Change.toFixed(2) }}% (24h)</div>
          </div>
          <div class="scell"><div class="l">{{ t('high24h') }}</div><div class="v">${{ fmt(stat24High) }}</div></div>
          <div class="scell"><div class="l">{{ t('low24h') }}</div><div class="v">${{ fmt(stat24Low) }}</div></div>
          <div class="scell"><div class="l">{{ t('chartSource') }}</div><div class="v">{{ chartSourceLabel }}</div></div>
        </div>
        <div class="chart-bar">
          <div class="tf">
            <button
              v-for="o in tfOptions"
              :key="o.v"
              :class="{ on: tf === o.v }"
              @click="setTf(o.v)"
            >{{ o.l }}</button>
          </div>
          <div class="ct-type">
            <button
              :class="{ on: chartType === 'candles' && historyMode !== 'price' }"
              :disabled="historyMode === 'price'"
              :title="historyMode === 'price' ? t('candlesUnavailable') : t('candles')"
              @click="setChartType('candles')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="6" width="3" height="12" rx="1" /><rect x="6" y="3" width="1" height="18" /><rect x="16" y="9" width="3" height="9" rx="1" /><rect x="17" y="5" width="1" height="16" /></svg>
            </button>
            <button :class="{ on: chartType === 'line' || historyMode === 'price' }" :title="t('line')" @click="setChartType('line')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 17l5-6 4 3 8-9" /></svg>
            </button>
          </div>
        </div>
        <div class="chart-wrap" @mousedown="onChartPanDown" @dblclick="resetPriceView" @wheel.prevent="onChartWheel">
          <svg ref="chartSvg" viewBox="0 0 820 400" preserveAspectRatio="none" v-html="chartHtml"></svg>
          <div
            class="price-axis-zoom"
            :title="t('priceAxisZoom')"
            @mousedown.stop="onPriceAxisDown"
            @dblclick.stop="resetPriceView"
          ></div>
          <div class="chart-time-axis" aria-hidden="true">
            <span
              v-for="label in chartTimeLabels"
              :key="label.key"
              :style="{
                left: `${label.left}%`,
                transform: axisLabelTransform(label.anchor),
                textAlign: axisLabelAlign(label.anchor),
              }"
            >{{ label.text }}</span>
          </div>
        </div>
      </div>

      <div class="card pos">
        <div class="pos-tabs">
          <button :class="{ on: activeBlotter === 'positions' }" @click="activeBlotter = 'positions'">
            {{ t('positionsTab') }} <span class="cnt">{{ positions.length }}</span>
          </button>
          <button :class="{ on: activeBlotter === 'orders' }" @click="activeBlotter = 'orders'">
            {{ t('openOrdersTab') }} <span class="cnt">{{ openOrderRows.length }}</span>
          </button>
          <button :class="{ on: activeBlotter === 'history' }" @click="activeBlotter = 'history'">
            {{ t('historyTab') }} <span class="cnt">{{ tradeRows.length }}</span>
          </button>
        </div>
        <div class="ptable">
          <div v-if="activeBlotter === 'positions'" class="pthead">
            <div>{{ t('market') }}</div><div>{{ t('side') }}</div><div>{{ t('size') }}</div><div>{{ t('entryToMarket') }}</div><div>PnL</div><div></div>
          </div>
          <div
            v-if="activeBlotter === 'positions'"
            v-for="(row, i) in positions"
            :key="i"
            class="ptrow"
            :style="{ opacity: row.closed ? 0.35 : 1 }"
          >
            <div class="pair">{{ row.pair }}</div>
            <div><span class="side" :class="row.sideCls">{{ row.sideLabel }}</span></div>
            <div>{{ row.size }}</div>
            <div>{{ row.px }}</div>
            <div :class="row.pnlCls">{{ row.pnl }}</div>
            <div>
              <button class="closebtn" :disabled="row.closed" @click="closePos(row)">
                {{ row.closed ? t('closed') : t('close') }}
              </button>
            </div>
          </div>
          <div v-if="activeBlotter === 'positions' && activeBlotterCount === 0" class="empty-row">{{ t('noPositions') }}</div>

          <div v-if="activeBlotter === 'orders'" class="pthead">
            <div>{{ t('market') }}</div><div>{{ t('side') }}</div><div>{{ t('size') }}</div><div>{{ t('limitPrice') }}</div><div>{{ t('execution') }}</div><div></div>
          </div>
          <div
            v-if="activeBlotter === 'orders'"
            v-for="row in openOrderRows"
            :key="row.id"
            class="ptrow"
          >
            <div class="pair">{{ row.pair }}</div>
            <div><span class="side" :class="row.sideCls">{{ row.sideLabel }}</span></div>
            <div>{{ row.size }}</div>
            <div>{{ row.price }}</div>
            <div>{{ row.meta }}</div>
            <div>
              <button class="closebtn" @click="cancelPendingOrder(row.id)">{{ t('cancel') }}</button>
            </div>
          </div>
          <div v-if="activeBlotter === 'orders' && activeBlotterCount === 0" class="empty-row">{{ t('noOrders') }}</div>

          <div v-if="activeBlotter === 'history'" class="pthead trade-head">
            <div>{{ t('market') }}</div><div>{{ t('side') }}</div><div>{{ t('size') }}</div><div>{{ t('price') }}</div><div>PnL</div><div></div>
          </div>
          <div
            v-if="activeBlotter === 'history'"
            v-for="row in tradeRows"
            :key="row.id"
            class="ptrow trade-head"
          >
            <div class="pair">{{ row.pair }}</div>
            <div><span class="side" :class="row.sideCls">{{ row.sideLabel }}</span></div>
            <div>{{ row.size }}</div>
            <div>{{ row.price }}</div>
            <div :class="row.pnlCls">{{ row.pnl }}</div>
            <div></div>
          </div>
          <div v-if="activeBlotter === 'history' && activeBlotterCount === 0" class="empty-row">{{ t('noTrades') }}</div>
        </div>
      </div>
    </section>

    <!-- RIGHT -->
    <aside class="col">
      <div class="card ticket">
        <div class="ticket-controls">
          <div class="mini-field">
            <span>{{ t('product') }}<LearnHint slug="what-is-a-perpetual" :label="t('hintProduct')" :bubble="false" /></span>
            <div class="mini-seg">
              <button :class="{ on: product === 'spot' }" @click="product = 'spot'">{{ t('spot') }}</button>
              <button :class="{ on: product === 'perp' }" @click="product = 'perp'">{{ t('perp') }}</button>
            </div>
          </div>
          <div class="mini-field">
            <span>{{ t('orderType') }}<LearnHint slug="order-types" :label="t('hintOrder')" :bubble="false" /></span>
            <div class="mini-seg">
              <button :class="{ on: orderKind === 'market' }" @click="orderKind = 'market'">{{ t('marketOrder') }}</button>
              <button :class="{ on: orderKind === 'limit' }" @click="orderKind = 'limit'">{{ t('limitOrder') }}</button>
            </div>
          </div>
          <div class="mini-field">
            <span>{{ t('execution') }}<LearnHint slug="order-book-spread" :label="t('hintExecution')" :bubble="false" /></span>
            <div class="mini-seg">
              <button :class="{ on: liquidity === 'taker' }" @click="liquidity = 'taker'">{{ t('taker') }}</button>
              <button :class="{ on: liquidity === 'maker' }" @click="liquidity = 'maker'">{{ t('maker') }}</button>
            </div>
          </div>
        </div>
        <div class="bs">
          <button class="buy" :class="{ on: side === 'buy' }" @click="setSide('buy')">{{ t('buy') }}</button>
          <button class="sell" :class="{ on: side === 'sell' }" @click="setSide('sell')">{{ t('sell') }}</button>
        </div>
        <div v-if="orderKind === 'limit'" class="field compact-field">
          <div class="fl"><span class="k">{{ t('limitPrice') }}</span><span class="b">${{ fmt(cur.p) }}</span></div>
          <div class="inp">
            <input type="text" :value="limitPrice" :placeholder="fmt(cur.p)" @input="onLimitInput" /><span class="suf">RLUSD</span>
          </div>
        </div>
        <div class="field">
          <div class="fl"><span class="k">{{ t('amount') }}</span><span class="b">{{ t('available') }} {{ availLabel() }}</span></div>
          <div class="inp">
            <input type="text" :value="amountDisplay()" @input="onAmountInput" /><span class="suf">RLUSD</span>
          </div>
        </div>
        <div v-if="product === 'perp'" class="lev">
          <div class="fl"><span class="k">{{ t('leverage') }}<LearnHint slug="leverage-and-margin" :label="t('hintLeverage')" :bubble="false" /></span><span class="b">{{ leverage }}x</span></div>
          <input v-model.number="leverage" type="range" min="1" max="20" step="1" />
          <div class="lev-buttons">
            <button v-for="v in [1, 2, 5, 10, 20]" :key="v" :class="{ on: leverage === v }" @click="leverage = v">{{ v }}x</button>
          </div>
        </div>
        <div class="pcts">
          <button v-for="(p, i) in [25, 50, 75, 100]" :key="p" :class="{ on: pctIdx === i }" @click="setPct(i)">
            {{ p }}%
          </button>
        </div>
        <div class="risk-grid">
          <div class="field compact-field">
            <div class="fl"><span class="k">{{ t('takeProfit') }}<LearnHint slug="take-profit-stop-loss" :label="t('hintRisk')" :bubble="false" /></span></div>
            <div class="inp">
              <input type="text" :value="takeProfit" placeholder="—" @input="onTpInput" /><span class="suf">TP</span>
            </div>
          </div>
          <div class="field compact-field">
            <div class="fl"><span class="k">{{ t('stopLoss') }}</span></div>
            <div class="inp">
              <input type="text" :value="stopLoss" placeholder="—" @input="onSlInput" /><span class="suf">SL</span>
            </div>
          </div>
        </div>
        <div class="summary">
          <div class="r"><span>{{ t('estQty') }}</span><b>{{ estQtyLabel() }}</b></div>
          <div class="r"><span>{{ t('margin') }}</span><b>{{ estMarginLabel() }}</b></div>
          <div class="r"><span>{{ t('estFees') }}</span><b>${{ fmt(estFeeValue()) }}</b></div>
          <div class="r"><span>{{ t('liqApprox') }}</span><b>{{ liquidationLabel() }}</b></div>
        </div>
        <button
          class="placebtn"
          :class="{ sell: side === 'sell' }"
          :disabled="(mode === 'live' && !liveTradable()) || (mode === 'paper' && (amount <= 0 || amount > availablePaperCash()))"
          @click="onPlace"
        >{{ placeLabel() }}</button>
      </div>

      <div class="card book">
        <div class="bh"><span class="t">{{ t('orderBook') }}</span><span class="lab">{{ bookSourceLabel() }}</span></div>
        <div class="bk-head"><div>{{ t('price') }}</div><div>{{ t('size') }}</div><div>{{ t('total') }}</div></div>
        <template v-if="book !== null">
          <div
            v-for="row in askRows"
            :key="`ask-${row.price}-${row.total}`"
            class="bk ask"
          >
            <span class="depth" :style="{ width: rowWidth(row.total, askMaxTotal) }"></span>
            <span class="px">{{ fmtBookPrice(row.price) }}</span>
            <span class="d">{{ fmtBookSize(row.size) }}</span>
            <span class="d">{{ fmtBookSize(row.total) }}</span>
          </div>
          <div class="bk-spread">{{ fmtBookPrice(book.mid) }} &nbsp;·&nbsp; spread {{ fmtSpread(book.spread) }}</div>
          <div
            v-for="row in book.bids"
            :key="`bid-${row.price}-${row.total}`"
            class="bk bid"
          >
            <span class="depth" :style="{ width: rowWidth(row.total, bidMaxTotal) }"></span>
            <span class="px">{{ fmtBookPrice(row.price) }}</span>
            <span class="d">{{ fmtBookSize(row.size) }}</span>
            <span class="d">{{ fmtBookSize(row.total) }}</span>
          </div>
        </template>
        <div v-else class="book-empty">
          {{
            bookStatus === 'loading'
              ? t('bookLoading')
              : bookStatus === 'error'
                ? (bookError ?? t('bookUnavailable'))
                : t('bookUnavailable')
          }}
        </div>
      </div>
    </aside>
    </div>
  </div>
</template>

<style scoped>
/* ---------- MAIN (barre de mode + bento d'écrans sombres) ---------- */
.main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 18px 18px;
  height: calc(100vh - 64px);
}
.deck {
  display: grid;
  grid-template-columns: 250px 1fr 336px;
  gap: 14px;
  flex: 1;
  min-height: 0;
}
@media (max-width: 1200px) {
  .deck {
    grid-template-columns: 1fr 336px;
  }
  .main {
    height: auto;
  }
  .watch {
    display: none;
  }
}
@media (max-width: 780px) {
  .deck {
    grid-template-columns: 1fr;
  }
}

/* ---------- BARRE DE MODE (Paper ↔ Live, argent réel) ---------- */
.modebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-shrink: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 14px;
  transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
}
.modebar.live {
  border-color: rgba(255, 157, 60, 0.5);
  box-shadow: 0 0 0 1px rgba(255, 157, 60, 0.18), 0 8px 28px -16px rgba(255, 157, 60, 0.5);
}
.modeseg {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 11px;
}
.modeseg button {
  border: none;
  background: none;
  color: var(--soft);
  font-family: var(--disp);
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.02em;
  padding: 8px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.18s var(--ease);
}
.modeseg button.on {
  background: var(--blue);
  color: #fff;
}
.modeseg button.livebtn.on {
  background: var(--live);
  color: #2a1500;
}
.modeseg button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.modeseg button:not(.on):not(:disabled):hover {
  color: var(--text);
}
.modectx {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ctxlabel {
  font-size: 11.5px;
  color: var(--soft);
}
.ctxval {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.badge {
  font-family: var(--disp);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  color: var(--live);
  border: 1px solid rgba(255, 157, 60, 0.5);
  border-radius: 7px;
  padding: 4px 9px;
}
.wchip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--panel2);
  border: 1px solid var(--line2);
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 9px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.wchip:hover {
  border-color: var(--live);
}
.wchip .via {
  color: var(--soft);
  font-weight: 500;
}
.wchip .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--up);
}
.wchip.warn {
  border-color: rgba(255, 157, 60, 0.5);
  color: var(--live);
}
.wchip.warn .dot {
  background: var(--live);
}

/* Teinte « argent réel » diffusée au terminal quand Live est actif (les couleurs
 * buy/sell du bouton d'ordre restent sémantiques et ne sont pas teintées). */
.main.live .wrow.on {
  border-left-color: var(--live);
}
.main.live .pairsel .ic {
  background: linear-gradient(135deg, var(--live), #ff7a3c);
  color: #2a1500;
}
.main.live .inp:focus-within {
  border-color: var(--live);
}
.main.live .pcts button.on,
.main.live .pcts button:hover {
  border-color: var(--live);
  color: #fff;
  background: rgba(255, 157, 60, 0.16);
}
.col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

/* watchlist */
.watch {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.wt-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 10px;
}
.wt-head .t {
  font-weight: 700;
  font-size: 14px;
}
.srch {
  margin: 0 12px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 9px 11px;
}
.srch input {
  background: none;
  border: none;
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  outline: none;
  width: 100%;
}
.srch input::placeholder {
  color: var(--mut2);
}
.wl-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.wl-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--mut2);
}
.wrow {
  display: grid;
  grid-template-columns: 1fr 56px 64px;
  gap: 8px;
  align-items: center;
  padding: 11px 16px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background 0.15s;
}
.wrow:hover {
  background: var(--panel2);
}
.wrow.on {
  background: var(--panel2);
  border-left-color: var(--blue);
}
.wrow .s b {
  font-size: 13px;
  font-weight: 700;
  display: block;
}
.wrow .s span {
  font-size: 10.5px;
  color: var(--soft);
}
.wrow .pr {
  text-align: right;
}
.wrow .pr .x {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 500;
  display: block;
}
.wrow .pr .y {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
}

/* chart card */
.mkt {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  flex-shrink: 0;
}
.pairsel {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px 18px;
  border-right: 1px solid var(--line);
  cursor: pointer;
}
.pairsel .ic {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--blue), #9d7bff);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  flex-shrink: 0;
}
.pairsel .nm b {
  font-size: 15px;
  font-weight: 700;
  display: block;
}
.pairsel .nm span {
  font-size: 10.5px;
  color: var(--soft);
}
.pairsel .car {
  margin-left: 4px;
  color: var(--soft);
}
.bigprice {
  padding: 9px 20px;
  border-right: 1px solid var(--line);
}
.bigprice .p {
  font-family: var(--mono);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.bigprice .c {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
}
.scell {
  padding: 9px 20px;
  border-right: 1px solid var(--line);
  white-space: nowrap;
}
.scell .l {
  font-size: 10px;
  color: var(--soft);
  margin-bottom: 3px;
}
.scell .v {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 500;
}
.chart-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.tf {
  display: flex;
  gap: 2px;
  background: var(--panel2);
  border-radius: 9px;
  padding: 3px;
}
.tf button {
  border: none;
  background: none;
  color: var(--soft);
  font-family: var(--mono);
  font-size: 11.5px;
  font-weight: 500;
  padding: 6px 11px;
  border-radius: 6px;
  transition: 0.15s;
}
.tf button.on {
  background: var(--blue);
  color: #fff;
}
/* Zone de l'axe des prix : glissement vertical pour zoomer l'échelle (cf. onPriceAxisDown). */
.price-axis-zoom {
  position: absolute;
  top: 6px;
  right: 0;
  bottom: 24px;
  width: 6%;
  min-width: 40px;
  cursor: ns-resize;
  z-index: 2;
  touch-action: none;
}
.ct-type {
  margin-left: auto;
  display: flex;
  gap: 2px;
  background: var(--panel2);
  border-radius: 9px;
  padding: 3px;
}
.ct-type button {
  border: none;
  background: none;
  color: var(--soft);
  padding: 6px 9px;
  border-radius: 6px;
  display: grid;
  place-items: center;
}
.ct-type button.on {
  background: var(--blue);
  color: #fff;
}
.chart-wrap {
  flex: 1;
  position: relative;
  min-height: 300px;
  padding: 6px 0 0;
  display: flex;
  flex-direction: column;
  cursor: grab;
}
.chart-wrap:active {
  cursor: grabbing;
}
.chart-wrap svg {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: block;
}
.chart-time-axis {
  position: relative;
  height: 24px;
  margin: 0 5.61% 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.chart-time-axis span {
  position: absolute;
  top: 7px;
  min-width: 56px;
  color: var(--mut2);
  font-family: var(--mono);
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}
/* SVG injecté via v-html → percer le scope avec :deep(). */
.chart-wrap :deep(.gridln) {
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 1;
}
.chart-wrap :deep(.axis) {
  font-family: var(--mono);
  font-size: 9px;
  fill: var(--mut2);
}
.chart-wrap :deep(.timeaxis) {
  font-family: var(--mono);
  font-size: 10px;
  fill: rgba(255, 255, 255, 0.55);
}
.chart-wrap :deep(.candle) {
  transition: opacity 0.5s var(--ease);
}

/* positions card */
.pos {
  display: flex;
  flex-direction: column;
  max-height: 248px;
}
.pos-tabs {
  display: flex;
  gap: 18px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.pos-tabs button {
  border: none;
  background: none;
  color: var(--soft);
  font-weight: 700;
  font-size: 12.5px;
  padding: 0 0 2px;
  position: relative;
}
.pos-tabs button.on {
  color: var(--text);
}
.pos-tabs button.on::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -14px;
  height: 2px;
  background: var(--blue);
}
.pos-tabs .cnt {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--mut2);
  margin-left: 5px;
}
.ptable {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.pthead,
.ptrow {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr 1fr 1.2fr 1fr 0.7fr;
  gap: 8px;
  align-items: center;
  padding: 11px 16px;
}
.pthead {
  position: sticky;
  top: 0;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.pthead div {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mut2);
}
.ptrow {
  border-bottom: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 12.5px;
}
.trade-head {
  grid-template-columns: 1.3fr 1.2fr 1fr 1.1fr 1fr 0.3fr;
}
.ptrow .pair {
  font-family: var(--disp);
  font-weight: 700;
}
.empty-row {
  padding: 22px 16px;
  color: var(--mut2);
  font-family: var(--mono);
  font-size: 12px;
  text-align: center;
}
.side {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 5px;
  display: inline-block;
}
.side.l {
  background: rgba(191, 246, 206, 0.16);
  color: var(--up);
}
.side.s {
  background: rgba(255, 185, 172, 0.16);
  color: var(--down);
}
.closebtn {
  border: 1px solid var(--line2);
  background: none;
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  padding: 5px 10px;
  transition: 0.15s;
}
.closebtn:hover {
  border-color: var(--down);
  color: var(--down);
}

/* order ticket */
.ticket {
  padding: 12px 14px;
  flex-shrink: 0;
  max-height: min(510px, 58%);
  overflow-y: auto;
  scrollbar-width: thin;
}
.ticket-controls {
  display: grid;
  gap: 7px;
  margin-bottom: 10px;
}
.mini-field {
  display: grid;
  gap: 4px;
}
.mini-field > span {
  color: var(--soft);
  font-size: 10.5px;
}
.mini-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 9px;
}
.mini-seg button {
  border: none;
  background: none;
  color: var(--soft);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  padding: 6px 8px;
  border-radius: 6px;
}
.mini-seg button.on {
  background: var(--blue);
  color: #fff;
}
.bs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-radius: 11px;
  overflow: hidden;
  border: 1px solid var(--line);
  margin-bottom: 11px;
}
.bs button {
  border: none;
  background: var(--panel2);
  color: var(--soft);
  font-weight: 800;
  font-size: 14px;
  padding: 11px;
  transition: 0.2s;
}
.bs button.buy.on {
  background: var(--up);
  color: #06231a;
}
.bs button.sell.on {
  background: var(--down);
  color: #2a0a06;
}
.field {
  margin-bottom: 10px;
}
.compact-field {
  margin-bottom: 8px;
}
.field .fl {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}
.field .fl .k {
  font-size: 11.5px;
  color: var(--soft);
}
.field .fl .b {
  font-size: 11.5px;
  color: var(--soft);
  font-family: var(--mono);
}
.inp {
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0 13px;
  transition: border-color 0.2s;
}
.inp:focus-within {
  border-color: var(--blue);
}
.inp input {
  flex: 1;
  background: none;
  border: none;
  color: var(--text);
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 600;
  padding: 10px 0;
  outline: none;
  width: 100%;
}
.inp .suf {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--soft);
  font-weight: 500;
}
.lev {
  margin: -2px 0 10px;
}
.lev .fl {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.lev .k,
.lev .b {
  color: var(--soft);
  font-family: var(--mono);
  font-size: 11.5px;
}
.lev input[type="range"] {
  width: 100%;
  accent-color: var(--blue);
}
.lev-buttons {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
  margin-top: 5px;
}
.lev-buttons button {
  border: 1px solid var(--line);
  background: none;
  color: var(--soft);
  border-radius: 7px;
  font-family: var(--mono);
  font-size: 10.5px;
  padding: 5px 0;
}
.lev-buttons button.on {
  border-color: var(--blue);
  background: rgba(79, 106, 255, 0.16);
  color: #fff;
}
.pcts {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.pcts button {
  flex: 1;
  border: 1px solid var(--line);
  background: none;
  color: var(--soft);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  padding: 7px 0;
  border-radius: 8px;
  transition: 0.15s;
}
.pcts button:hover,
.pcts button.on {
  border-color: var(--blue);
  color: #fff;
  background: rgba(79, 106, 255, 0.16);
}
.risk-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}
.risk-grid .inp {
  padding: 0 9px;
}
.risk-grid .inp input {
  font-size: 13px;
  padding: 8px 0;
}
.risk-grid .inp .suf {
  font-size: 10px;
}
.summary {
  font-size: 12px;
  margin-bottom: 10px;
}
.summary .r {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  color: var(--soft);
}
.summary .r b {
  color: var(--text);
  font-family: var(--mono);
  font-weight: 600;
}
.placebtn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 13px;
  font-weight: 800;
  font-size: 15px;
  color: #06231a;
  background: var(--up);
  transition: 0.2s;
}
.placebtn.sell {
  background: var(--down);
  color: #2a0a06;
}
.placebtn:hover {
  filter: brightness(1.06);
}
.placebtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: none;
}

/* order book */
.book {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 220px;
}
.book .bh {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.book .bh .t {
  font-weight: 700;
  font-size: 13px;
}
.bk-head {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 6px;
}
.bk-head div {
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mut2);
}
.bk-head div:nth-child(2),
.bk-head div:nth-child(3) {
  text-align: right;
}
/* Lignes du carnet réelles, rendues en boucle Vue. */
.book .bk {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 3.5px 0;
  font-family: var(--mono);
  font-size: 11.5px;
}
.book .bk .d {
  text-align: right;
  color: var(--soft);
}
.book .bk .depth {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  opacity: 0.12;
  border-radius: 2px;
}
.book .bk.ask .depth {
  background: var(--down);
}
.book .bk.bid .depth {
  background: var(--up);
}
.book .bk.ask .px {
  color: var(--down);
}
.book .bk.bid .px {
  color: var(--up);
}
.bk-spread {
  text-align: center;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  padding: 9px 0;
  color: var(--soft);
}
.book-empty {
  padding: 18px 0 8px;
  color: var(--soft);
  font-family: var(--mono);
  font-size: 12px;
  text-align: center;
}
</style>
