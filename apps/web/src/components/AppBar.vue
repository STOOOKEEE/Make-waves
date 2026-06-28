<script setup lang="ts">
import { computed } from "vue";
import BrandMark from "./BrandMark.vue";
import LangToggle from "./LangToggle.vue";
import type { RoutePath } from "../composables/useRoute";
import { useI18n } from "../i18n/useI18n";

/* App-bar des écrans app (posée sur le bleu). Wordmark + onglets pills + rang
 * + équité + wallet pill. Les valeurs de droite sont illustratives (démo). */

defineProps<{ current: RoutePath }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { t } = useI18n({
  en: {
    trading: "Trading",
    portfolio: "Portfolio",
    leaderboard: "Leaderboard",
    competitions: "Competitions",
    arena: "AI Arena",
    rank: "Season rank",
    equity: "Equity · S04",
  },
  fr: {
    trading: "Trading",
    portfolio: "Portefeuille",
    leaderboard: "Classement",
    competitions: "Compétitions",
    arena: "Arène IA",
    rank: "Rang saison",
    equity: "Équité · S04",
  },
});

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
    <div class="rankchip">{{ t("rank") }} <b>#18</b></div>
    <div class="equity">
      <div class="v">$128,940.18</div>
      <div class="l">{{ t("equity") }}</div>
    </div>
    <button class="wallet"><span class="dot"></span> 0xPilote.eth</button>
  </header>
</template>
