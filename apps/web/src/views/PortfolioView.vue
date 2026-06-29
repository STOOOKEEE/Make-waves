<script setup lang="ts">
/* Portefeuille du compte de session. Données réelles : KPIs (équité, cash,
 * PnL, rang), avoirs valorisés, donut de répartition, activité (ordres réels).
 * Décor assumé (pas d'historique côté backend) : tracé de la courbe d'équité et
 * statistiques de trading (win-rate, meilleur/pire trade). */

import { computed, onMounted, ref } from "vue";
import type { Fill } from "@tide/core";
import type { Portfolio, TideClient } from "@tide/client";
import SegControl from "../components/SegControl.vue";
import { ALLOC_PALETTE, fmtNum } from "../data/markets";
import { useSession } from "../composables/useSession";
import { errorMessage } from "../composables/messages";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();
const { userId, connected } = useSession();

const { t } = useI18n({
  en: {
    title: "Portfolio",
    subtitle: "Demo capital $100,000 · Season 04 — real-time performance.",
    connectPrompt: "Connect the terminal to load your real portfolio.",
    tf24H: "24H",
    tf7J: "7D",
    tf30J: "30D",
    tfS04: "S04",
    tfMax: "Max",
    kpiTotalEquity: "Total equity",
    kpiAvailable: "Available",
    kpiFreeCash: "free cash",
    kpiPnlToday: "Session PnL",
    kpiInvested: "Invested",
    nPositions: "{n} positions",
    kpiSeasonRank: "Season rank",
    rankUpToday: "↑ {n} today",
    equityCurve: "Equity curve",
    lastNDays: "Last {n} days",
    allocation: "Allocation",
    byAsset: "by asset",
    invested: "invested",
    positionsHoldings: "Positions & holdings",
    colAsset: "Asset",
    colQuantity: "Quantity",
    colAvgPrice: "Avg price",
    colValue: "Value",
    colPnl: "PnL",
    colAllocation: "Allocation",
    tradingStats: "Trading stats",
    winDesc: "{wins} winning trades out of {total} this quarter. Avg win/loss ratio of ",
    bestTrade: "Best trade",
    worstTrade: "Worst trade",
    totalTrades: "Total trades",
    avgDuration: "Avg duration",
    recentActivity: "Recent activity",
    tagBuy: "BUY",
    tagSell: "SELL",
    actSolMeta: "12 min ago · market · 3×",
    actArbMeta: "1h ago · limit",
    actBtcMeta: "3h ago · market · 2×",
    actEthMeta: "yesterday · stop",
    actDogeMeta: "yesterday · market",
  },
  fr: {
    title: "Portefeuille",
    subtitle: "Capital de démo $100 000 · Saison 04 — performance en temps réel.",
    connectPrompt: "Connecte le terminal pour charger ton portefeuille réel.",
    tf24H: "24H",
    tf7J: "7J",
    tf30J: "30J",
    tfS04: "S04",
    tfMax: "Max",
    kpiTotalEquity: "Équité totale",
    kpiAvailable: "Disponible",
    kpiFreeCash: "cash libre",
    kpiPnlToday: "PnL session",
    kpiInvested: "Investi",
    nPositions: "{n} positions",
    kpiSeasonRank: "Rang saison",
    rankUpToday: "↑ {n} aujourd'hui",
    equityCurve: "Courbe d'équité",
    lastNDays: "{n} derniers jours",
    allocation: "Répartition",
    byAsset: "par actif",
    invested: "investi",
    positionsHoldings: "Positions & avoirs",
    colAsset: "Actif",
    colQuantity: "Quantité",
    colAvgPrice: "Prix moyen",
    colValue: "Valeur",
    colPnl: "PnL",
    colAllocation: "Allocation",
    tradingStats: "Statistiques de trading",
    winDesc: "{wins} trades gagnants sur {total} ce trimestre. Ratio gain/perte moyen de ",
    bestTrade: "Meilleur trade",
    worstTrade: "Pire trade",
    totalTrades: "Total trades",
    avgDuration: "Durée moy.",
    recentActivity: "Activité récente",
    tagBuy: "ACHAT",
    tagSell: "VENTE",
    actSolMeta: "il y a 12 min · marché · 3×",
    actArbMeta: "il y a 1 h · limite",
    actBtcMeta: "il y a 3 h · marché · 2×",
    actEthMeta: "hier · stop",
    actDogeMeta: "hier · marché",
  },
});

/* ---- Données réelles du compte de session ---- */
const REFERENCE_CCY = "RLUSD";
const portfolio = ref<Portfolio | null>(null);
const activity = ref<readonly Fill[]>([]);
const rank = ref<number | null>(null);
const loadError = ref("");

async function loadPortfolio(): Promise<void> {
  if (!connected.value) {
    return;
  }
  try {
    await props.client.ensureAccount(userId.value);
    portfolio.value = await props.client.portfolio(userId.value);
    activity.value = await props.client.orders(userId.value);
    const board = await props.client.leaderboard();
    rank.value = board.find((e) => e.userId === userId.value)?.rank ?? null;
  } catch (e) {
    loadError.value = errorMessage(e);
  }
}

const equityValue = computed(() => portfolio.value?.equity ?? 0);
const pnlValue = computed(() => portfolio.value?.pnl ?? 0);
const freeCash = computed(() => portfolio.value?.balances[REFERENCE_CCY] ?? 0);
const pnlPct = computed(() => {
  const start = equityValue.value - pnlValue.value; // capital de départ
  return start > 0 ? (pnlValue.value / start) * 100 : 0;
});

/** Avoir valorisé + part d'allocation (sur l'équité totale). */
interface HoldingRow {
  currency: string;
  amount: number;
  value: number;
  alloc: number;
}
const holdings = computed<HoldingRow[]>(() => {
  const p = portfolio.value;
  if (p === null || p.equity <= 0) {
    return [];
  }
  return p.holdings.map((h) => ({
    currency: h.currency,
    amount: h.amount,
    value: h.value,
    alloc: (h.value / p.equity) * 100,
  }));
});
const positionsCount = computed(
  () => holdings.value.filter((h) => h.currency !== REFERENCE_CCY).length,
);
const investedValue = computed(() =>
  holdings.value
    .filter((h) => h.currency !== REFERENCE_CCY)
    .reduce((a, h) => a + h.value, 0),
);

function signed(value: number): string {
  return (value >= 0 ? "+" : "−") + "$" + fmtNum(Math.abs(value));
}

// Ordres réels les plus récents d'abord (le store les conserve dans l'ordre).
const recentActivity = computed(() => [...activity.value].reverse().slice(0, 6));

/* ---- timeframe segmenté (défaut 30J) ---- */
const TIMEFRAMES = computed(() => [
  { value: "24H", label: t("tf24H") },
  { value: "7J", label: t("tf7J") },
  { value: "30J", label: t("tf30J") },
  { value: "S04", label: t("tfS04") },
  { value: "Max", label: t("tfMax") },
]);
const timeframe = ref("30J");

/* ---- courbe d'équité (porté de eqCurve()) ---- */
const eqEl = ref<HTMLElement | null>(null);
const eqMarkup = ref("");

/* RNG seedé (LCG) — identique à la source. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function eqCurve(): void {
  const W = 760;
  const H = 260;
  const pad = 30;
  const n = 42;
  const r = rng(99);
  let v = 100;
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    v += (r() - 0.4) * 3.2 + 0.55;
    pts.push(Math.max(96, v));
  }
  pts[n - 1] = 128.94;
  let mx = Math.max(...pts);
  let mn = Math.min(...pts);
  mx += 2;
  mn -= 2;
  const X = (i: number): number => pad + (i / (n - 1)) * (W - pad * 2);
  const Y = (val: number): number => pad + ((mx - val) / (mx - mn)) * (H - pad * 2);
  let d = "M" + X(0) + "," + Y(pts[0] ?? 0);
  pts.forEach((p, i) => {
    if (i) d += " L" + X(i) + "," + Y(p);
  });
  let g = "";
  for (let i = 0; i <= 3; i++) {
    const y = pad + (i * (H - pad * 2)) / 3;
    const val = mx - ((mx - mn) * i) / 3;
    g += `<line class="gridln" x1="0" y1="${y}" x2="${W}" y2="${y}"/><text class="axis" x="6" y="${y - 5}">$${val.toFixed(0)}K</text>`;
  }
  g += `<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BFF6CE" stop-opacity=".26"/><stop offset="100%" stop-color="#BFF6CE" stop-opacity="0"/></linearGradient></defs>`;
  g += `<path class="fp" fill="url(#eg)" d="${d} L${X(n - 1)},${H} L${X(0)},${H} Z"/>`;
  g += `<path class="ln" d="${d}"/>`;
  eqMarkup.value = g;
}

/* Au changement de timeframe : retire .in, recalcule, ré-ajoute .in à la frame
 * suivante pour relancer l'animation de tracé (mirroir de la source). */
function onTimeframe(): void {
  const el = eqEl.value;
  if (el) el.classList.remove("in");
  eqCurve();
  requestAnimationFrame(() => {
    if (eqEl.value) eqEl.value.classList.add("in");
  });
}

/* ---- donut de répartition (avoirs réels valorisés) ---- */
const donutMarkup = computed(() => {
  const rows = holdings.value;
  const total = rows.reduce((a, h) => a + h.value, 0);
  if (total <= 0) {
    return "";
  }
  const R = 62;
  const C = 2 * Math.PI * R;
  let off = 0;
  let svg = "";
  rows.forEach((h, i) => {
    const len = (h.value / total) * C;
    svg += `<circle cx="75" cy="75" r="${R}" fill="none" stroke="${ALLOC_PALETTE[i % ALLOC_PALETTE.length]}" stroke-width="20" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"/>`;
    off += len;
  });
  return svg;
});

onMounted(() => {
  eqCurve();
  void loadPortfolio();
});
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>{{ t("title") }}</h1>
        <p>{{ t("subtitle") }}</p>
      </div>
      <SegControl v-model="timeframe" :options="TIMEFRAMES" @update:model-value="onTimeframe" />
    </div>

    <!-- Invite de connexion si aucune session active -->
    <div v-if="!connected" class="card connect-note" v-reveal>{{ t("connectPrompt") }}</div>

    <!-- KPIs (compte de session) -->
    <div class="kpis">
      <div class="card kpi" v-reveal="60"><div class="l">{{ t("kpiTotalEquity") }}</div><div class="v">${{ fmtNum(equityValue) }}</div><div class="s" :class="pnlPct >= 0 ? 'up' : 'down'">{{ pnlPct >= 0 ? "+" : "" }}{{ pnlPct.toFixed(2) }}%</div></div>
      <div class="card kpi" v-reveal="60"><div class="l">{{ t("kpiAvailable") }}</div><div class="v">${{ fmtNum(freeCash) }}</div><div class="s soft">{{ t("kpiFreeCash") }}</div></div>
      <div class="card kpi" v-reveal="60"><div class="l">{{ t("kpiPnlToday") }}</div><div class="v" :class="pnlValue >= 0 ? 'up' : 'down'">{{ signed(pnlValue) }}</div><div class="s" :class="pnlPct >= 0 ? 'up' : 'down'">{{ pnlPct >= 0 ? "+" : "" }}{{ pnlPct.toFixed(2) }}%</div></div>
      <div class="card kpi" v-reveal="60"><div class="l">{{ t("kpiInvested") }}</div><div class="v">${{ fmtNum(investedValue) }}</div><div class="s soft">{{ t("nPositions", { n: positionsCount }) }}</div></div>
      <div class="card kpi" v-reveal="60"><div class="l">{{ t("kpiSeasonRank") }}</div><div class="v">{{ rank === null ? "—" : "#" + rank }}</div><div class="s soft">{{ t("tfS04") }}</div></div>
    </div>

    <!-- equity + allocation -->
    <div class="grid2">
      <div class="card" v-reveal>
        <div class="ch-head"><div><div class="t">{{ t("equityCurve") }}</div><div class="big" :class="pnlValue >= 0 ? 'up' : 'down'">${{ fmtNum(equityValue) }}</div></div><div class="lab">{{ t("lastNDays", { n: 30 }) }}</div></div>
        <div ref="eqEl" class="eqchart" v-reveal>
          <svg viewBox="0 0 760 260" preserveAspectRatio="none" v-html="eqMarkup"></svg>
        </div>
      </div>
      <div class="card alloc" v-reveal>
        <div class="t">{{ t("allocation") }}</div>
        <div class="lab">{{ t("byAsset") }}</div>
        <div class="donut-wrap">
          <div class="donut">
            <svg width="150" height="150" viewBox="0 0 150 150" v-html="donutMarkup"></svg>
            <div class="mid"><b>${{ fmtNum(investedValue) }}</b><span>{{ t("invested") }}</span></div>
          </div>
          <div class="leg">
            <div v-for="(h, i) in holdings" :key="h.currency" class="li">
              <span class="dot" :style="{ background: ALLOC_PALETTE[i % ALLOC_PALETTE.length] }"></span>{{ h.currency }}<span class="pc">{{ h.alloc.toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- holdings -->
    <div class="card hold" v-reveal>
      <div class="hh">{{ t("positionsHoldings") }}</div>
      <div class="thead"><div>{{ t("colAsset") }}</div><div>{{ t("colQuantity") }}</div><div>{{ t("colAvgPrice") }}</div><div>{{ t("colValue") }}</div><div>{{ t("colPnl") }}</div><div>{{ t("colAllocation") }}</div></div>
      <div>
        <div v-if="holdings.length === 0" class="trow empty">—</div>
        <div v-for="(h, i) in holdings" :key="h.currency" class="trow">
          <div class="as"><span class="ic" :style="{ background: ALLOC_PALETTE[i % ALLOC_PALETTE.length] }">{{ h.currency.slice(0, 3) }}</span><span><b>{{ h.currency }}</b><span>spot</span></span></div>
          <div>{{ fmtNum(h.amount) }}</div>
          <div class="soft">—</div>
          <div>${{ fmtNum(h.value) }}</div>
          <div class="soft">—</div>
          <div>{{ h.alloc.toFixed(0) }}%<div class="allocbar"><i :style="{ width: Math.min(h.alloc, 100) + '%', background: ALLOC_PALETTE[i % ALLOC_PALETTE.length] }"></i></div></div>
        </div>
      </div>
    </div>

    <!-- stats + activity -->
    <div class="grid3">
      <div class="card stats-card" v-reveal>
        <div class="t">{{ t("tradingStats") }}</div>
        <div class="winring">
          <div class="ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--panel2)" stroke-width="9" />
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--up)" stroke-width="9" stroke-linecap="round" stroke-dasharray="251.2" stroke-dashoffset="78" />
            </svg>
            <div class="c"><b>69%</b><span>WIN RATE</span></div>
          </div>
          <div class="desc">{{ t("winDesc", { wins: 142, total: 206 }) }}<b style="color: #fff">2.4×</b>.</div>
        </div>
        <div class="minis">
          <div class="mini"><div class="l">{{ t("bestTrade") }}</div><div class="v up">+$18,420</div></div>
          <div class="mini"><div class="l">{{ t("worstTrade") }}</div><div class="v down">−$4,910</div></div>
          <div class="mini"><div class="l">{{ t("totalTrades") }}</div><div class="v">206</div></div>
          <div class="mini"><div class="l">{{ t("avgDuration") }}</div><div class="v">4h 12m</div></div>
        </div>
      </div>

      <div class="card act" v-reveal>
        <div class="hh">{{ t("recentActivity") }}</div>
        <div v-if="recentActivity.length === 0" class="arow soft">—</div>
        <div v-for="(f, i) in recentActivity" :key="i" class="arow">
          <span class="tag" :class="f.side === 'buy' ? 'b' : 's'">{{ f.side === "buy" ? t("tagBuy") : t("tagSell") }}</span>
          <div class="mn"><b>{{ f.pair.base }} / {{ f.pair.quote }}</b><span>market</span></div>
          <div class="amt">{{ f.side === "buy" ? "+" : "−" }}{{ fmtNum(f.amount) }} {{ f.pair.base }}<span>${{ fmtNum(f.quoteAmount) }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 560px) {
  .kpis {
    grid-template-columns: 1fr;
  }
}
.kpi {
  padding: 22px 22px;
}
.kpi .l {
  font-size: 12px;
  color: var(--soft);
  margin-bottom: 12px;
}
.kpi .v {
  font-family: var(--mono);
  font-weight: 700;
  font-size: clamp(26px, 2.4vw, 34px);
  letter-spacing: -0.02em;
  line-height: 1;
}
.kpi .s {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  margin-top: 9px;
}

.grid2 {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 980px) {
  .grid2 {
    grid-template-columns: 1fr;
  }
}
.ch-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 22px 0;
}
.ch-head .t {
  font-weight: 700;
  font-size: 16px;
}
.ch-head .big {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 26px;
  letter-spacing: -0.02em;
  margin-top: 4px;
}
.eqchart {
  height: 280px;
  padding: 10px 8px 4px;
}
.eqchart svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
/* NB : le SVG est injecté via v-html → les sélecteurs doivent percer le scope
 * avec :deep(), sinon ils ne ciblent pas le contenu injecté (pas de data-v-…). */
.eqchart :deep(.ln) {
  fill: none;
  stroke: var(--up);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  transition: stroke-dashoffset 2.4s var(--ease) 0.2s;
}
.eqchart.in :deep(.ln) {
  stroke-dashoffset: 0;
}
.eqchart :deep(.fp) {
  opacity: 0;
  transition: opacity 1.1s ease 1.5s;
}
.eqchart.in :deep(.fp) {
  opacity: 1;
}
.eqchart :deep(.axis) {
  font-family: var(--mono);
  font-size: 9.5px;
  fill: var(--mut2);
}
.eqchart :deep(.gridln) {
  stroke: rgba(255, 255, 255, 0.05);
}

/* allocation donut */
.alloc {
  padding: 22px;
}
.alloc .t {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 6px;
}
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-top: 14px;
}
.donut {
  position: relative;
  width: 150px;
  height: 150px;
  flex-shrink: 0;
}
.donut svg {
  transform: rotate(-90deg);
}
.donut .mid {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}
.donut .mid b {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 700;
  display: block;
}
.donut .mid span {
  font-size: 10.5px;
  color: var(--soft);
}
.leg {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.leg .li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.leg .dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.leg .li .pc {
  margin-left: auto;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 12.5px;
}

/* holdings */
.hold {
  padding: 0;
}
.hold .hh {
  padding: 20px 22px 14px;
  font-weight: 700;
  font-size: 16px;
}
.thead,
.trow {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1.1fr 1fr 1.2fr;
  gap: 10px;
  align-items: center;
  padding: 14px 22px;
}
.thead {
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.thead div {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mut2);
}
.trow {
  border-bottom: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 13.5px;
}
.trow:last-child {
  border-bottom: none;
}
.trow .as {
  display: flex;
  align-items: center;
  gap: 11px;
  font-family: var(--disp);
}
.trow .as .ic {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 11px;
  color: #0a0a0a;
  flex-shrink: 0;
}
.trow .as b {
  font-weight: 700;
  font-size: 14px;
  display: block;
}
.trow .as span {
  font-size: 11px;
  color: var(--soft);
  font-family: var(--mono);
}
.allocbar {
  height: 6px;
  background: var(--panel2);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 6px;
}
.allocbar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--blue);
}

.grid3 {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 14px;
  margin-top: 14px;
}
@media (max-width: 980px) {
  .grid3 {
    grid-template-columns: 1fr;
  }
}
.stats-card {
  padding: 22px;
}
.stats-card .t {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 20px;
}
.winring {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 22px;
}
.winring .ring {
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
}
.winring .ring svg {
  transform: rotate(-90deg);
}
.winring .ring .c {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}
.winring .ring .c b {
  font-family: var(--mono);
  font-size: 22px;
  font-weight: 700;
}
.winring .ring .c span {
  font-size: 9.5px;
  color: var(--soft);
}
.winring .desc {
  font-size: 13px;
  color: var(--soft);
  line-height: 1.5;
}
.minis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.mini {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
}
.mini .l {
  font-size: 11px;
  color: var(--soft);
  margin-bottom: 7px;
}
.mini .v {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 18px;
}

/* activity */
.act {
  padding: 0;
}
.act .hh {
  padding: 20px 22px 14px;
  font-weight: 700;
  font-size: 16px;
}
.arow {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 14px 22px;
  border-top: 1px solid var(--line);
}
.arow .tag {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 5px;
}
.arow .tag.b {
  background: rgba(191, 246, 206, 0.16);
  color: var(--up);
}
.arow .tag.s {
  background: rgba(255, 185, 172, 0.16);
  color: var(--down);
}
.arow .mn b {
  font-weight: 700;
}
.arow .mn span {
  font-size: 11.5px;
  color: var(--soft);
  font-family: var(--mono);
  display: block;
  margin-top: 2px;
}
.arow .amt {
  font-family: var(--mono);
  font-weight: 600;
  font-size: 13.5px;
  text-align: right;
}
.arow .amt span {
  display: block;
  color: var(--soft);
  font-size: 11px;
  font-weight: 400;
}
</style>
