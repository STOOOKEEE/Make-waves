<script setup lang="ts">
/* Portefeuille du compte de session. Données réelles : KPIs (équité, cash,
 * PnL, rang), avoirs valorisés, donut de répartition, activité (ordres réels).
 * Décor assumé (pas d'historique côté backend) : tracé de la courbe d'équité et
 * statistiques de trading (win-rate, meilleur/pire trade). */

import { computed, onMounted, ref } from "vue";
import type { Fill } from "@tide/core";
import type { Portfolio, TideClient } from "@tide/client";
import { ALLOC_PALETTE, fmtNum } from "../data/markets";
import { useSession } from "../composables/useSession";
import { useBadges } from "../composables/useBadges";
import { useWallet } from "../composables/useWallet";
import { errorMessage } from "../composables/messages";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();
const { userId, connected } = useSession();
const {
  badges: badgeList,
  claiming: badgeClaiming,
  load: loadBadges,
  claim: runClaim,
} = useBadges(props.client);
const wallet = useWallet(props.client);

/** Réclame un badge : mint serveur → le user signe l'accept (wallet = userId). */
function claimBadge(code: string): void {
  void runClaim(userId.value, code, userId.value, (offerId) =>
    wallet.signBadgeAccept(offerId),
  );
}

const { t } = useI18n({
  en: {
    title: "Portfolio",
    subtitle: "Current paper account · balances, positions and activity from the backend.",
    connectPrompt: "Connect an XRP wallet to load your paper portfolio.",
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
    accountSummary: "Account summary",
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
    recentActivity: "Recent activity",
    tagBuy: "BUY",
    tagSell: "SELL",
    actSolMeta: "12 min ago · market · 3×",
    actArbMeta: "1h ago · limit",
    actBtcMeta: "3h ago · market · 2×",
    actEthMeta: "yesterday · stop",
    actDogeMeta: "yesterday · market",
    badgesTitle: "Badges",
    badgesSubtitle: "Earn on-chain NFT rewards by trading.",
    badgeClaim: "Claim",
    badgeClaiming: "Claiming…",
    badgeClaimed: "On-chain ✓",
    badgePending: "Pending",
    badgeLocked: "Locked",
  },
  fr: {
    title: "Portefeuille",
    subtitle: "Compte paper courant · soldes, positions et activité issus du backend.",
    connectPrompt: "Connecte un wallet XRP pour charger ton portefeuille paper.",
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
    accountSummary: "Résumé du compte",
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
    recentActivity: "Activité récente",
    tagBuy: "ACHAT",
    tagSell: "VENTE",
    actSolMeta: "il y a 12 min · marché · 3×",
    actArbMeta: "il y a 1 h · limite",
    actBtcMeta: "il y a 3 h · marché · 2×",
    actEthMeta: "hier · stop",
    actDogeMeta: "hier · marché",
    badgesTitle: "Badges",
    badgesSubtitle: "Gagne des récompenses NFT on-chain en tradant.",
    badgeClaim: "Réclamer",
    badgeClaiming: "Claim…",
    badgeClaimed: "On-chain ✓",
    badgePending: "En attente",
    badgeLocked: "À débloquer",
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
    await loadBadges(userId.value);
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
        <div class="ch-head"><div><div class="t">{{ t("accountSummary") }}</div><div class="big" :class="pnlValue >= 0 ? 'up' : 'down'">${{ fmtNum(equityValue) }}</div></div><div class="lab">{{ t("tfS04") }}</div></div>
        <div class="summary-list">
          <div><span>{{ t("kpiAvailable") }}</span><b>${{ fmtNum(freeCash) }}</b></div>
          <div><span>{{ t("kpiInvested") }}</span><b>${{ fmtNum(investedValue) }}</b></div>
          <div><span>{{ t("kpiPnlToday") }}</span><b :class="pnlValue >= 0 ? 'up' : 'down'">{{ signed(pnlValue) }}</b></div>
          <div><span>{{ t("positionsHoldings") }}</span><b>{{ positionsCount }}</b></div>
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

    <!-- badges -->
    <div class="card badges" v-reveal>
      <div class="hh">{{ t("badgesTitle") }}</div>
      <div class="bsub">{{ t("badgesSubtitle") }}</div>
      <div class="bgrid">
        <div
          v-for="b in badgeList"
          :key="b.code"
          class="bcard"
          :class="{ on: b.earned }"
        >
          <div class="bic">{{ b.title.slice(0, 1) }}</div>
          <div class="bmeta"><b>{{ b.title }}</b><span>{{ b.description }}</span></div>
          <div class="bact">
            <span v-if="b.status === 'claimed'" class="bpill ok">{{ t("badgeClaimed") }}</span>
            <span v-else-if="b.status === 'offer_pending'" class="bpill">{{ t("badgePending") }}</span>
            <button
              v-else-if="b.earned"
              class="bbtn"
              :disabled="badgeClaiming === b.code"
              @click="claimBadge(b.code)"
            >
              {{ badgeClaiming === b.code ? t("badgeClaiming") : t("badgeClaim") }}
            </button>
            <span v-else class="bpill soft">{{ t("badgeLocked") }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- activity -->
    <div class="grid3 single">
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
.grid3.single {
  grid-template-columns: 1fr;
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
.summary-list {
  display: grid;
  gap: 12px;
  padding: 18px 22px 22px;
}
.summary-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
  font-family: var(--mono);
}
.summary-list span {
  color: var(--soft);
  font-size: 12px;
}
.summary-list b {
  font-size: 15px;
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

/* --- badges --- */
.badges .bsub {
  color: var(--soft);
  font-size: 12px;
  margin: 2px 0 12px;
}
.bgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.bcard {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  opacity: 0.55;
}
.bcard.on {
  opacity: 1;
}
.bic {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-weight: 700;
  background: var(--panel-2, rgba(255, 255, 255, 0.06));
}
.bcard.on .bic {
  background: var(--live, #ffb020);
  color: #10130a;
}
.bmeta {
  flex: 1 1 auto;
  min-width: 0;
}
.bmeta b {
  display: block;
  font-size: 13px;
}
.bmeta span {
  display: block;
  color: var(--soft);
  font-size: 11px;
}
.bact {
  flex: 0 0 auto;
}
.bbtn {
  border: 1px solid var(--live, #ffb020);
  color: var(--live, #ffb020);
  background: transparent;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}
.bbtn:disabled {
  opacity: 0.5;
  cursor: default;
}
.bpill {
  font-size: 11px;
  color: var(--soft);
  border: 1px solid var(--line, rgba(255, 255, 255, 0.08));
  border-radius: 999px;
  padding: 3px 8px;
}
.bpill.ok {
  color: var(--up, #35d07f);
  border-color: var(--up, #35d07f);
}
.bpill.soft {
  opacity: 0.7;
}
</style>
