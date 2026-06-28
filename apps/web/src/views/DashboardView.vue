<script setup lang="ts">
// Terminal de trading — porté depuis design_site/dashboard.html.
// Bento 3 colonnes : watchlist, chart + positions, ticket + carnet d'ordres.
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { TideClient } from "@tide/client";
import type { MarketOrderInput } from "@tide/core";
import { MARKETS, fmtNum, type Market } from "../data/markets";
import { usePaper } from "../composables/usePaper";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();

const { t } = useI18n({
  en: {
    markets: "Markets",
    searchPlaceholder: "Search…",
    high24h: "24h High",
    low24h: "24h Low",
    volume24h: "24h Volume",
    funding8h: "8h Funding",
    candles: "Candles",
    line: "Line",
    tf1D: "1D",
    tf1W: "1W",
    positionsTab: "Positions",
    openOrders: "Open orders",
    history: "History",
    market: "Market",
    side: "Side",
    size: "Size",
    entryToMarket: "Entry → Market",
    close: "Close",
    closed: "Closed",
    buy: "Buy",
    sell: "Sell",
    orderLimit: "Limit",
    limitPrice: "Limit price",
    amount: "Amount",
    available: "Avail.",
    leverage: "Leverage",
    estQty: "Est. quantity",
    exposure: "Exposure ({lev}×)",
    estFees: "Est. fees",
    estLiq: "Est. liquidation",
    buyAsset: "Buy {asset}",
    sellAsset: "Sell {asset}",
    orderSent: "✓ Paper order sent",
    orderBook: "Order book",
    price: "Price",
    total: "Total",
  },
  fr: {
    markets: "Marchés",
    searchPlaceholder: "Rechercher…",
    high24h: "Haut 24h",
    low24h: "Bas 24h",
    volume24h: "Volume 24h",
    funding8h: "Funding 8h",
    candles: "Chandeliers",
    line: "Ligne",
    tf1D: "1J",
    tf1W: "1S",
    positionsTab: "Positions",
    openOrders: "Ordres ouverts",
    history: "Historique",
    market: "Marché",
    side: "Sens",
    size: "Taille",
    entryToMarket: "Entrée → Marché",
    close: "Fermer",
    closed: "Fermée",
    buy: "Acheter",
    sell: "Vendre",
    orderLimit: "Limite",
    limitPrice: "Prix limite",
    amount: "Montant",
    available: "Dispo.",
    leverage: "Levier",
    estQty: "Quantité estimée",
    exposure: "Exposition ({lev}×)",
    estFees: "Frais estimés",
    estLiq: "Liquidation approx.",
    buyAsset: "Acheter {asset}",
    sellAsset: "Vendre {asset}",
    orderSent: "✓ Ordre simulé envoyé",
    orderBook: "Carnet d'ordres",
    price: "Prix",
    total: "Total",
  },
});

// ---------- backend paper (best-effort, ne bloque jamais l'UX) ----------
const paper = usePaper(props.client);

// ---------- état réactif (équivalent du <script> source) ----------
const [FIRST_MARKET] = MARKETS;
if (!FIRST_MARKET) {
  throw new Error("MARKETS ne doit jamais être vide");
}
const cur = ref<Market>(FIRST_MARKET);
const lev = ref(3);
const side = ref<"buy" | "sell">("buy");
const amount = ref(5000);

const AVAIL = 42180;

// Type d'ordre : 0 = Marché, 1 = Limite, 2 = Stop.
const otypeIdx = ref(0);
// Index du raccourci % actif (-1 = aucun).
const pctIdx = ref(-1);

// Markup SVG injecté via v-html (chart + carnet).
const chartHtml = ref("");
const asksHtml = ref("");
const bidsHtml = ref("");

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

/** PRNG déterministe (LCG) seedé — chart/carnet stables par marché. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

// ---------- chart (port exact de renderChart) ----------
function renderChart(): void {
  const W = 820;
  const H = 400;
  const pad = 46;
  const n = 58;
  const m = cur.value;
  const r = rng(m.s.split("").reduce((a, c) => a + c.charCodeAt(0), 7));
  let price = m.lo * 0.98;
  const candles: { o: number; c: number; hi: number; lo: number }[] = [];
  for (let i = 0; i < n; i++) {
    const drift = ((m.p - price) / (n - i)) * 0.6;
    const o = price;
    const ch = (r() - 0.45) * m.p * 0.018 + drift;
    const c = o + ch;
    const hi = Math.max(o, c) + r() * m.p * 0.01;
    const lo = Math.min(o, c) - r() * m.p * 0.01;
    candles.push({ o, c, hi, lo });
    price = c;
  }
  const lastCandle = candles[n - 1];
  if (lastCandle) {
    lastCandle.c = m.p;
  }
  let mx = -1e9;
  let mn = 1e9;
  candles.forEach((k) => {
    mx = Math.max(mx, k.hi);
    mn = Math.min(mn, k.lo);
  });
  const Y = (v: number): number => pad + ((mx - v) / (mx - mn)) * (H - pad * 2);
  const cw = (W - pad - 12) / n;
  const bw = cw * 0.62;
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const y = pad + (i * (H - pad * 2)) / 4;
    const v = mx - ((mx - mn) * i) / 4;
    g += `<line class="gridln" x1="0" y1="${y}" x2="${W - pad}" y2="${y}"/><text class="axis" x="${W - pad + 6}" y="${y + 3}">${fmt(v)}</text>`;
  }
  candles.forEach((k, i) => {
    const x = 8 + i * cw + cw / 2;
    const up = k.c >= k.o;
    const col = up ? "var(--up)" : "var(--down)";
    const yb = Y(Math.max(k.o, k.c));
    const yt = Y(Math.min(k.o, k.c));
    g += `<line class="candle" x1="${x}" y1="${Y(k.hi)}" x2="${x}" y2="${Y(k.lo)}" stroke="${col}" stroke-width="1"/>`;
    g += `<rect class="candle" x="${x - bw / 2}" y="${yb}" width="${bw}" height="${Math.max(1, yt - yb)}" fill="${col}" rx="1"/>`;
  });
  const ly = Y(m.p);
  g += `<line x1="0" y1="${ly}" x2="${W - pad}" y2="${ly}" stroke="var(--blue)" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/>`;
  g += `<rect x="${W - pad}" y="${ly - 9}" width="${pad}" height="18" fill="var(--blue)" rx="3"/><text class="axis" x="${W - pad + 5}" y="${ly + 3}" fill="#fff" style="font-weight:700">${fmt(m.p)}</text>`;
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

// ---------- carnet d'ordres (port exact de renderBook) ----------
function renderBook(): void {
  const m = cur.value;
  const r = rng(m.s.length * 13 + 5);
  const p = m.p;
  const step = p * 0.0006;
  const rowsA: { px: number; sz: number }[] = [];
  for (let i = 8; i >= 1; i--) rowsA.push({ px: p + step * i, sz: r() * 60 + 5 });
  const at = rowsA.reduce((a, o) => a + o.sz, 0);
  let cum = 0;
  let asks = "";
  rowsA.forEach((o) => {
    cum += o.sz;
    asks += `<div class="bk ask"><span class="depth" style="width:${(cum / at) * 100}%"></span><span class="px">${fmt(o.px)}</span><span class="d">${o.sz.toFixed(2)}</span><span class="d">${cum.toFixed(1)}</span></div>`;
  });
  const rowsB: { px: number; sz: number }[] = [];
  for (let i = 1; i <= 8; i++) rowsB.push({ px: p - step * i, sz: r() * 60 + 5 });
  const bt = rowsB.reduce((a, o) => a + o.sz, 0);
  cum = 0;
  let bids = "";
  rowsB.forEach((o) => {
    cum += o.sz;
    bids += `<div class="bk bid"><span class="depth" style="width:${(cum / bt) * 100}%"></span><span class="px">${fmt(o.px)}</span><span class="d">${o.sz.toFixed(2)}</span><span class="d">${cum.toFixed(1)}</span></div>`;
  });
  asksHtml.value = asks;
  bidsHtml.value = bids;
}

// ---------- sélection de marché ----------
function selectMarket(m: Market): void {
  cur.value = m;
}

// Re-render chart + carnet quand le marché change.
watch(cur, () => {
  renderChart();
  renderBook();
});

// ---------- ticket : valeurs dérivées (port de updateTicket) ----------
function estimatedQty(): number {
  return (amount.value * lev.value) / cur.value.p;
}
function estQtyLabel(): string {
  return estimatedQty().toFixed(cur.value.p < 1 ? 0 : 2) + " " + cur.value.s;
}
function exposureLabel(): string {
  return "$" + fmt(amount.value * lev.value);
}
function liqLabel(): string {
  const m = cur.value;
  const liq = side.value === "buy" ? m.p * (1 - 0.9 / lev.value) : m.p * (1 + 0.9 / lev.value);
  return "$" + fmt(liq);
}

// ---------- handlers ticket ----------
function setSide(s: "buy" | "sell"): void {
  side.value = s;
}
function setOtype(i: number): void {
  otypeIdx.value = i;
}
function levUp(): void {
  lev.value = Math.min(20, lev.value + 1);
}
function levDown(): void {
  lev.value = Math.max(1, lev.value - 1);
}
function setPct(i: number): void {
  pctIdx.value = i;
  const pct = [25, 50, 75, 100][i] ?? 100;
  amount.value = Math.round((AVAIL * pct) / 100);
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

// ---------- positions (lignes statiques) ----------
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
const positions = ref<PosRow[]>([
  { pair: "SOL/USDC", sideCls: "l", sideLabel: "LONG 3×", size: "820", px: "156.40 → 184.20", pnl: "+$22,796", pnlCls: "up", closed: false },
  { pair: "BTC/USDC", sideCls: "l", sideLabel: "LONG 2×", size: "0.62", px: "59,900 → 67,412", pnl: "+$9,315", pnlCls: "up", closed: false },
  { pair: "ETH/USDC", sideCls: "s", sideLabel: "SHORT 2×", size: "14", px: "3,090 → 3,188", pnl: "−$2,744", pnlCls: "down", closed: false },
]);
function closePos(row: PosRow): void {
  row.closed = true;
}

// ---------- bouton placer (UX optimiste + ordre paper réel best-effort) ----------
const placeOverride = ref("");
function placeLabel(): string {
  if (placeOverride.value) return placeOverride.value;
  return t(side.value === "buy" ? "buyAsset" : "sellAsset", { asset: cur.value.s });
}
async function placeOrderBackground(): Promise<void> {
  // Ordre paper réel en arrière-plan ; les erreurs sont avalées par le composable.
  try {
    if (!paper.connected.value) {
      paper.userId.value = "0xPilote.eth";
      await paper.connect();
    }
    const order: MarketOrderInput = {
      pair: { base: cur.value.s, quote: "USDC" },
      side: side.value,
      amount: estimatedQty(),
      price: cur.value.p,
    };
    await paper.placeOrder(order);
  } catch {
    // API indisponible : sans effet sur l'UX.
  }
}
function onPlace(): void {
  placeOverride.value = t("orderSent");
  setTimeout(() => {
    placeOverride.value = "";
  }, 1400);
  void placeOrderBackground();
}

// ---------- cycle de vie ----------
onMounted(() => {
  renderChart();
  renderBook();
  window.addEventListener("resize", renderChart);
});
onUnmounted(() => {
  window.removeEventListener("resize", renderChart);
});
</script>

<template>
  <div class="main">
    <!-- WATCHLIST -->
    <aside class="card watch">
      <div class="wt-head"><span class="t">{{ t('markets') }}</span><span class="lab">24h</span></div>
      <div class="srch"><span class="soft">⌕</span><input :placeholder="t('searchPlaceholder')" /></div>
      <div class="wl-scroll">
        <div
          v-for="m in MARKETS"
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
            <div class="c" :class="cur.c >= 0 ? 'up' : 'down'">{{ cur.c >= 0 ? "+" : "" }}{{ cur.c }}% (24h)</div>
          </div>
          <div class="scell"><div class="l">{{ t('high24h') }}</div><div class="v">${{ fmt(cur.hi) }}</div></div>
          <div class="scell"><div class="l">{{ t('low24h') }}</div><div class="v">${{ fmt(cur.lo) }}</div></div>
          <div class="scell"><div class="l">{{ t('volume24h') }}</div><div class="v">$2.81B</div></div>
          <div class="scell"><div class="l">{{ t('funding8h') }}</div><div class="v up">+0.011%</div></div>
        </div>
        <div class="chart-bar">
          <div class="tf">
            <button>15m</button><button>1H</button><button>4H</button><button class="on">{{ t('tf1D') }}</button><button>{{ t('tf1W') }}</button>
          </div>
          <div class="ct-type">
            <button class="on" :title="t('candles')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="6" width="3" height="12" rx="1" /><rect x="6" y="3" width="1" height="18" /><rect x="16" y="9" width="3" height="9" rx="1" /><rect x="17" y="5" width="1" height="16" /></svg>
            </button>
            <button :title="t('line')">
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
          <button class="on">{{ t('positionsTab') }} <span class="cnt">3</span></button>
          <button>{{ t('openOrders') }} <span class="cnt">1</span></button>
          <button>{{ t('history') }}</button>
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
        <div class="otype">
          <button :class="{ on: otypeIdx === 0 }" @click="setOtype(0)">{{ t('market') }}</button>
          <button :class="{ on: otypeIdx === 1 }" @click="setOtype(1)">{{ t('orderLimit') }}</button>
          <button :class="{ on: otypeIdx === 2 }" @click="setOtype(2)">Stop</button>
        </div>
        <div v-if="otypeIdx !== 0" class="field">
          <div class="fl"><span class="k">{{ t('limitPrice') }}</span></div>
          <div class="inp"><input type="text" value="184.20" /><span class="suf">USDC</span></div>
        </div>
        <div class="field">
          <div class="fl"><span class="k">{{ t('amount') }}</span><span class="b">{{ t('available') }} $42,180</span></div>
          <div class="inp">
            <input type="text" :value="amountDisplay()" @input="onAmountInput" /><span class="suf">USDC</span>
          </div>
        </div>
        <div class="pcts">
          <button v-for="(p, i) in [25, 50, 75, 100]" :key="p" :class="{ on: pctIdx === i }" @click="setPct(i)">
            {{ p }}%
          </button>
        </div>
        <div class="lev">
          <span class="k">{{ t('leverage') }}</span>
          <div class="ctrl">
            <button @click="levDown">−</button>
            <span class="vv">{{ lev }}×</span>
            <button @click="levUp">+</button>
          </div>
        </div>
        <div class="summary">
          <div class="r"><span>{{ t('estQty') }}</span><b>{{ estQtyLabel() }}</b></div>
          <div class="r"><span>{{ t('exposure', { lev }) }}</span><b>{{ exposureLabel() }}</b></div>
          <div class="r"><span>{{ t('estFees') }}</span><b>$0.00</b></div>
          <div class="r"><span>{{ t('estLiq') }}</span><b>{{ liqLabel() }}</b></div>
        </div>
        <button class="placebtn" :class="{ sell: side === 'sell' }" @click="onPlace">{{ placeLabel() }}</button>
      </div>

      <div class="card book">
        <div class="bh"><span class="t">{{ t('orderBook') }}</span><span class="lab">{{ cur.s }}/USDC</span></div>
        <div class="bk-head"><div>{{ t('price') }}</div><div>{{ t('size') }}</div><div>{{ t('total') }}</div></div>
        <div v-html="asksHtml"></div>
        <div class="bk-spread">{{ fmt(cur.p) }} &nbsp;·&nbsp; spread {{ (cur.p * 0.0001).toFixed(cur.p < 1 ? 4 : 2) }}</div>
        <div v-html="bidsHtml"></div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* ---------- MAIN (bento d'écrans sombres sur fond bleu) ---------- */
.main {
  display: grid;
  grid-template-columns: 250px 1fr 336px;
  gap: 14px;
  padding: 0 18px 18px;
  height: calc(100vh - 64px);
}
@media (max-width: 1200px) {
  .main {
    grid-template-columns: 1fr 336px;
    height: auto;
  }
  .watch {
    display: none;
  }
}
@media (max-width: 780px) {
  .main {
    grid-template-columns: 1fr;
    height: auto;
  }
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
.otype {
  display: flex;
  gap: 18px;
  margin-bottom: 16px;
}
.otype button {
  border: none;
  background: none;
  color: var(--soft);
  font-weight: 600;
  font-size: 12.5px;
  padding: 0 0 4px;
  position: relative;
}
.otype button.on {
  color: var(--text);
}
.otype button.on::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--text);
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
.lev {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 11px 13px;
  margin-bottom: 16px;
}
.lev .k {
  font-size: 12px;
  color: var(--soft);
}
.lev .ctrl {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lev .ctrl button {
  width: 26px;
  height: 26px;
  border: 1px solid var(--line2);
  background: none;
  color: var(--text);
  border-radius: 7px;
  font-size: 15px;
  line-height: 1;
}
.lev .ctrl .vv {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 14px;
  min-width: 34px;
  text-align: center;
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
/* Lignes du carnet injectées via v-html (#asks/#bids) → :deep() obligatoire. */
.book :deep(.bk) {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 3.5px 0;
  font-family: var(--mono);
  font-size: 11.5px;
}
.book :deep(.bk .d) {
  text-align: right;
  color: var(--soft);
}
.book :deep(.bk .depth) {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  opacity: 0.12;
  border-radius: 2px;
}
.book :deep(.bk.ask .depth) {
  background: var(--down);
}
.book :deep(.bk.bid .depth) {
  background: var(--up);
}
.book :deep(.bk.ask .px) {
  color: var(--down);
}
.book :deep(.bk.bid .px) {
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
</style>
