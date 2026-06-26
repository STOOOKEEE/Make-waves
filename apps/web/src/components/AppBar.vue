<script setup lang="ts">
import BrandMark from "./BrandMark.vue";
import type { RoutePath } from "../composables/useRoute";

/* App-bar des écrans app (posée sur le bleu). Wordmark + onglets pills + rang
 * + équité + wallet pill. Les valeurs de droite sont illustratives (démo). */

defineProps<{ current: RoutePath }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const tabs: { path: RoutePath; label: string }[] = [
  { path: "/dashboard", label: "Trading" },
  { path: "/portfolio", label: "Portefeuille" },
  { path: "/leaderboard", label: "Classement" },
  { path: "/competitions", label: "Compétitions" },
  { path: "/arena", label: "Arène IA" },
];

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
    <div class="rankchip">Rang saison <b>#18</b></div>
    <div class="equity">
      <div class="v">$128,940.18</div>
      <div class="l">Équité · S04</div>
    </div>
    <button class="wallet"><span class="dot"></span> 0xPilote.eth</button>
  </header>
</template>
