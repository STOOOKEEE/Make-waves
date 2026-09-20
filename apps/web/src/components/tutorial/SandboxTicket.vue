<script setup lang="ts">
/* Ticket d'ordre simulé. Volontairement calqué sur le vrai ticket du terminal
 * (`DashboardView.vue`) : mêmes classes CSS, mêmes libellés, même ordre des
 * contrôles, pour que ce qui est appris ici se retrouve tel quel là-bas.
 *
 * Une seule addition par rapport au vrai : la ligne « Risque au stop », qui est
 * la métrique la plus utile de tout l'écran et que le vrai ticket n'a pas
 * encore. Elle sert l'étape « règle du 1 % ». */
import { computed } from "vue";
import { useI18n } from "../../i18n/useI18n";
import {
  effectiveLeverage,
  SIM_MAKER_FEE,
  SIM_TAKER_FEE,
} from "../../lib/sandbox/engine";
import { plannedRisk, type SandboxSnapshot } from "../../lib/sandbox/goals";
import { zoneClass } from "../../lib/sandbox/spotlight";
import type { SpotlightTarget } from "../../data/tutorial";

const props = defineProps<{
  snapshot: SandboxSnapshot;
  liquidity: "maker" | "taker";
  available: number;
  limitPrice: number | null;
  spotlight?: SpotlightTarget | undefined;
}>();

const emit = defineEmits<{
  product: [value: "spot" | "perp"];
  orderKind: [value: "market" | "limit"];
  liquidity: [value: "maker" | "taker"];
  side: [value: "buy" | "sell"];
  amount: [value: number];
  leverage: [value: number];
  takeProfit: [value: number | null];
  stopLoss: [value: number | null];
  limitPrice: [value: number | null];
  place: [];
}>();

const { t } = useI18n({
  en: {
    product: "Product",
    orderType: "Order type",
    execution: "Execution",
    spot: "SPOT",
    perp: "PERP",
    market: "MARKET",
    limit: "LIMIT",
    taker: "TAKER",
    maker: "MAKER",
    buy: "Buy / Long",
    sell: "Sell / Short",
    amount: "Amount",
    available: "Available",
    leverage: "Leverage",
    takeProfit: "Take profit",
    stopLoss: "Stop loss",
    exposure: "Position size",
    margin: "Margin",
    fees: "Est. fees",
    liq: "Liquidation",
    risk: "Risk at stop",
    limitPrice: "Limit price",
    place: "Place simulated order",
    none: "—",
  },
  fr: {
    product: "Produit",
    orderType: "Type d'ordre",
    execution: "Exécution",
    spot: "SPOT",
    perp: "PERP",
    market: "MARKET",
    limit: "LIMIT",
    taker: "TAKER",
    maker: "MAKER",
    buy: "Acheter / Long",
    sell: "Vendre / Short",
    amount: "Montant",
    available: "Disponible",
    leverage: "Levier",
    takeProfit: "Take profit",
    stopLoss: "Stop loss",
    exposure: "Taille de position",
    margin: "Marge",
    fees: "Frais estimés",
    liq: "Liquidation",
    risk: "Risque au stop",
    limitPrice: "Prix limite",
    place: "Passer l'ordre simulé",
    none: "—",
  },
});

const lev = computed(() =>
  effectiveLeverage(props.snapshot.product, props.snapshot.leverage),
);
const notional = computed(() => props.snapshot.amount * lev.value);
const fee = computed(
  () => notional.value * (props.liquidity === "maker" ? SIM_MAKER_FEE : SIM_TAKER_FEE),
);
const liquidation = computed(() => {
  if (props.snapshot.product !== "perp" || lev.value <= 1 || props.snapshot.mark <= 0) return null;
  const direction = props.snapshot.side === "buy" ? -1 : 1;
  return props.snapshot.mark * (1 + (direction * 1) / lev.value);
});
const risk = computed(() => plannedRisk(props.snapshot));
const riskPct = computed(() =>
  risk.value === null || props.snapshot.equity <= 0
    ? null
    : (risk.value / props.snapshot.equity) * 100,
);
const canPlace = computed(
  () => props.snapshot.amount > 0 && props.snapshot.amount <= props.available,
);

function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return t("none");
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function onNumber(event: Event, emitName: "amount" | "leverage"): void {
  const raw = Number((event.target as HTMLInputElement).value);
  const value = Number.isFinite(raw) ? raw : 0;
  if (emitName === "amount") emit("amount", Math.max(0, value));
  else emit("leverage", Math.min(20, Math.max(1, Math.trunc(value))));
}

/** Champ vide ou saisie invalide = « pas de niveau », pas zéro. */
function readPrice(event: Event): number | null {
  const text = (event.target as HTMLInputElement).value.trim();
  const value = Number(text);
  return text === "" || !Number.isFinite(value) || value <= 0 ? null : value;
}

function setPct(pct: number): void {
  emit("amount", Math.round(props.available * (pct / 100)));
}
</script>

<template>
  <div class="card ticket" data-tour="ticket">
    <div class="ticket-controls">
      <div class="mini-field" data-tour="ticket.product" :class="zoneClass(spotlight, 'ticket.product')">
        <span>{{ t("product") }}</span>
        <div class="mini-seg">
          <button :class="{ on: snapshot.product === 'spot' }" @click="emit('product', 'spot')">
            {{ t("spot") }}
          </button>
          <button :class="{ on: snapshot.product === 'perp' }" @click="emit('product', 'perp')">
            {{ t("perp") }}
          </button>
        </div>
      </div>
      <div class="mini-field" data-tour="ticket.orderKind" :class="zoneClass(spotlight, 'ticket.orderKind')">
        <span>{{ t("orderType") }}</span>
        <div class="mini-seg">
          <button :class="{ on: snapshot.orderKind === 'market' }" @click="emit('orderKind', 'market')">
            {{ t("market") }}
          </button>
          <button :class="{ on: snapshot.orderKind === 'limit' }" @click="emit('orderKind', 'limit')">
            {{ t("limit") }}
          </button>
        </div>
      </div>
      <div class="mini-field" data-tour="ticket.execution" :class="zoneClass(spotlight, 'ticket.execution')">
        <span>{{ t("execution") }}</span>
        <div class="mini-seg">
          <button :class="{ on: liquidity === 'taker' }" @click="emit('liquidity', 'taker')">
            {{ t("taker") }}
          </button>
          <button :class="{ on: liquidity === 'maker' }" @click="emit('liquidity', 'maker')">
            {{ t("maker") }}
          </button>
        </div>
      </div>
    </div>

    <div class="bs" data-tour="ticket.side" :class="zoneClass(spotlight, 'ticket.side')">
      <button class="buy" :class="{ on: snapshot.side === 'buy' }" @click="emit('side', 'buy')">
        {{ t("buy") }}
      </button>
      <button class="sell" :class="{ on: snapshot.side === 'sell' }" @click="emit('side', 'sell')">
        {{ t("sell") }}
      </button>
    </div>

    <!-- Le prix limite n'a de sens qu'en LIMIT : il apparaît avec le type d'ordre. -->
    <div
      v-if="snapshot.orderKind === 'limit'"
      class="field compact-field"
      data-tour="ticket.limit"
      :class="zoneClass(spotlight, 'ticket.limit')"
    >
      <div class="fl">
        <span class="k">{{ t("limitPrice") }}</span>
        <span class="b mono">{{ money(snapshot.mark) }}</span>
      </div>
      <div class="inp">
        <input
          type="number"
          min="0"
          :value="limitPrice ?? ''"
          :placeholder="String(Math.round(snapshot.mark))"
          @input="emit('limitPrice', readPrice($event))"
        />
        <span class="suf">USD</span>
      </div>
    </div>

    <div class="field" data-tour="ticket.amount" :class="zoneClass(spotlight, 'ticket.amount')">
      <div class="fl">
        <span class="k">{{ t("amount") }}</span>
        <span class="b">{{ t("available") }} {{ money(available) }}</span>
      </div>
      <div class="inp">
        <input type="number" min="0" :value="snapshot.amount || ''" @input="onNumber($event, 'amount')" />
        <span class="suf">USD</span>
      </div>
    </div>

    <div class="pcts" data-tour="ticket.pcts" :class="zoneClass(spotlight, 'ticket.pcts')">
      <button v-for="pct in [25, 50, 75, 100]" :key="pct" @click="setPct(pct)">{{ pct }}%</button>
    </div>

    <div
      v-if="snapshot.product === 'perp'"
      class="lev"
      data-tour="ticket.leverage"
      :class="zoneClass(spotlight, 'ticket.leverage')"
    >
      <div class="fl">
        <span class="k">{{ t("leverage") }}</span>
        <span class="b">{{ lev }}x</span>
      </div>
      <input
        type="range"
        min="1"
        max="20"
        step="1"
        :value="snapshot.leverage"
        @input="onNumber($event, 'leverage')"
      />
      <div class="lev-buttons">
        <button
          v-for="v in [1, 2, 5, 10, 20]"
          :key="v"
          :class="{ on: lev === v }"
          @click="emit('leverage', v)"
        >
          {{ v }}x
        </button>
      </div>
    </div>

    <div class="risk-grid">
      <div class="field compact-field" data-tour="ticket.tp" :class="zoneClass(spotlight, 'ticket.tp')">
        <div class="fl"><span class="k">{{ t("takeProfit") }}</span></div>
        <div class="inp">
          <input type="number" min="0" :value="snapshot.takeProfit ?? ''" @input="emit('takeProfit', readPrice($event))" />
          <span class="suf">TP</span>
        </div>
      </div>
      <div class="field compact-field" data-tour="ticket.sl" :class="zoneClass(spotlight, 'ticket.sl')">
        <div class="fl"><span class="k">{{ t("stopLoss") }}</span></div>
        <div class="inp">
          <input type="number" min="0" :value="snapshot.stopLoss ?? ''" @input="emit('stopLoss', readPrice($event))" />
          <span class="suf">SL</span>
        </div>
      </div>
    </div>

    <div class="summary" data-tour="ticket.summary" :class="zoneClass(spotlight, 'ticket.summary')">
      <div class="r"><span>{{ t("exposure") }}</span><b>{{ money(notional) }}</b></div>
      <div class="r"><span>{{ t("margin") }}</span><b>{{ money(snapshot.amount) }}</b></div>
      <div class="r"><span>{{ t("fees") }}</span><b>{{ money(fee) }}</b></div>
      <div class="r"><span>{{ t("liq") }}</span><b>{{ money(liquidation) }}</b></div>
      <div class="r risk-row" :class="{ ok: riskPct !== null && riskPct <= 1 }">
        <span>{{ t("risk") }}</span>
        <b>
          {{ money(risk) }}
          <template v-if="riskPct !== null"> ({{ riskPct.toFixed(2) }}%)</template>
        </b>
      </div>
    </div>

    <button
      class="placebtn"
      data-tour="ticket.place"
      :class="[{ sell: snapshot.side === 'sell' }, zoneClass(spotlight, 'ticket.place')]"
      :disabled="!canPlace"
      @click="emit('place')"
    >
      {{ t("place") }}
    </button>
  </div>
</template>

<style scoped>
/* Le reset global ne touche que la police et le curseur : chaque surface
 * neutralise elle-même le style natif des boutons. */
button { background: none; border: none; color: inherit; padding: 0; }
.ticket {
  display: flex;
  flex-direction: column;
  gap: 11px;
  background: #17191f;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 14px;
  padding: 14px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, .18) transparent;
}
.ticket-controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.mini-field { display: grid; gap: 6px; }
.mini-field > span { font: 8.5px var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--soft); }
.mini-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--panel2); border-radius: 8px; padding: 3px; }
.mini-seg button { min-width: 0; padding: 7px 2px; border-radius: 6px; font: 8.5px var(--mono); letter-spacing: .04em; color: var(--soft); }
.mini-seg button.on { background: var(--blue); color: #fff; box-shadow: 0 4px 12px rgba(79, 106, 255, .22); }
.bs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.bs button { padding: 11px 0; border-radius: 9px; font-weight: 750; font-size: 12px; border: 1px solid var(--line2); color: var(--soft); }
.bs .buy.on { background: var(--up); color: #06231a; border-color: transparent; }
.bs .sell.on { background: var(--down); color: #2a0a06; border-color: transparent; }
.field { display: grid; gap: 6px; }
.fl { display: flex; justify-content: space-between; align-items: baseline; }
.fl .k { font: 9px var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--soft); }
.fl .b { font: 9.5px var(--mono); color: var(--mut2); }
.inp { display: flex; align-items: center; gap: 8px; background: #101218; border: 1px solid rgba(255, 255, 255, .1); border-radius: 8px; padding: 9px 10px; transition: border-color .2s var(--ease); }
.inp:focus-within { border-color: #7184ff; }
.inp input { min-width: 0; flex: 1; background: none; border: none; color: var(--text); font: 13px var(--mono); outline: none; }
.inp .suf { font: 10.5px var(--mono); color: var(--mut2); }
.pcts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.pcts button { padding: 7px 0; border-radius: 6px; border: 1px solid var(--line2); font: 10px var(--mono); color: var(--soft); }
.pcts button:hover { color: #fff; border-color: #7184ff; }
.lev { display: grid; gap: 8px; }
.lev input[type="range"] { width: 100%; accent-color: var(--blue); }
.lev-buttons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
.lev-buttons button { padding: 6px 0; border-radius: 6px; border: 1px solid var(--line2); font: 10px var(--mono); color: var(--soft); }
.lev-buttons button.on { background: var(--blue); color: #fff; border-color: transparent; }
.risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.summary { display: grid; gap: 6px; padding: 11px; border: 1px solid rgba(255, 255, 255, .08); border-radius: 10px; background: rgba(255, 255, 255, .025); }
.summary .r { display: flex; justify-content: space-between; gap: 10px; font-size: 10.5px; }
.summary .r span { color: var(--soft); }
.summary .r b { font-family: var(--mono); }
.risk-row.ok b { color: var(--up); }
.placebtn { padding: 13px 0; border-radius: 9px; background: var(--up); color: #06231a; font-weight: 800; font-size: 12px; box-shadow: 0 8px 24px rgba(61, 222, 159, .14); }
.placebtn.sell { background: var(--down); color: #2a0a06; }
.placebtn:disabled { opacity: .4; }
/* Projecteur — voir `lib/sandbox/spotlight.ts`. La zone visée est cerclée de
 * rouge et respire ; tout le reste est flouté et atténué. Aucune géométrie
 * n'est calculée : ce sont deux classes posées sur des conteneurs. */
.zone-spot {
  position: relative;
  z-index: 2;
  outline: 2px solid var(--guide);
  outline-offset: 5px;
  border-radius: 8px;
  box-shadow: 0 0 0 6px var(--guide-glow);
  animation: pulse 1.9s var(--ease) infinite;
}
.zone-dim {
  filter: blur(1.5px) saturate(.5);
  opacity: .3;
  transition: opacity .35s var(--ease), filter .35s var(--ease);
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 6px var(--guide-glow); }
  50% { box-shadow: 0 0 0 11px transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .zone-spot { animation: none; }
}
@media (max-width: 1320px) {
  .ticket-controls { grid-template-columns: 1fr; }
  .mini-field { grid-template-columns: 70px 1fr; align-items: center; }
  .mini-field > span { font-size: 8px; }
}
@media (max-width: 1180px) {
  .ticket-controls { grid-template-columns: repeat(3, 1fr); }
  .mini-field { grid-template-columns: 1fr; }
}
@media (max-width: 420px) {
  .ticket-controls { grid-template-columns: 1fr; }
  .mini-field { grid-template-columns: 74px 1fr; }
}
</style>
