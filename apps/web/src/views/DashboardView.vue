<script setup lang="ts">
// Terminal de trading — porté depuis design_site/dashboard.html.
// Bento 3 colonnes : watchlist, chart + positions, ticket + carnet d'ordres.
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { BookDepth, Candle, TideClient } from "@tide/client";
import type { MarketOrderInput } from "@tide/core";
import { MARKETS, fmtNum, type Market } from "../data/markets";
import { usePaper } from "../composables/usePaper";
import { useWallet } from "../composables/useWallet";
import { useSession } from "../composables/useSession";
import { useI18n } from "../i18n/useI18n";

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
    fallbackFeed: "Synthetic fallback",
    candles: "Candles",
    line: "Line",
    positionsTab: "Positions",
    market: "Market",
    side: "Side",
    entryToMarket: "Entry → Market",
    close: "Close",
    closed: "Closed",
    buy: "Buy",
    sell: "Sell",
    amount: "Amount",
    available: "Avail.",
    estQty: "Est. quantity",
    estFees: "Est. fees",
    buyAsset: "Buy {asset}",
    sellAsset: "Sell {asset}",
    orderSent: "✓ Paper order sent",
    orderBook: "Order book",
    bookLive: "CEX live",
    bookLoading: "Loading...",
    bookUnavailable: "Real book unavailable",
    price: "Price",
    size: "Size",
    total: "Total",
    modePaper: "Paper",
    modeLive: "Live",
    liveXrpOnly: "Live: XRP only",
    liveNotConfigured: "Live not configured",
    virtualBalance: "Virtual balance",
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
    fallbackFeed: "Repli synthétique",
    candles: "Chandeliers",
    line: "Ligne",
    positionsTab: "Positions",
    market: "Marché",
    side: "Sens",
    entryToMarket: "Entrée → Marché",
    close: "Fermer",
    closed: "Fermée",
    buy: "Acheter",
    sell: "Vendre",
    amount: "Montant",
    available: "Dispo.",
    estQty: "Quantité estimée",
    estFees: "Frais estimés",
    buyAsset: "Acheter {asset}",
    sellAsset: "Vendre {asset}",
    orderSent: "✓ Ordre simulé envoyé",
    orderBook: "Carnet d'ordres",
    bookLive: "Flux CEX réel",
    bookLoading: "Chargement...",
    bookUnavailable: "Carnet réel indisponible",
    price: "Prix",
    size: "Taille",
    total: "Total",
    modePaper: "Paper",
    modeLive: "Live",
    liveXrpOnly: "Live : XRP uniquement",
    liveNotConfigured: "Live non configuré",
    virtualBalance: "Solde virtuel",
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
  if (connectedNow) {
    void paper.connect();
  }
});

/** Adresse XRPL raccourcie pour l'affichage (rXXXX…abcd). */
function shorten(addr: string): string {
  return addr.length > 12 ? addr.slice(0, 6) + "…" + addr.slice(-4) : addr;
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

// Timeframe = INTERVALLE de bougie (vue trading) → notation Binance.
const TF_INTERVAL: Readonly<Record<string, string>> = {
  "5m": "5m",
  "15m": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
};
// Volatilité du repli synthétique (si Binance indisponible) par intervalle.
const TF_VOL: Readonly<Record<string, number>> = {
  "5m": 0.25,
  "15m": 0.35,
  "1H": 0.5,
  "4H": 0.7,
  "1D": 1,
};
// Durée d'une bougie par intervalle (ms) — horodate le repli synthétique pour que
// l'axe des dates s'affiche même quand Binance ne cote pas l'actif (ex. HYPE).
const MINUTE_MS = 60_000;
const TF_MS: Readonly<Record<string, number>> = {
  "5m": 5 * MINUTE_MS,
  "15m": 15 * MINUTE_MS,
  "1H": 60 * MINUTE_MS,
  "4H": 240 * MINUTE_MS,
  "1D": 1440 * MINUTE_MS,
};
const TF_LIST = ["5m", "15m", "1H", "4H", "1D"] as const;
const tf = ref<string>("1D");
const chartType = ref<"candles" | "line">("candles");

// Vraies bougies OHLC (CoinGecko via backend) ; vide → repli synthétique.
const realCandles = ref<Candle[]>([]);

// Stats 24h FIXES (variation / haut / bas) — indépendantes de la taille de bougie
// du chart. Calculées sur les 24 dernières bougies 1h (= 24h), pas sur la fenêtre
// affichée (sinon elles varieraient d'un timeframe à l'autre).
const stats24h = ref<{ change: number; high: number; low: number } | null>(null);
const stat24High = computed(() => stats24h.value?.high ?? cur.value.hi);
const stat24Low = computed(() => stats24h.value?.low ?? cur.value.lo);
const stat24Change = computed(() => stats24h.value?.change ?? cur.value.c);
const chartSourceLabel = computed(() =>
  realCandles.value.length > 0 ? t("liveFeed") : t("fallbackFeed"),
);

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

// Réf du <svg> du chart pour staggerer le fade-in des bougies.
const chartSvg = ref<SVGSVGElement | null>(null);

// ---------- helpers ----------
const fmt = fmtNum;

/** Sparkline inline pour une ligne de la watchlist. */
function spark(up: boolean): string {
  const d = up
    ? "M0,18 L10,15 L20,16 L30,10 L40,12 L50,5 L60,2"
    : "M0,4 L10,7 L20,5 L30,11 L40,9 L50,15 L60,17";
  return `<svg viewBox="0 0 60 22" preserveAspectRatio="none" style="width:56px;height:22px"><path d="${d}" fill="none" stroke="${up ? "var(--up)" : "var(--down)"}" stroke-width="1.6"/></svg>`;
}

/** Hash d'une chaîne en entier (seed déterministe distinct par marché+timeframe). */
function hashSeed(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** PRNG déterministe (LCG) seedé — chart/carnet stables par marché. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

/** Libellé d'axe temporel : heure (intraday) ou date selon l'intervalle. */
function fmtAxisDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const intraday =
    tf.value === "5m" || tf.value === "15m" || tf.value === "1H" || tf.value === "4H";
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

/** Bougies à tracer : vraies (Binance) si dispo, sinon repli synthétique. */
function chartCandles(): ChartCandle[] {
  const real = realCandles.value;
  if (real.length > 0) {
    return real.map((k) => ({ o: k.o, c: k.c, hi: k.h, lo: k.l, t: k.t }));
  }
  // Repli (Binance indisponible) : bougies seedées autour du prix courant,
  // horodatées (pas de l'intervalle, finissant « maintenant ») → axe des dates OK.
  const m = cur.value;
  const vol = TF_VOL[tf.value] ?? 1;
  const r = rng(hashSeed(m.s + "|" + tf.value));
  const count = 58;
  const step = TF_MS[tf.value] ?? 60 * MINUTE_MS;
  const now = Date.now();
  let price = m.p * (1 - 0.06 * vol);
  const out: ChartCandle[] = [];
  for (let i = 0; i < count; i++) {
    const drift = ((m.p - price) / (count - i)) * 0.6;
    const o = price;
    const ch = (r() - 0.45) * m.p * 0.018 * vol + drift;
    const c = o + ch;
    const hi = Math.max(o, c) + r() * m.p * 0.01 * vol;
    const lo = Math.min(o, c) - r() * m.p * 0.01 * vol;
    out.push({ o, c, hi, lo, t: now - (count - 1 - i) * step });
    price = c;
  }
  const last = out[count - 1];
  if (last !== undefined) {
    last.c = m.p;
  }
  return out;
}

// ---------- chart ----------
function renderChart(): void {
  const W = 820;
  const H = 400;
  const pad = 46;
  const m = cur.value;
  const candles = chartCandles();
  const n = candles.length;
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
  const Y = (v: number): number => pad + ((mx - v) / (mx - mn)) * (H - pad * 2);
  const cw = (W - pad - 12) / n;
  const bw = cw * 0.62;
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const y = pad + (i * (H - pad * 2)) / 4;
    const v = mx - ((mx - mn) * i) / 4;
    g += `<line class="gridln" x1="0" y1="${y}" x2="${W - pad}" y2="${y}"/><text class="axis" x="${W - pad + 6}" y="${y + 3}">${fmt(v)}</text>`;
  }
  const cx = (i: number): number => 8 + i * cw + cw / 2;
  if (chartType.value === "line") {
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
  g += `<rect x="${W - pad}" y="${ly - 9}" width="${pad}" height="18" fill="var(--blue)" rx="3"/><text class="axis" x="${W - pad + 5}" y="${ly + 3}" fill="#fff" style="font-weight:700">${fmt(m.p)}</text>`;
  // Axe des dates en bas (bougies réelles horodatées).
  const labelCount = 5;
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (n - 1));
    const k = candles[idx];
    if (k === undefined || k.t === undefined) {
      continue;
    }
    const anchor = i === 0 ? "start" : i === labelCount - 1 ? "end" : "middle";
    g += `<text class="axis" x="${cx(idx)}" y="${H - 8}" text-anchor="${anchor}">${fmtAxisDate(k.t)}</text>`;
  }
  chartHtml.value = g;
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
  return `${t("bookLive")} · ${bookPairLabel()}`;
}

function rowWidth(total: number, max: number): string {
  if (max <= 0) {
    return "0%";
  }
  return `${Math.max(0, Math.min(100, (total / max) * 100))}%`;
}

async function loadBook(): Promise<void> {
  const seq = ++bookRequestSeq;
  bookStatus.value = "loading";
  bookError.value = null;
  try {
    const depth = await props.client.bookDepth(cur.value.s, 8);
    if (seq !== bookRequestSeq) {
      return;
    }
    book.value = depth;
    bookStatus.value = "ready";
  } catch {
    if (seq !== bookRequestSeq) {
      return;
    }
    book.value = null;
    bookStatus.value = "error";
    bookError.value = t("bookUnavailable");
  }
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
  chartType.value = value;
  renderChart();
}

// Charge les vraies bougies (Binance) du marché/intervalle courant puis re-render.
async function loadHistory(): Promise<void> {
  const symbol = cur.value.s;
  const interval = TF_INTERVAL[tf.value] ?? "1h";
  try {
    realCandles.value = await props.client.history(symbol, interval, 120);
  } catch {
    realCandles.value = []; // Binance indisponible → repli synthétique
  }
  renderChart();
}

// Stats 24h du marché courant (24 bougies 1h) — indépendantes du timeframe du chart.
async function loadStats24h(): Promise<void> {
  try {
    const candles = await props.client.history(cur.value.s, "1h", 24);
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
    stats24h.value = null;
  }
}

// Recharge l'historique + les stats 24h + re-render le carnet quand le marché change.
watch(cur, () => {
  void loadHistory();
  void loadStats24h();
  void loadBook();
});

// ---------- ticket : valeurs dérivées (spot pur, sans levier) ----------
function estimatedQty(): number {
  return amount.value / cur.value.p;
}
function estQtyLabel(): string {
  return estimatedQty().toFixed(cur.value.p < 1 ? 0 : 2) + " " + cur.value.s;
}
/** Cash disponible réel du compte (devise de référence). */
function availLabel(): string {
  return "$" + fmt(paper.balances.value?.[REFERENCE_QUOTE] ?? 0);
}

// ---------- handlers ticket ----------
function setSide(s: "buy" | "sell"): void {
  side.value = s;
}
function setPct(i: number): void {
  pctIdx.value = i;
  const pct = [25, 50, 75, 100][i] ?? 100;
  const cash = paper.balances.value?.[REFERENCE_QUOTE] ?? 0;
  amount.value = Math.round((cash * pct) / 100);
}
function onAmountInput(e: Event): void {
  const raw = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, "");
  amount.value = parseFloat(raw) || 0;
  pctIdx.value = -1;
}

// Valeur affichée du champ montant (séparateurs de milliers).
function amountDisplay(): string {
  return amount.value.toLocaleString("en-US");
}

// ---------- positions = avoirs réels du compte (spot) ----------
interface PosRow {
  pair: string;
  sideCls: "l" | "s";
  sideLabel: string;
  size: string;
  px: string;
  pnl: string;
  pnlCls: "up" | "down";
  closed: boolean;
}
const positions = computed<PosRow[]>(() => {
  const bal = paper.balances.value;
  if (bal === null) {
    return [];
  }
  return Object.entries(bal)
    .filter(([ccy, amt]) => ccy !== REFERENCE_QUOTE && amt > 0)
    .map(([ccy, amt]) => {
      const price = livePrices.value[ccy];
      return {
        pair: `${ccy}/${REFERENCE_QUOTE}`,
        sideCls: "l",
        sideLabel: "SPOT",
        size: fmt(amt),
        px: price !== undefined ? fmt(price) : "—",
        // Pas de prix d'entrée stocké (moteur sans cost-basis) → valeur de marché.
        pnl: price !== undefined ? "$" + fmt(amt * price) : "—",
        pnlCls: "up",
        closed: false,
      };
    });
});

/** Ferme une position = vend tout l'avoir de l'actif (ordre paper réel). */
async function closePos(row: PosRow): Promise<void> {
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
function placeLabel(): string {
  if (placeOverride.value) return placeOverride.value;
  if (mode.value === "live") {
    if (!liveConfigured()) return t("liveNotConfigured");
    if (cur.value.s !== "XRP") return t("liveXrpOnly");
    return t(side.value === "buy" ? "buyAsset" : "sellAsset", { asset: cur.value.s }) + " · Live";
  }
  if (!session.walletConnected.value) {
    return t("connectToTrade");
  }
  return t(side.value === "buy" ? "buyAsset" : "sellAsset", { asset: cur.value.s });
}
async function placeOrderBackground(): Promise<void> {
  // Ordre paper réel en arrière-plan ; les erreurs sont avalées par le composable.
  try {
    // On n'exécute un ordre réel que pour un actif que le backend sait coter :
    // un actif non coté serait détenu sans prix et casserait le calcul d'équité.
    if (livePrices.value[cur.value.s] === undefined) {
      return;
    }
    if (!session.walletConnected.value) {
      wallet.connect();
      return;
    }
    if (!paper.connected.value) {
      await paper.connect();
    }
    // Spot pur : on dépense `amount` en devise de référence ; le moteur paper
    // n'a pas de marge.
    const order: MarketOrderInput = {
      pair: { base: cur.value.s, quote: REFERENCE_QUOTE },
      side: side.value,
      amount: amount.value / cur.value.p,
      price: cur.value.p,
    };
    await paper.placeOrder(order);
  } catch {
    // API indisponible : sans effet sur l'UX.
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
  if (!session.walletConnected.value) {
    wallet.connect();
    return;
  }
  placeOverride.value = t("orderSent");
  setTimeout(() => {
    placeOverride.value = "";
  }, 1400);
  void placeOrderBackground();
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
  if (session.walletConnected.value) {
    await paper.connect();
  }
}

// ---------- cycle de vie ----------
onMounted(() => {
  renderChart();
  void loadBook();
  window.addEventListener("resize", renderChart);
  void initDashboard();
});
onUnmounted(() => {
  window.removeEventListener("resize", renderChart);
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
          <button v-if="session.walletConnected.value" class="wchip" @click="session.disconnectWallet()">
            <span class="dot"></span>{{ shorten(session.liveAddress.value) }}
            <span class="via">· {{ walletKind() }}</span>
          </button>
          <button v-else class="wchip warn" @click="wallet.connect()">
            <span class="dot"></span>{{ t('connectToTrade') }}
          </button>
        </template>
        <template v-else>
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
            <button :class="{ on: chartType === 'candles' }" :title="t('candles')" @click="setChartType('candles')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="6" width="3" height="12" rx="1" /><rect x="6" y="3" width="1" height="18" /><rect x="16" y="9" width="3" height="9" rx="1" /><rect x="17" y="5" width="1" height="16" /></svg>
            </button>
            <button :class="{ on: chartType === 'line' }" :title="t('line')" @click="setChartType('line')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 17l5-6 4 3 8-9" /></svg>
            </button>
          </div>
        </div>
        <div class="chart-wrap">
          <svg ref="chartSvg" viewBox="0 0 820 400" preserveAspectRatio="none" v-html="chartHtml"></svg>
        </div>
      </div>

      <div class="card pos">
        <div class="pos-tabs">
          <button class="on">{{ t('positionsTab') }} <span class="cnt">{{ positions.length }}</span></button>
        </div>
        <div class="ptable">
          <div class="pthead">
            <div>{{ t('market') }}</div><div>{{ t('side') }}</div><div>{{ t('size') }}</div><div>{{ t('entryToMarket') }}</div><div>PnL</div><div></div>
          </div>
          <div
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
        </div>
      </div>
    </section>

    <!-- RIGHT -->
    <aside class="col">
      <div class="card ticket">
        <div class="bs">
          <button class="buy" :class="{ on: side === 'buy' }" @click="setSide('buy')">{{ t('buy') }}</button>
          <button class="sell" :class="{ on: side === 'sell' }" @click="setSide('sell')">{{ t('sell') }}</button>
        </div>
        <div class="field">
          <div class="fl"><span class="k">{{ t('amount') }}</span><span class="b">{{ t('available') }} {{ availLabel() }}</span></div>
          <div class="inp">
            <input type="text" :value="amountDisplay()" @input="onAmountInput" /><span class="suf">RLUSD</span>
          </div>
        </div>
        <div class="pcts">
          <button v-for="(p, i) in [25, 50, 75, 100]" :key="p" :class="{ on: pctIdx === i }" @click="setPct(i)">
            {{ p }}%
          </button>
        </div>
        <div class="summary">
          <div class="r"><span>{{ t('estQty') }}</span><b>{{ estQtyLabel() }}</b></div>
          <div class="r"><span>{{ t('estFees') }}</span><b>$0.00</b></div>
        </div>
        <button class="placebtn" :class="{ sell: side === 'sell' }" :disabled="mode === 'live' && !liveTradable()" @click="onPlace">{{ placeLabel() }}</button>
      </div>

      <div class="card book">
        <div class="bh"><span class="t">{{ t('orderBook') }}</span><span class="lab">{{ bookSourceLabel() }}</span></div>
        <div class="bk-head"><div>{{ t('price') }}</div><div>{{ t('size') }}</div><div>{{ t('total') }}</div></div>
        <template v-if="book !== null">
          <div
            v-for="row in book.asks"
            :key="`ask-${row.price}-${row.total}`"
            class="bk ask"
          >
            <span class="depth" :style="{ width: rowWidth(row.total, book.asks[book.asks.length - 1]?.total ?? row.total) }"></span>
            <span class="px">{{ fmt(row.price) }}</span>
            <span class="d">{{ fmt(row.size) }}</span>
            <span class="d">{{ fmt(row.total) }}</span>
          </div>
          <div class="bk-spread">{{ fmt(book.mid) }} &nbsp;·&nbsp; spread {{ book.spread.toFixed(4) }}</div>
          <div
            v-for="row in book.bids"
            :key="`bid-${row.price}-${row.total}`"
            class="bk bid"
          >
            <span class="depth" :style="{ width: rowWidth(row.total, book.bids[book.bids.length - 1]?.total ?? row.total) }"></span>
            <span class="px">{{ fmt(row.price) }}</span>
            <span class="d">{{ fmt(row.size) }}</span>
            <span class="d">{{ fmt(row.total) }}</span>
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
  overflow-y: auto;
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
}
.chart-wrap svg {
  width: 100%;
  height: 100%;
  display: block;
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
.chart-wrap :deep(.candle) {
  transition: opacity 0.5s var(--ease);
}

/* positions card */
.pos {
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
.ptrow .pair {
  font-family: var(--disp);
  font-weight: 700;
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
  padding: 16px;
  flex-shrink: 0;
}
.bs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-radius: 11px;
  overflow: hidden;
  border: 1px solid var(--line);
  margin-bottom: 16px;
}
.bs button {
  border: none;
  background: var(--panel2);
  color: var(--soft);
  font-weight: 800;
  font-size: 14px;
  padding: 13px;
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
  margin-bottom: 14px;
}
.field .fl {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
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
  padding: 13px 0;
  outline: none;
  width: 100%;
}
.inp .suf {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--soft);
  font-weight: 500;
}
.pcts {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}
.pcts button {
  flex: 1;
  border: 1px solid var(--line);
  background: none;
  color: var(--soft);
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  padding: 8px 0;
  border-radius: 8px;
  transition: 0.15s;
}
.pcts button:hover,
.pcts button.on {
  border-color: var(--blue);
  color: #fff;
  background: rgba(79, 106, 255, 0.16);
}
.summary {
  font-size: 12px;
  margin-bottom: 16px;
}
.summary .r {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
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
  padding: 16px;
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
