<script setup lang="ts">
/* Carnet d'ordres du bac à sable : vraies données via `/book/:symbol` (route
 * publique). Compact — huit niveaux de chaque côté suffisent à enseigner le
 * spread. Le meilleur bid et le meilleur ask sont marqués parce que c'est
 * exactement ce que traverse un ordre market. */
import { computed } from "vue";
import type { BookDepth } from "@tide/client";
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{ book: BookDepth | null; mark: number }>();

const { t } = useI18n({
  en: { title: "Order book", asks: "Sellers", bids: "Buyers", spread: "Spread", empty: "Loading the book…", best: "best" },
  fr: { title: "Carnet d'ordres", asks: "Vendeurs", bids: "Acheteurs", spread: "Spread", empty: "Chargement du carnet…", best: "meilleur" },
});

const asks = computed(() => [...(props.book?.asks ?? [])].slice(0, 5).reverse());
const bids = computed(() => [...(props.book?.bids ?? [])].slice(0, 5));

/**
 * L'écart en prix, calculé depuis les deux meilleurs niveaux. L'API expose bien
 * un champ `spread`, mais c'est une **fraction** du mid, pas un montant :
 * l'afficher tel quel donnait « Spread 0 », ce qui contredisait exactement la
 * leçon qu'on est en train d'enseigner.
 */
const spreadAbs = computed(() => {
  const bestAsk = props.book?.asks[0]?.price;
  const bestBid = props.book?.bids[0]?.price;
  if (bestAsk === undefined || bestBid === undefined) return null;
  return Math.max(0, bestAsk - bestBid);
});
/** Le champ `spread` de l'API est déjà relatif : on le passe en pourcentage. */
const spreadPct = computed(() =>
  props.book === null ? null : props.book.spread * 100,
);

function price(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Un spread peut valoir 0,01 $ comme 12 $ : deux à quatre décimales couvrent tout. */
function spreadLabel(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/** Les tailles varient sur plusieurs ordres de grandeur : « 0,000 » partout
 *  donnerait l'impression d'un carnet vide alors qu'il est plein. */
function size(value: number): string {
  if (value > 0 && value < 0.001) return "<0.001";
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
</script>

<template>
  <div class="card book">
    <div class="bk-head">
      <span class="lab soft">{{ t("title") }}</span>
      <span class="lab soft">{{ t("asks") }} / {{ t("bids") }}</span>
    </div>

    <p v-if="book === null" class="bk-empty soft">{{ t("empty") }}</p>

    <template v-else>
      <div v-for="(level, i) in asks" :key="`a${i}`" class="bk ask" :class="{ best: i === asks.length - 1 }">
        <span class="px">{{ price(level.price) }}</span>
        <span class="sz mono">{{ size(level.size) }}</span>
        <span v-if="i === asks.length - 1" class="tag">{{ t("best") }}</span>
      </div>

      <div class="bk-spread">
        <span class="lab">{{ t("spread") }}</span>
        <b class="mono">
          <template v-if="spreadAbs !== null">${{ spreadLabel(spreadAbs) }}</template>
          <template v-if="spreadPct !== null">
            ({{ spreadPct < 0.001 ? "<0.001" : spreadPct.toFixed(3) }}%)
          </template>
        </b>
      </div>

      <div v-for="(level, i) in bids" :key="`b${i}`" class="bk bid" :class="{ best: i === 0 }">
        <span class="px">{{ price(level.price) }}</span>
        <span class="sz mono">{{ size(level.size) }}</span>
        <span v-if="i === 0" class="tag">{{ t("best") }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.book { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.bk-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.bk-empty { font-size: 12px; }
.bk {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.bk .px { font-family: var(--mono); }
.bk .sz { color: var(--mut2); font-size: 11px; }
.bk .tag {
  font: 9px var(--mono);
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--mut2);
}
.bk.ask .px { color: var(--down); }
.bk.bid .px { color: var(--up); }
.bk.best { background: var(--panel2); }
.bk-spread {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 7px 6px;
  margin: 5px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.bk-spread b { font-size: 12px; }
</style>
