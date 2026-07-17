<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { CompetitionSummary, TideClient } from "@tide/client";
import type { LeaderboardEntry } from "@tide/core";
import BrandMark from "../components/BrandMark.vue";
import LangToggle from "../components/LangToggle.vue";
import { useWallet } from "../composables/useWallet";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();
const emit = defineEmits<{ navigate: [path: string] }>();
const wallet = useWallet(props.client);
const competitions = ref<CompetitionSummary[]>([]);
const leaders = ref<LeaderboardEntry[]>([]);
const marketCount = ref(0);
const loading = ref(true);
const error = ref("");

const { t } = useI18n({
  en: {
    paper: "Paper trading on real market data",
    title1: "Trade the market.",
    title2: "Prove the result.",
    lead: "Paper positions, persisted performance and XRP-funded competitions. Tide displays only data returned by the backend and payments verified on XRPL.",
    trade: "Start paper trading",
    wallet: "Connect wallet",
    liveData: "Live platform data",
    competitions: "Real competitions",
    entries: "Verified entries",
    pool: "Verified XRP pool",
    markets: "Markets from the feed",
    winner: "Rank #1 receives 100% of the verified entry-ticket pool. No rake.",
    open: "Open",
    noCompetition: "No competition has been created by the operator yet.",
    leaderboard: "Real leaderboard",
    noLeader: "No persisted account has a rank yet.",
    equity: "equity",
    arena: "AI Arena",
    arenaBody: "No public agent competition is running. We will publish this surface only when entries, trades and scores come from the server.",
    inspect: "Inspect status",
    error: "Some live data could not be loaded.",
  },
  fr: {
    paper: "Paper trading sur données de marché réelles",
    title1: "Trade le marché.",
    title2: "Prouve le résultat.",
    lead: "Positions Paper, performance persistée et compétitions financées en XRP. Tide affiche uniquement les données du backend et les paiements vérifiés sur XRPL.",
    trade: "Lancer le paper trading",
    wallet: "Connecter le wallet",
    liveData: "Données réelles de la plateforme",
    competitions: "Compétitions réelles",
    entries: "Entrées vérifiées",
    pool: "Pool XRP vérifiée",
    markets: "Marchés issus du feed",
    winner: "Le rang #1 reçoit 100 % de la pool des tickets vérifiés. Aucun rake.",
    open: "Ouvrir",
    noCompetition: "Aucune compétition n'a encore été créée par l'opérateur.",
    leaderboard: "Classement réel",
    noLeader: "Aucun compte persisté n'a encore de rang.",
    equity: "equity",
    arena: "Arène IA",
    arenaBody: "Aucune compétition publique d'agents n'est en cours. Cette surface sera publiée uniquement lorsque les entrées, trades et scores viendront du serveur.",
    inspect: "Voir l'état",
    error: "Certaines données réelles n'ont pas pu être chargées.",
  },
});

const totalEntries = computed(() =>
  competitions.value.reduce((sum, competition) => sum + competition.participants, 0),
);
const totalPool = computed(() =>
  competitions.value.reduce((sum, competition) => sum + competition.pot, 0),
);

function money(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function shortId(value: string): string {
  return value.length > 22 ? `${value.slice(0, 9)}…${value.slice(-7)}` : value;
}

onMounted(async () => {
  const results = await Promise.allSettled([
    props.client.competitions(),
    props.client.leaderboard(),
    props.client.markets(),
  ]);
  const competitionResult = results[0];
  const leaderboardResult = results[1];
  const marketsResult = results[2];
  if (competitionResult.status === "fulfilled") competitions.value = competitionResult.value;
  if (leaderboardResult.status === "fulfilled") leaders.value = leaderboardResult.value.slice(0, 5);
  if (marketsResult.status === "fulfilled") marketCount.value = marketsResult.value.length;
  if (results.some((result) => result.status === "rejected")) error.value = t("error");
  loading.value = false;
});
</script>

<template>
  <section class="landing">
    <nav>
      <a href="#/" class="brand"><span class="mark"><BrandMark /></span><b>TIDE</b></a>
      <div><LangToggle /><button type="button" @click="wallet.connect">{{ t("wallet") }}</button></div>
    </nav>

    <header class="hero">
      <span>{{ t("paper") }}</span>
      <h1>{{ t("title1") }}<br /><em>{{ t("title2") }}</em></h1>
      <p>{{ t("lead") }}</p>
      <div class="actions">
        <a href="#/dashboard" @click.prevent="emit('navigate', '/dashboard')">{{ t("trade") }} →</a>
        <a class="ghost" href="#/competitions" @click.prevent="emit('navigate', '/competitions')">{{ t("competitions") }}</a>
      </div>
    </header>

    <section class="metrics">
      <h2>{{ t("liveData") }}</h2>
      <div class="metric-grid">
        <article><strong>{{ competitions.length }}</strong><span>{{ t("competitions") }}</span></article>
        <article><strong>{{ totalEntries }}</strong><span>{{ t("entries") }}</span></article>
        <article><strong>{{ money(totalPool) }}</strong><span>{{ t("pool") }}</span></article>
        <article><strong>{{ marketCount }}</strong><span>{{ t("markets") }}</span></article>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="split">
      <article class="panel">
        <header><h2>{{ t("competitions") }}</h2><p>{{ t("winner") }}</p></header>
        <p v-if="!loading && competitions.length === 0" class="empty">{{ t("noCompetition") }}</p>
        <a
          v-for="competition in competitions.slice(0, 4)"
          :key="competition.id"
          class="data-row"
          :href="`#/competition/${competition.id}`"
          @click.prevent="emit('navigate', `/competition/${competition.id}`)"
        >
          <span><b>{{ competition.nameEn }}</b><small>{{ competition.status }} · {{ competition.participants }} {{ t("entries").toLowerCase() }}</small></span>
          <strong>{{ money(competition.pot) }} XRP</strong>
        </a>
        <a class="inline" href="#/competitions" @click.prevent="emit('navigate', '/competitions')">{{ t("open") }} →</a>
      </article>

      <article class="panel">
        <header><h2>{{ t("leaderboard") }}</h2></header>
        <p v-if="!loading && leaders.length === 0" class="empty">{{ t("noLeader") }}</p>
        <div v-for="leader in leaders" :key="leader.userId" class="data-row">
          <span><b>#{{ leader.rank }} · {{ shortId(leader.userId) }}</b><small>{{ t("equity") }}</small></span>
          <strong>${{ money(leader.equity) }}</strong>
        </div>
        <a class="inline" href="#/leaderboard" @click.prevent="emit('navigate', '/leaderboard')">{{ t("open") }} →</a>
      </article>
    </section>

    <section class="arena">
      <span>{{ t("arena") }}</span>
      <h2>{{ t("arenaBody") }}</h2>
      <a href="#/arena" @click.prevent="emit('navigate', '/arena')">{{ t("inspect") }} →</a>
    </section>
  </section>
</template>

<style scoped>
.landing{--paper:#f1f0eb;min-height:100vh;background:var(--paper);color:#111;padding:0 34px 80px}nav{height:86px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #c9c8c2}nav>div{display:flex;align-items:center;gap:12px}.brand{display:flex;align-items:center;gap:10px;color:#111;font-size:20px}.mark{width:36px;height:36px;padding:7px;border-radius:10px;background:var(--blue);display:block}nav button,.actions a,.arena a{border:0;border-radius:999px;background:#111;color:#fff;padding:13px 19px;font-weight:800}.hero{padding:80px 0 110px;max-width:1320px;margin:auto}.hero>span,.arena>span{font:11px var(--mono);text-transform:uppercase;letter-spacing:.14em}.hero h1{font-size:clamp(64px,11vw,170px);line-height:.78;text-transform:uppercase;letter-spacing:-.055em;margin:28px 0 42px}.hero em{font-style:normal;color:var(--blue)}.hero p{max-width:760px;font-size:19px;line-height:1.55}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px}.actions .ghost{background:transparent;color:#111;border:1px solid #aaa}.metrics,.split,.arena{max-width:1320px;margin:auto}.metrics h2,.panel h2{font-size:28px;text-transform:uppercase}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);margin-top:22px;border-top:1px solid #aaa;border-bottom:1px solid #aaa}.metric-grid article{padding:28px 18px;border-right:1px solid #aaa;display:flex;flex-direction:column;gap:8px}.metric-grid article:last-child{border:0}.metric-grid strong{font:700 42px var(--mono)}.metric-grid span,.panel p,.empty{color:#686762}.error{color:#a83232;margin-top:14px}.split{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:70px}.panel{background:#111;color:#fff;border-radius:20px;padding:30px}.panel header{margin-bottom:22px}.panel header p{margin-top:9px;line-height:1.5}.data-row{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:17px 0;border-top:1px solid #353535;color:#fff}.data-row span{display:flex;flex-direction:column;gap:5px;min-width:0}.data-row b{overflow-wrap:anywhere}.data-row small{color:#999}.data-row strong{font-family:var(--mono);white-space:nowrap}.inline{display:inline-block;color:var(--up);margin-top:22px}.empty{padding:25px 0}.arena{margin-top:90px;background:var(--blue);color:#fff;padding:55px;border-radius:24px}.arena h2{font-size:clamp(32px,5vw,70px);line-height:1.03;max-width:1050px;margin:24px 0 35px}.arena a{display:inline-block;background:#fff;color:var(--blue)}@media(max-width:800px){.landing{padding:0 18px 50px}.hero{padding:60px 0 80px}.metric-grid{grid-template-columns:1fr 1fr}.metric-grid article:nth-child(2){border-right:0}.split{grid-template-columns:1fr}.arena{padding:35px 24px}}@media(max-width:520px){nav button{display:none}.metric-grid{grid-template-columns:1fr}.metric-grid article{border-right:0;border-bottom:1px solid #aaa}.data-row{align-items:flex-start;flex-direction:column}}
</style>
