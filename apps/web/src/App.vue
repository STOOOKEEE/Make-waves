<script setup lang="ts">
import { createClient } from "./lib/client";
import { useRoute } from "./composables/useRoute";
import AppBar from "./components/AppBar.vue";
import SignModal from "./components/SignModal.vue";
import LandingView from "./views/LandingView.vue";
import DashboardView from "./views/DashboardView.vue";
import PortfolioView from "./views/PortfolioView.vue";
import LeaderboardView from "./views/LeaderboardView.vue";
import CompetitionsView from "./views/CompetitionsView.vue";
import CompetitionView from "./views/CompetitionView.vue";
import ArenaView from "./views/ArenaView.vue";
import LearnView from "./views/LearnView.vue";
import LearnArticleView from "./views/LearnArticleView.vue";

const client = createClient();
const { current, competitionId, routeId, navigate } = useRoute();
</script>

<template>
  <div class="grain"></div>
  <AppBar v-if="current !== '/'" :current="current" :client="client" @navigate="navigate" />

  <main id="main" tabindex="-1">
    <LandingView v-if="current === '/'" :client="client" @navigate="navigate" />
    <DashboardView v-else-if="current === '/dashboard'" :client="client" />
    <PortfolioView v-else-if="current === '/portfolio'" :client="client" />
    <LeaderboardView v-else-if="current === '/leaderboard'" :client="client" />
    <CompetitionsView
      v-else-if="current === '/competitions'"
      :client="client"
      @navigate="navigate"
    />
    <CompetitionView
      v-else-if="current === '/competition'"
      :client="client"
      :competition-id="competitionId"
      @navigate="navigate"
    />
    <ArenaView v-else-if="current === '/arena'" @navigate="navigate" />
    <LearnView v-else-if="current === '/learn' && !routeId" @navigate="navigate" />
    <LearnArticleView
      v-else-if="current === '/learn'"
      :slug="routeId"
      @navigate="navigate"
    />
  </main>

  <SignModal :client="client" />
</template>

<style scoped>
main:focus-visible {
  outline: none;
}
</style>
