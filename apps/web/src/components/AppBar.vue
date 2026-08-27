<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import BrandMark from "./BrandMark.vue";
import LangToggle from "./LangToggle.vue";
import type { RoutePath } from "../composables/useRoute";
import type { TideClient } from "@tide/client";
import { useSession } from "../composables/useSession";
import { useWallet } from "../composables/useWallet";
import { useWalletEntry } from "../composables/useWalletEntry";
import { fmtNum } from "../data/markets";
import { useI18n } from "../i18n/useI18n";
import { useAccountAuth } from "../composables/useAccountAuth";

/* App-bar des écrans app (posée sur le bleu). Wordmark + onglets pills + rang
 * + équité + identité, branchés sur le compte de session (valeurs réelles). */

const REFRESH_MS = 4000;

const props = defineProps<{ current: RoutePath; client: TideClient }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { userId, connected, liveAddress, walletConnected } = useSession();
const wallet = useWallet(props.client);
const walletEntry = useWalletEntry();
const account = useAccountAuth(props.client);

function shorten(addr: string): string {
  return addr.length > 12 ? addr.slice(0, 6) + "…" + addr.slice(-4) : addr;
}
function onWallet(): void {
  if (walletConnected.value) {
    wallet.disconnect();
    return;
  }
  walletEntry.show();
}

const { t } = useI18n({
  en: {
    trading: "Trading",
    portfolio: "Portfolio",
    leaderboard: "Leaderboard",
    competitions: "Competitions",
    arena: "AI Arena",
    agent: "AI Agent",
    learn: "Learn",
    rank: "Global rank",
    equity: "Paper equity",
    connect: "Connect",
    connectWallet: "Connect wallet",
    account: "Log in or create a wallet",
  },
  fr: {
    trading: "Trading",
    portfolio: "Portefeuille",
    leaderboard: "Classement",
    competitions: "Compétitions",
    arena: "Arène IA",
    agent: "Agent IA",
    learn: "Apprendre",
    rank: "Rang global",
    equity: "Equity Paper",
    connect: "Se connecter",
    connectWallet: "Connecter le wallet",
    account: "Se connecter ou créer un wallet",
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
const accountLabel = computed(() =>
  account.canLogout.value ? account.label.value : t("account"),
);

const tabs = computed<{ path: RoutePath; label: string }[]>(() => [
  { path: "/dashboard", label: t("trading") },
  { path: "/portfolio", label: t("portfolio") },
  { path: "/leaderboard", label: t("leaderboard") },
  { path: "/competitions", label: t("competitions") },
  { path: "/arena", label: t("arena") },
  { path: "/agent", label: t("agent") },
  { path: "/learn", label: t("learn") },
]);

function go(path: string): void {
  emit("navigate", path);
}
</script>

<template>
  <header class="appbar">
    <a class="brand" href="#/landing" @click.prevent="go('/landing')">
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
    <button class="wallet account" @click="account.open(null)">
      {{ accountLabel }}
    </button>
    <button class="wallet" :title="walletConnected ? 'Disconnect wallet' : t('connectWallet')" @click="onWallet"><span class="dot"></span> {{ walletLabel }}</button>
  </header>
</template>

<style scoped>
.account {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
