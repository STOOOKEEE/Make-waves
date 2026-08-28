<script setup lang="ts">
/* ===== Tutoriel interactif — bac à sable guidé =====
 *
 * Surface autonome, volontairement séparée du vrai terminal. En production, un
 * nouveau visiteur voit `DashboardView` flouté et inerte (`.deck.locked`) tant
 * que son wallet Paper n'est pas financé : un tour en surimpression échouerait
 * exactement là où il sert. Ici tout est cliquable, tout de suite, sans compte.
 *
 * `feed` est typé `SandboxFeed` = trois méthodes de LECTURE seulement. Appeler
 * `placeOrder` ou `claimPaperWallet` depuis cet arbre est une erreur de
 * compilation, pas une convention : le funnel wallet ne peut pas être touché.
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import CoachPanel from "../components/tutorial/CoachPanel.vue";
import SandboxTicket from "../components/tutorial/SandboxTicket.vue";
import LangToggle from "../components/LangToggle.vue";
import BrandMark from "../components/BrandMark.vue";
import { useSandbox, type SandboxFeed } from "../composables/useSandbox";
import { useTutorial } from "../composables/useTutorial";
import { chapterLabel, localizedSteps, stepIndexById } from "../data/tutorial";
import { isGoalMet } from "../lib/sandbox/goals";
import { buildChart, priceToY } from "../lib/sandbox/chart";
import { liquidationPrice, unrealizedPnl } from "../lib/sandbox/engine";
import { useI18n } from "../i18n/useI18n";
import { locale } from "../i18n/locale";

const props = defineProps<{ feed: SandboxFeed; stepId?: string | undefined }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { t } = useI18n({
  en: {
    sim: "SIMULATION",
    simNote: "Real prices, fake money. Nothing here touches a wallet.",
    equity: "Simulated equity",
    positions: "Positions",
    noPositions: "No open position yet.",
    close: "Close",
    fast: "Fast-forward 1h",
    candles: "Candles",
    line: "Line",
    book: "Order book",
    markets: "Markets",
    entry: "Entry",
    pnl: "PnL",
    liq: "Liq.",
    quitTitle: "Leave the tutorial?",
    quitBody: "You can restart it any time from Tide School.",
    quitConfirm: "Leave",
    quitCancel: "Stay",
  },
  fr: {
    sim: "SIMULATION",
    simNote: "Vrais prix, argent fictif. Rien ici ne touche un wallet.",
    equity: "Équité simulée",
    positions: "Positions",
    noPositions: "Aucune position ouverte.",
    close: "Fermer",
    fast: "Accélérer 1h",
    candles: "Bougies",
    line: "Ligne",
    book: "Carnet d'ordres",
    markets: "Marchés",
    entry: "Entrée",
    pnl: "PnL",
    liq: "Liq.",
    quitTitle: "Quitter le tutoriel ?",
    quitBody: "Tu peux le relancer quand tu veux depuis Tide School.",
    quitConfirm: "Quitter",
    quitCancel: "Rester",
  },
});

const tutorial = useTutorial();
const sandbox = useSandbox(props.feed);
const steps = computed(() => localizedSteps(locale.value));
const step = computed(
  () => steps.value[tutorial.index.value] ?? steps.value[0],
);
const enteredAt = ref(Date.now());
const confirmQuit = ref(false);

const met = computed(() =>
  step.value === undefined
    ? false
    : isGoalMet(step.value.goal, sandbox.snapshot.value, enteredAt.value),
);

const chapter = computed(() =>
  step.value === undefined ? "" : chapterLabel(step.value.chapter, locale.value),
);

const chart = computed(() =>
  buildChart(sandbox.candles.value, {
    extraPrices: [
      sandbox.mark.value,
      ...(sandbox.snapshot.value.takeProfit === null ? [] : [sandbox.snapshot.value.takeProfit]),
      ...(sandbox.snapshot.value.stopLoss === null ? [] : [sandbox.snapshot.value.stopLoss]),
    ].filter((price) => price > 0),
  }),
);

/** Repères horizontaux : entrée, TP, SL, liquidation. Le vrai chart ne les a pas. */
const levels = computed(() => {
  const out: { y: number; kind: string; label: string }[] = [];
  const snap = sandbox.snapshot.value;
  if (snap.takeProfit !== null) {
    out.push({ y: priceToY(chart.value, snap.takeProfit), kind: "tp", label: "TP" });
  }
  if (snap.stopLoss !== null) {
    out.push({ y: priceToY(chart.value, snap.stopLoss), kind: "sl", label: "SL" });
  }
  for (const position of sandbox.positions.value) {
    out.push({ y: priceToY(chart.value, position.entry), kind: "entry", label: t("entry") });
    const liq = liquidationPrice(position);
    if (liq !== null) out.push({ y: priceToY(chart.value, liq), kind: "liq", label: t("liq") });
  }
  return out.filter((level) => Number.isFinite(level.y));
});

// Le prix avance en continu : sans mouvement, ni stop ni liquidation ne sont
// démontrables. `fast-forward` compresse une heure quand l'étape le demande.
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(async () => {
  tutorial.start(props.stepId);
  await sandbox.load();
  applyPreset();
  timer = setInterval(() => sandbox.tick(), 1_200);
  window.addEventListener("keydown", onKey);
});

onUnmounted(() => {
  if (timer !== undefined) clearInterval(timer);
  window.removeEventListener("keydown", onKey);
});

function onKey(event: KeyboardEvent): void {
  if (event.key === "Escape") confirmQuit.value = true;
}

/** Met en scène l'étape : le tutoriel prépare le ticket au lieu de l'exiger. */
function applyPreset(): void {
  const preset = step.value?.preset;
  if (preset === undefined) {
    sandbox.setDrift(0);
    return;
  }
  if (preset.product !== undefined) sandbox.product.value = preset.product;
  if (preset.orderKind !== undefined) sandbox.orderKind.value = preset.orderKind;
  if (preset.side !== undefined) sandbox.side.value = preset.side;
  if (preset.amount !== undefined) sandbox.amount.value = preset.amount;
  if (preset.leverage !== undefined) sandbox.leverage.value = preset.leverage;
  if (preset.chartMode !== undefined) sandbox.chartMode.value = preset.chartMode;
  sandbox.setDrift(preset.drift ?? 0);
}

// Une étape validée le reste : repasser sur MARKET après avoir cliqué LIMIT ne
// doit pas retirer la coche déjà obtenue.
watch(met, (value) => {
  if (value && step.value !== undefined) tutorial.markCompleted(step.value.id);
});

watch(
  () => tutorial.stepId.value,
  () => {
    enteredAt.value = Date.now();
    applyPreset();
  },
);

watch(
  () => props.stepId,
  (id) => {
    if (id !== undefined && stepIndexById(id) >= 0) tutorial.goTo(id);
  },
);

function onSkip(): void {
  confirmQuit.value = true;
}

function leave(): void {
  tutorial.skip();
  emit("navigate", "/dashboard");
}

function finish(): void {
  tutorial.finish();
  emit("navigate", "/dashboard");
}

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
</script>

<template>
  <div class="tutorial">
    <header class="tut-bar">
      <a class="tut-brand" href="#/landing" @click.prevent="emit('navigate', '/landing')">
        <!-- BrandMark est une <img> en 100 % : elle a besoin d'un carré qui la borne. -->
        <span class="mk"><BrandMark /></span>
        <span>TIDE</span>
      </a>
      <span class="sim-badge mono">{{ t("sim") }}</span>
      <span class="sim-note soft">{{ t("simNote") }}</span>
      <div class="tut-progress" role="progressbar" :aria-valuenow="tutorial.index.value + 1" :aria-valuemin="1" :aria-valuemax="tutorial.total">
        <span :style="{ width: `${((tutorial.index.value + 1) / tutorial.total) * 100}%` }"></span>
      </div>
      <LangToggle variant="light" />
    </header>

    <div class="tut-body">
      <CoachPanel
        v-if="step"
        :step="step"
        :index="tutorial.index.value"
        :total="tutorial.total"
        :chapter="chapter"
        :met="met"
        :is-last="tutorial.isLast.value"
        @next="tutorial.next()"
        @back="tutorial.back()"
        @skip="onSkip"
        @finish="finish"
      />

      <section class="sandbox">
        <div class="sb-top">
          <aside
            class="card watch"
            data-tour="watchlist"
            :class="{ lit: step?.spotlight === 'watchlist' }"
          >
            <div class="wt-head"><span class="lab soft">{{ t("markets") }}</span></div>
            <button
              v-for="row in sandbox.markets.value"
              :key="row.symbol"
              class="wrow"
              :class="{ on: row.symbol === sandbox.symbol.value }"
              @click="sandbox.selectMarket(row)"
            >
              <b>{{ row.symbol }}</b>
              <span class="mono">{{ money(row.price) }}</span>
            </button>
          </aside>

          <div class="card chartcard" data-tour="chart" :class="{ lit: step?.spotlight === 'chart' }">
            <div class="chart-bar">
              <div class="bigprice mono">{{ money(sandbox.mark.value) }}</div>
              <div
                class="ct-type"
                data-tour="chart.mode"
                :class="{ lit: step?.spotlight === 'chart.mode' }"
              >
                <button
                  :class="{ on: sandbox.chartMode.value === 'candles' }"
                  @click="sandbox.chartMode.value = 'candles'"
                >
                  {{ t("candles") }}
                </button>
                <button
                  :class="{ on: sandbox.chartMode.value === 'line' }"
                  @click="sandbox.chartMode.value = 'line'"
                >
                  {{ t("line") }}
                </button>
              </div>
              <button
                class="fastbtn"
                data-tour="accelerate"
                :class="{ lit: step?.spotlight === 'accelerate' }"
                @click="sandbox.fastForward()"
              >
                ▶▶ {{ t("fast") }}
              </button>
            </div>
            <svg class="chart" :viewBox="`0 0 ${chart.width} ${chart.height}`" preserveAspectRatio="none">
              <template v-if="sandbox.chartMode.value === 'candles'">
                <g v-for="(bar, i) in chart.bars" :key="i">
                  <line
                    :x1="bar.x + bar.width / 2"
                    :x2="bar.x + bar.width / 2"
                    :y1="bar.wickTop"
                    :y2="bar.wickBottom"
                    :class="bar.up ? 'up' : 'down'"
                    stroke-width="1"
                  />
                  <rect
                    :x="bar.x"
                    :y="bar.bodyY"
                    :width="bar.width"
                    :height="bar.bodyH"
                    :class="bar.up ? 'up-fill' : 'down-fill'"
                  />
                </g>
              </template>
              <path v-else :d="chart.linePath" class="ln" fill="none" stroke-width="1.5" />
              <g v-for="(level, i) in levels" :key="`l${i}`">
                <line :x1="0" :x2="chart.width" :y1="level.y" :y2="level.y" :class="`lvl ${level.kind}`" />
                <text :x="6" :y="level.y - 4" :class="`lvl-t ${level.kind}`">{{ level.label }}</text>
              </g>
            </svg>
          </div>
        </div>

        <div class="sb-bottom">
          <div class="card blotter" data-tour="blotter" :class="{ lit: step?.spotlight === 'blotter' }">
            <div class="wt-head">
              <span class="lab soft">{{ t("positions") }}</span>
              <span class="lab soft">{{ t("equity") }} {{ money(sandbox.equity.value) }}</span>
            </div>
            <p v-if="sandbox.positions.value.length === 0" class="empty soft">
              {{ t("noPositions") }}
            </p>
            <div v-for="position in sandbox.positions.value" :key="position.id" class="prow">
              <b>{{ position.symbol }}</b>
              <span class="mono">{{ position.side === "long" ? "LONG" : "SHORT" }} {{ position.leverage }}x</span>
              <span class="mono">{{ t("entry") }} {{ money(position.entry) }}</span>
              <span
                class="mono"
                :class="unrealizedPnl(position, sandbox.mark.value) >= 0 ? 'up' : 'down'"
              >
                {{ money(unrealizedPnl(position, sandbox.mark.value)) }}
              </span>
              <button class="closebtn" @click="sandbox.close(position)">{{ t("close") }}</button>
            </div>
          </div>

          <SandboxTicket
            :snapshot="sandbox.snapshot.value"
            :liquidity="sandbox.liquidity.value"
            :available="sandbox.available.value"
            :spotlight="step?.spotlight"
            @product="sandbox.product.value = $event"
            @order-kind="sandbox.orderKind.value = $event"
            @liquidity="sandbox.liquidity.value = $event"
            @side="sandbox.side.value = $event"
            @amount="sandbox.amount.value = $event"
            @leverage="sandbox.leverage.value = $event"
            @take-profit="sandbox.takeProfit.value = $event"
            @stop-loss="sandbox.stopLoss.value = $event"
            @place="sandbox.place()"
          />
        </div>
      </section>
    </div>

    <div v-if="confirmQuit" class="quit-overlay" role="dialog" aria-modal="true">
      <div class="quit-card">
        <h3>{{ t("quitTitle") }}</h3>
        <p class="soft">{{ t("quitBody") }}</p>
        <div class="quit-actions">
          <button class="ghost" @click="confirmQuit = false">{{ t("quitCancel") }}</button>
          <button class="primary" @click="leave">{{ t("quitConfirm") }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Le reset global ne touche que la police et le curseur : chaque surface
 * neutralise elle-même le style natif des boutons. */
button { background: none; border: none; color: inherit; padding: 0; }
.tutorial { display: flex; flex-direction: column; height: 100vh; padding: 12px; gap: 12px; }
.tut-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.tut-brand { display: flex; align-items: center; gap: 8px; font-weight: 800; letter-spacing: -.02em; flex-shrink: 0; }
.tut-brand .mk { display: block; width: 26px; height: 26px; flex-shrink: 0; }
.sim-badge { font-size: 10.5px; letter-spacing: .14em; padding: 4px 9px; border-radius: 100px; background: var(--live); color: #2a1500; font-weight: 700; }
.sim-note { font-size: 12px; }
.tut-progress { flex: 1; min-width: 120px; height: 3px; background: var(--line2); border-radius: 100px; overflow: hidden; }
.tut-progress span { display: block; height: 100%; background: var(--up); transition: width .4s var(--ease); }
.tut-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 400px 1fr; gap: 12px; }
.sandbox { display: grid; grid-template-rows: 1.15fr 1fr; gap: 12px; min-height: 0; }
.sb-top { display: grid; grid-template-columns: 180px 1fr; gap: 12px; min-height: 0; }
.sb-bottom { display: grid; grid-template-columns: 1fr 320px; gap: 12px; min-height: 0; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
.watch { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.wt-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
.wrow { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 8px; font-size: 13px; }
.wrow.on { background: var(--panel2); }
.wrow span { font-size: 12px; color: var(--soft); }
.chartcard { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.chart-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bigprice { font-size: 22px; font-weight: 700; }
.ct-type { display: flex; gap: 4px; background: var(--panel2); border-radius: 8px; padding: 3px; }
.ct-type button { padding: 6px 12px; border-radius: 6px; font: 11px var(--mono); color: var(--soft); }
.ct-type button.on { background: var(--blue); color: #fff; }
.fastbtn { margin-left: auto; padding: 8px 14px; border-radius: 100px; border: 1px solid var(--line2); font: 11px var(--mono); color: var(--text); }
.chart { flex: 1; min-height: 0; width: 100%; }
.chart .up { stroke: var(--up); }
.chart .down { stroke: var(--down); }
.chart .up-fill { fill: var(--up); }
.chart .down-fill { fill: var(--down); }
.chart .ln { stroke: var(--up); }
.chart .lvl { stroke-width: 1; stroke-dasharray: 4 4; }
.chart .lvl.tp { stroke: var(--up); }
.chart .lvl.sl { stroke: var(--down); }
.chart .lvl.entry { stroke: var(--text); }
.chart .lvl.liq { stroke: var(--live); }
.chart .lvl-t { font: 9px var(--mono); fill: var(--soft); }
.blotter { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
.empty { font-size: 13px; }
.prow { display: grid; grid-template-columns: 60px 1fr 1fr 1fr auto; gap: 8px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line); font-size: 12px; }
.prow .up { color: var(--up); }
.prow .down { color: var(--down); }
.closebtn { padding: 5px 12px; border-radius: 100px; border: 1px solid var(--line2); font-size: 11px; color: var(--soft); }
.lit { outline: 2px solid var(--blue); outline-offset: 3px; }
.quit-overlay { position: fixed; inset: 0; z-index: 1300; display: grid; place-items: center; background: rgba(8, 8, 12, .72); backdrop-filter: blur(6px); }
.quit-card { background: var(--panel); border: 1px solid var(--line2); border-radius: 16px; padding: 26px; max-width: 380px; display: grid; gap: 10px; }
.quit-card h3 { font-size: 20px; font-weight: 700; }
.quit-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
.quit-actions button { padding: 10px 18px; border-radius: 100px; font-weight: 700; font-size: 13px; }
.quit-actions .primary { background: #fff; color: var(--panel); }
.quit-actions .ghost { border: 1px solid var(--line2); color: var(--text); }
@media (max-width: 1080px) {
  .tut-body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .sb-top { grid-template-columns: 1fr; }
  .sb-bottom { grid-template-columns: 1fr; }
}
</style>
