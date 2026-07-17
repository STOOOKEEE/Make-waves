<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { CompetitionStatus, TideClient } from "@tide/client";
import StatusBadge from "../components/StatusBadge.vue";
import SegControl from "../components/SegControl.vue";
import { useCompetitions } from "../composables/useCompetitions";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();
const emit = defineEmits<{ navigate: [path: string] }>();
const competitions = useCompetitions(props.client);
const filter = ref<"all" | CompetitionStatus>("all");

const { t, locale } = useI18n({
  en: {
    title: "Trading competitions",
    subtitle: "Only persisted competitions and verified paid entries are shown.",
    all: "All",
    live: "Live",
    upcoming: "Upcoming",
    ended: "Ended",
    empty: "No real competition is open yet.",
    emptyHint: "An operator must create one from the local console.",
    ticket: "Entry ticket",
    pot: "Verified pool",
    players: "Paid entries",
    winner: "Winner takes 100%",
    details: "View competition",
    paper: "Paper trading",
    liveMode: "Live trading",
  },
  fr: {
    title: "Compétitions de trading",
    subtitle: "Seules les compétitions persistées et les entrées payées vérifiées sont affichées.",
    all: "Toutes",
    live: "En cours",
    upcoming: "À venir",
    ended: "Terminées",
    empty: "Aucune vraie compétition n'est encore ouverte.",
    emptyHint: "Un opérateur doit en créer une depuis la console locale.",
    ticket: "Ticket d'entrée",
    pot: "Pool vérifiée",
    players: "Entrées payées",
    winner: "Le gagnant reçoit 100 %",
    details: "Voir la compétition",
    paper: "Paper trading",
    liveMode: "Trading Live",
  },
});

onMounted(() => void competitions.load());

const filters = computed(() => [
  { value: "all", label: t("all") },
  { value: "live", label: t("live") },
  { value: "upcoming", label: t("upcoming") },
  { value: "ended", label: t("ended") },
]);

const visible = computed(() =>
  filter.value === "all"
    ? competitions.items.value
    : competitions.items.value.filter((competition) => competition.status === filter.value),
);

function nameOf(competition: (typeof competitions.items.value)[number]): string {
  return locale.value === "fr" ? competition.nameFr : competition.nameEn;
}

function descriptionOf(competition: (typeof competitions.items.value)[number]): string {
  return locale.value === "fr" ? competition.descriptionFr : competition.descriptionEn;
}

function xrp(value: number): string {
  return `${value.toLocaleString(locale.value, { maximumFractionDigits: 6 })} XRP`;
}
</script>

<template>
  <div class="page competitions-page">
    <header class="page-head">
      <div>
        <h1>{{ t("title") }}</h1>
        <p>{{ t("subtitle") }}</p>
      </div>
      <SegControl v-model="filter" :options="filters" />
    </header>

    <div v-if="competitions.loading.value" class="card state">Loading…</div>
    <div v-else-if="competitions.error.value" class="card state error">
      {{ competitions.error.value }}
    </div>
    <div v-else-if="visible.length === 0" class="card state empty">
      <strong>{{ t("empty") }}</strong>
      <span>{{ t("emptyHint") }}</span>
    </div>
    <div v-else class="competition-grid">
      <article
        v-for="competition in visible"
        :key="competition.id"
        class="card competition-card"
        @click="emit('navigate', `/competition/${competition.id}`)"
      >
        <div class="card-top">
          <StatusBadge :status="competition.status" />
          <span class="mode">{{ t(competition.mode === "paper" ? "paper" : "liveMode") }}</span>
        </div>
        <h2>{{ nameOf(competition) }}</h2>
        <p>{{ descriptionOf(competition) }}</p>
        <div class="economy">
          <div><span>{{ t("ticket") }}</span><b>{{ xrp(competition.buyIn) }}</b></div>
          <div><span>{{ t("pot") }}</span><b class="pool">{{ xrp(competition.pot) }}</b></div>
          <div><span>{{ t("players") }}</span><b>{{ competition.participants }}</b></div>
        </div>
        <div class="winner">{{ t("winner") }}</div>
        <button @click.stop="emit('navigate', `/competition/${competition.id}`)">
          {{ t("details") }} →
        </button>
      </article>
    </div>
  </div>
</template>

<style scoped>
.competitions-page { padding-top: 30px; }
.page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; margin-bottom:22px; }
.page-head h1 { font-size:clamp(34px,5vw,58px); text-transform:uppercase; letter-spacing:-.045em; }
.page-head p { color:var(--soft); margin-top:8px; }
.competition-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:14px; }
.competition-card { padding:24px; cursor:pointer; display:flex; flex-direction:column; min-height:360px; }
.card-top { display:flex; align-items:center; justify-content:space-between; }
.mode,.economy span { color:var(--soft); font:10px var(--mono); text-transform:uppercase; letter-spacing:.09em; }
h2 { margin:25px 0 10px; font-size:25px; text-transform:uppercase; }
.competition-card>p { color:var(--soft); line-height:1.6; min-height:52px; }
.economy { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:24px 0 14px; }
.economy div { border:1px solid var(--line); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:7px; }
.economy b { font:700 14px var(--mono); }
.economy .pool { color:var(--up); }
.winner { color:var(--up); font:700 11px var(--mono); margin-bottom:18px; }
button { margin-top:auto; border:1px solid var(--line2); background:transparent; color:#fff; padding:13px; border-radius:10px; font-weight:750; }
.state { padding:50px; display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--soft); }
.state strong { color:#fff; font-size:19px; }.error { color:var(--down); }
@media(max-width:720px){.page-head{align-items:flex-start;flex-direction:column}.economy{grid-template-columns:1fr}}
</style>
