<script setup lang="ts">
import { createClient } from "./lib/client";
import { useRoute } from "./composables/useRoute";
import NavPill from "./components/ui/NavPill.vue";
import HomeView from "./views/HomeView.vue";
import TerminalView from "./views/TerminalView.vue";
import LeaderboardView from "./views/LeaderboardView.vue";
import CompetitionsView from "./views/CompetitionsView.vue";

const client = createClient();
const { current, navigate } = useRoute();
</script>

<template>
  <NavPill :current="current" @navigate="navigate" />

  <main>
    <HomeView v-if="current === '/'" @navigate="navigate" />
    <TerminalView v-else-if="current === '/terminal'" :client="client" />
    <LeaderboardView v-else-if="current === '/leaderboard'" :client="client" />
    <CompetitionsView v-else :client="client" />
  </main>
</template>
