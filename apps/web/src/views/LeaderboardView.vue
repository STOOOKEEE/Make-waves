<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { TideClient } from "@tide/client";
import { useLeaderboard } from "../composables/useLeaderboard";
import { useSession } from "../composables/useSession";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();
const { userId } = useSession();
const leaderboard = useLeaderboard(props.client);
const search = ref("");

const { t } = useI18n({
  en: {
    title: "Leaderboard",
    subtitle: "Persisted accounts ranked by current equity. No demo traders or estimated rewards.",
    search: "Search an account…",
    refresh: "Refresh",
    rank: "Rank",
    account: "Account",
    equity: "Equity",
    pnl: "PnL",
    empty: "No real account has entered the leaderboard yet.",
    you: "you",
  },
  fr: {
    title: "Classement",
    subtitle: "Comptes persistés classés par equity réelle. Aucun trader de démo ni récompense estimée.",
    search: "Rechercher un compte…",
    refresh: "Rafraîchir",
    rank: "Rang",
    account: "Compte",
    equity: "Equity",
    pnl: "PnL",
    empty: "Aucun compte réel n'est encore entré dans le classement.",
    you: "toi",
  },
});

const rows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return query === ""
    ? leaderboard.entries.value
    : leaderboard.entries.value.filter((entry) =>
        entry.userId.toLowerCase().includes(query),
      );
});
const podium = computed(() => leaderboard.entries.value.slice(0, 3));

function money(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function shortId(value: string): string {
  return value.length > 24 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

onMounted(() => {
  void leaderboard.load();
});
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <h1>{{ t("title") }}</h1>
        <p>{{ t("subtitle") }}</p>
      </div>
      <button type="button" @click="leaderboard.load">{{ t("refresh") }}</button>
    </header>

    <div v-if="podium.length > 0" class="podium">
      <article v-for="entry in podium" :key="entry.userId" class="card pod">
        <span>#{{ entry.rank }}</span>
        <strong>{{ shortId(entry.userId) }}</strong>
        <b>{{ money(entry.equity) }}</b>
      </article>
    </div>

    <div class="controls">
      <input v-model="search" :placeholder="t('search')" />
      <span>{{ rows.length }}</span>
    </div>

    <p v-if="leaderboard.error.value" class="state error">{{ leaderboard.error.value }}</p>
    <div v-else class="card board">
      <div class="row head">
        <span>{{ t("rank") }}</span>
        <span>{{ t("account") }}</span>
        <span>{{ t("equity") }}</span>
        <span>{{ t("pnl") }}</span>
      </div>
      <div
        v-for="entry in rows"
        :key="entry.userId"
        class="row"
        :class="{ mine: entry.userId === userId }"
      >
        <b>#{{ entry.rank }}</b>
        <span class="account">
          {{ shortId(entry.userId) }}
          <em v-if="entry.userId === userId">{{ t("you") }}</em>
        </span>
        <strong>{{ money(entry.equity) }}</strong>
        <strong :class="entry.pnl >= 0 ? 'up' : 'down'">{{ money(entry.pnl) }}</strong>
      </div>
      <p v-if="rows.length === 0" class="state">{{ t("empty") }}</p>
    </div>
  </section>
</template>

<style scoped>
.page{padding:24px}.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px}.page-head h1{font-size:clamp(42px,7vw,92px);line-height:.9;text-transform:uppercase}.page-head p{color:var(--soft);margin-top:12px}.page-head button,.controls input{border:1px solid var(--line2);background:var(--panel);color:#fff;border-radius:10px;padding:12px 16px}.podium{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}.pod{padding:22px;display:flex;flex-direction:column;gap:8px}.pod span{font:12px var(--mono);color:var(--soft)}.pod strong{overflow-wrap:anywhere}.pod b{font:700 22px var(--mono);color:var(--up)}.controls{display:flex;align-items:center;gap:12px;margin:18px 0}.controls input{flex:1}.controls span{font:12px var(--mono);color:var(--soft)}.board{overflow:hidden}.row{display:grid;grid-template-columns:80px minmax(180px,1fr) 180px 180px;gap:14px;padding:16px 20px;border-bottom:1px solid var(--line);align-items:center}.row.head{font:10px var(--mono);text-transform:uppercase;letter-spacing:.1em;color:var(--soft)}.row strong{font-family:var(--mono);text-align:right}.row.mine{background:rgba(79,106,255,.1)}.account{overflow-wrap:anywhere}.account em{margin-left:8px;color:var(--up);font:10px var(--mono)}.up{color:var(--up)}.down,.error{color:var(--down)}.state{padding:42px;text-align:center;color:var(--soft)}@media(max-width:760px){.page{padding:18px}.podium{grid-template-columns:1fr}.row{grid-template-columns:55px 1fr 110px}.row>:last-child{display:none}}
</style>
