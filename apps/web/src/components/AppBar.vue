<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import BrandMark from "./BrandMark.vue";
import LangToggle from "./LangToggle.vue";
import type { RoutePath } from "../composables/useRoute";
import type { TideClient } from "@tide/client";
import { useSession } from "../composables/useSession";
import { useWallet } from "../composables/useWallet";
import { fmtNum } from "../data/markets";
import { useI18n } from "../i18n/useI18n";

/* App-bar des écrans app (posée sur le bleu). Wordmark + onglets pills + rang
 * + équité + identité, branchés sur le compte de session (valeurs réelles). */

const REFRESH_MS = 4000;

const props = defineProps<{ current: RoutePath; client: TideClient }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { userId, connected, liveAddress, walletConnected } = useSession();
const wallet = useWallet(props.client);

function shorten(addr: string): string {
  return addr.length > 12 ? addr.slice(0, 6) + "…" + addr.slice(-4) : addr;
}
function onWallet(): void {
  if (!walletConnected.value) {
    void wallet.connect();
  }
}

const { t } = useI18n({
  en: {
    trading: "Trading",
    portfolio: "Portfolio",
    leaderboard: "Leaderboard",
    competitions: "Competitions",
    arena: "AI Arena",
    rank: "Season rank",
    equity: "Equity · S04",
    connect: "Connect",
    connectWallet: "Connect wallet",
  },
  fr: {
    trading: "Trading",
    portfolio: "Portefeuille",
    leaderboard: "Classement",
    competitions: "Compétitions",
    arena: "Arène IA",
    rank: "Rang saison",
    equity: "Équité · S04",
    connect: "Se connecter",
    connectWallet: "Connecter le wallet",
  },
});

// Équité + rang réels du compte de session, rafraîchis périodiquement.
const equity = ref<number | null>(null);
const rank = ref<number | null>(null);

async function refresh(): Promise<void> {
  if (!connected.value) {
    equity.value = null;
    rank.value = null;
    return;
  }
  try {
    await props.client.ensureAccount(userId.value);
    const portfolio = await props.client.portfolio(userId.value);
    equity.value = portfolio.equity;
    const board = await props.client.leaderboard();
    rank.value = board.find((e) => e.userId === userId.value)?.rank ?? null;
  } catch {
    // API indisponible : on conserve la dernière valeur connue.
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void refresh();
  timer = setInterval(() => void refresh(), REFRESH_MS);
});
onUnmounted(() => {
  if (timer !== undefined) {
    clearInterval(timer);
  }
});

const equityLabel = computed(() =>
  equity.value === null ? "—" : "$" + fmtNum(equity.value),
);
const rankLabel = computed(() => (rank.value === null ? "—" : "#" + rank.value));
const walletLabel = computed(() =>
  walletConnected.value ? shorten(liveAddress.value) : t("connectWallet"),
);

const tabs = computed<{ path: RoutePath; label: string }[]>(() => [
  { path: "/dashboard", label: t("trading") },
  { path: "/portfolio", label: t("portfolio") },
  { path: "/leaderboard", label: t("leaderboard") },
  { path: "/competitions", label: t("competitions") },
  { path: "/arena", label: t("arena") },
]);

function go(path: string): void {
  emit("navigate", path);
}
</script>

<template>
  <header class="appbar">
    <a class="brand" href="#/" @click.prevent="go('/')">
      <span class="mk"><BrandMark /></span>TIDE
    </a>
    <nav class="tabs">
      <a
        v-for="t in tabs"
        :key="t.path"
        :class="{ on: current === t.path || (t.path === '/competitions' && current === '/competition') }"
        :href="`#${t.path}`"
        @click.prevent="go(t.path)"
        >{{ t.label }}</a
      >
    </nav>
    <div class="spacer"></div>
    <LangToggle variant="light" />
    <div class="rankchip">{{ t("rank") }} <b>{{ rankLabel }}</b></div>
    <div class="equity">
      <div class="v">{{ equityLabel }}</div>
      <div class="l">{{ t("equity") }}</div>
    </div>
    <button class="wallet" @click="onWallet"><span class="dot"></span> {{ walletLabel }}</button>
  </header>
</template>
