<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import type { TideClient } from "@tide/client";
import StatusBadge from "../components/StatusBadge.vue";
import { useCompetitions } from "../composables/useCompetitions";
import { useSession } from "../composables/useSession";
import { useWallet } from "../composables/useWallet";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient; competitionId?: string }>();
const emit = defineEmits<{ navigate: [path: string] }>();
const competitions = useCompetitions(props.client);
const session = useSession();
const wallet = useWallet(props.client);

const { t, locale } = useI18n({
  en: {
    back: "All competitions",
    ticket: "Entry ticket",
    pool: "Verified prize pool",
    entries: "Paid entries",
    mode: "Trading mode",
    opens: "Starts",
    closes: "Ends",
    reward: "Reward",
    winnerAll: "Rank #1 receives all entry tickets (100%, no rake).",
    leaderboard: "Real leaderboard",
    emptyBoard: "No paid participant yet.",
    join: "Pay ticket & join",
    connect: "Connect wallet to join",
    joined: "Entry verified ✓",
    ended: "Registration closed",
    unavailable: "XRPL ticket runtime is not configured.",
    paper: "Paper trading · real market prices",
    liveMode: "Live trading · on-chain scoring",
    return: "Return",
    equity: "Equity",
  },
  fr: {
    back: "Toutes les compétitions",
    ticket: "Ticket d'entrée",
    pool: "Cagnotte vérifiée",
    entries: "Entrées payées",
    mode: "Mode de trading",
    opens: "Début",
    closes: "Fin",
    reward: "Récompense",
    winnerAll: "Le rang #1 reçoit tous les tickets d'entrée (100 %, sans rake).",
    leaderboard: "Classement réel",
    emptyBoard: "Aucun participant payé pour le moment.",
    join: "Payer le ticket et participer",
    connect: "Connecter le wallet pour participer",
    joined: "Entrée vérifiée ✓",
    ended: "Inscriptions terminées",
    unavailable: "Le runtime des tickets XRPL n'est pas configuré.",
    paper: "Paper trading · prix de marché réels",
    liveMode: "Trading Live · scoring on-chain",
    return: "Rendement",
    equity: "Equity",
  },
});

async function load(): Promise<void> {
  if (props.competitionId !== undefined) await competitions.loadOne(props.competitionId);
}
onMounted(() => void load());
watch(() => props.competitionId, () => void load());

const competition = computed(() => competitions.current.value);
const joined = computed(
  () => session.liveAddress.value !== "" && competitions.participants.value.includes(session.liveAddress.value),
);
const name = computed(() => {
  const value = competition.value;
  if (value === null) return "";
  return locale.value === "fr" ? value.nameFr : value.nameEn;
});
const description = computed(() => {
  const value = competition.value;
  if (value === null) return "";
  return locale.value === "fr" ? value.descriptionFr : value.descriptionEn;
});

function xrp(value: number): string {
  return `${value.toLocaleString(locale.value, { maximumFractionDigits: 6 })} XRP`;
}
function money(value: number): string {
  return value.toLocaleString(locale.value, { maximumFractionDigits: 2 });
}
function date(value: number): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(value);
}
function short(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

async function enter(): Promise<void> {
  const value = competition.value;
  if (value === null || joined.value || value.status === "ended") return;
  if (!session.walletConnected.value) {
    wallet.connect();
    return;
  }
  await wallet.signCompetitionEntry(value.id);
  await load();
}

const buttonLabel = computed(() => {
  const value = competition.value;
  if (joined.value) return t("joined");
  if (value?.status === "ended") return t("ended");
  if (!session.walletConnected.value) return t("connect");
  return t("join");
});
</script>

<template>
  <div class="page competition-page">
    <a href="#" class="back" @click.prevent="emit('navigate', '/competitions')">← {{ t("back") }}</a>
    <div v-if="competitions.loading.value && competition === null" class="card state">Loading…</div>
    <div v-else-if="competition === null" class="card state error">{{ competitions.error.value }}</div>
    <template v-else>
      <section class="card hero">
        <div>
          <StatusBadge :status="competition.status" />
          <h1>{{ name }}</h1>
          <p>{{ description }}</p>
          <div class="dates"><span>{{ t("opens") }} · {{ date(competition.startsAt) }}</span><span>{{ t("closes") }} · {{ date(competition.endsAt) }}</span></div>
        </div>
        <div class="join-box">
          <span>{{ t("pool") }}</span>
          <strong>{{ xrp(competition.pot) }}</strong>
          <small>{{ competition.participants }} {{ t("entries").toLowerCase() }}</small>
          <button :disabled="joined || competition.status === 'ended' || !competition.entryPaymentEnabled" @click="enter">{{ buttonLabel }}</button>
          <em v-if="!competition.entryPaymentEnabled">{{ t("unavailable") }}</em>
        </div>
      </section>

      <div class="two-col">
        <section class="card panel">
          <h2>{{ t("mode") }}</h2>
          <dl>
            <div><dt>{{ t("mode") }}</dt><dd>{{ t(competition.mode === 'paper' ? 'paper' : 'liveMode') }}</dd></div>
            <div><dt>{{ t("ticket") }}</dt><dd>{{ xrp(competition.buyIn) }}</dd></div>
          </dl>
        </section>
        <section class="card panel reward">
          <h2>{{ t("reward") }}</h2>
          <strong>{{ xrp(competition.pot) }}</strong>
          <p>{{ t("winnerAll") }}</p>
          <small v-if="competition.winnerUserId">Winner · {{ short(competition.winnerUserId) }}</small>
        </section>
      </div>

      <section class="card panel leaderboard">
        <h2>{{ t("leaderboard") }}</h2>
        <div v-if="competitions.leaderboard.value.length === 0" class="empty-board">
          {{ competitions.error.value || t("emptyBoard") }}
        </div>
        <div v-else class="rows">
          <div v-for="row in competitions.leaderboard.value" :key="row.userId" class="rank-row">
            <b>#{{ row.rank }}</b><span>{{ short(row.walletAddress) }}</span>
            <span>{{ t("equity") }} · {{ money(row.equity) }}</span>
            <strong :class="{ down: row.returnPct < 0 }">{{ row.returnPct >= 0 ? '+' : '' }}{{ row.returnPct.toFixed(2) }}% {{ t("return").toLowerCase() }}</strong>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.competition-page{padding-top:18px}.back{display:inline-block;margin-bottom:16px;color:var(--soft);font:11px var(--mono);text-transform:uppercase;letter-spacing:.08em}.hero{padding:34px;display:grid;grid-template-columns:1.5fr .8fr;gap:30px}.hero h1{font-size:clamp(34px,5vw,62px);line-height:.95;text-transform:uppercase;margin:20px 0 14px}.hero p{color:var(--soft);line-height:1.65;max-width:650px}.dates{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px;color:var(--soft);font:11px var(--mono)}.join-box{border:1px solid var(--line2);border-radius:16px;padding:25px;display:flex;flex-direction:column;text-align:center;justify-content:center}.join-box>span,.join-box small{color:var(--soft);font:10px var(--mono);text-transform:uppercase;letter-spacing:.1em}.join-box strong{font:700 clamp(35px,5vw,58px) var(--mono);color:var(--up);margin:8px 0}.join-box button{margin-top:20px;border:0;border-radius:11px;padding:15px;background:#fff;color:var(--blue);font-weight:850}.join-box button:disabled{opacity:.45}.join-box em{color:var(--down);font-size:11px;margin-top:10px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.panel{padding:25px}.panel h2{text-transform:uppercase;font-size:16px;margin-bottom:20px}.panel dl div{display:flex;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid var(--line)}dt{color:var(--soft)}dd{text-align:right;font:600 13px var(--mono)}.reward>strong{font:700 38px var(--mono);color:var(--up)}.reward p{color:var(--soft);margin:14px 0}.reward small{font:11px var(--mono)}.leaderboard{margin-top:14px}.rank-row{display:grid;grid-template-columns:60px 1fr 1fr 1fr;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);align-items:center;font:12px var(--mono)}.rank-row strong{text-align:right;color:var(--up)}.rank-row strong.down{color:var(--down)}.empty-board,.state{padding:45px;text-align:center;color:var(--soft)}.error{color:var(--down)}
@media(max-width:800px){.hero,.two-col{grid-template-columns:1fr}.rank-row{grid-template-columns:45px 1fr}.rank-row span:nth-child(3){display:none}}
</style>
