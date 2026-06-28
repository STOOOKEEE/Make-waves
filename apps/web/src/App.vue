<script setup lang="ts">
import { createClient } from "./lib/client";
import { useRoute } from "./composables/useRoute";
import AppBar from "./components/AppBar.vue";
import LandingView from "./views/LandingView.vue";
import DashboardView from "./views/DashboardView.vue";
import PortfolioView from "./views/PortfolioView.vue";
import LeaderboardView from "./views/LeaderboardView.vue";
import CompetitionsView from "./views/CompetitionsView.vue";
import CompetitionView from "./views/CompetitionView.vue";
import ArenaView from "./views/ArenaView.vue";

const client = createClient();
const { current, competitionId, navigate } = useRoute();
</script>

<template>
  <div class="grain"></div>
  <AppBar v-if="current !== '/'" :current="current" @navigate="navigate" />

  <main id="main" tabindex="-1">
    <LandingView v-if="current === '/'" @navigate="navigate" />
    <DashboardView v-else-if="current === '/dashboard'" :client="client" />
    <PortfolioView v-else-if="current === '/portfolio'" />
    <LeaderboardView v-else-if="current === '/leaderboard'" :client="client" />
    <CompetitionsView v-else-if="current === '/competitions'" @navigate="navigate" />
    <CompetitionView
      v-else-if="current === '/competition'"
      :client="client"
      :competition-id="competitionId"
      @navigate="navigate"
    />
    <ArenaView v-else-if="current === '/arena'" @navigate="navigate" />
  </main>
</template>

<style scoped>
main:focus-visible {
  outline: none;
}
</style>
