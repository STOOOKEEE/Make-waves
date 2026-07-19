<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { createClient } from "./lib/client";
import { useRoute } from "./composables/useRoute";
import { useAuth } from "./composables/useAuth";
import AppBar from "./components/AppBar.vue";
import SignModal from "./components/SignModal.vue";
import LandingView from "./views/LandingView.vue";
import DashboardView from "./views/DashboardView.vue";
import PortfolioView from "./views/PortfolioView.vue";
import LeaderboardView from "./views/LeaderboardView.vue";
import CompetitionsView from "./views/CompetitionsView.vue";
import CompetitionView from "./views/CompetitionView.vue";
import ArenaView from "./views/ArenaView.vue";
import AgentView from "./views/AgentView.vue";
import LearnView from "./views/LearnView.vue";
import LearnArticleView from "./views/LearnArticleView.vue";

// La console d'administration est un outil local : cet import conditionnel est
// éliminé du build Vite de production, donc son code n'est jamais publié.
const LocalAdminView = import.meta.env.DEV
  ? defineAsyncComponent(() => import("./views/AdminView.vue"))
  : null;

const client = createClient();
// Réinjecte un éventuel token de session persisté dès le démarrage (avant tout appel API).
useAuth(client).restore();
const { current, competitionId, routeId, navigate } = useRoute();
</script>

<template>
  <div class="grain"></div>
  <AppBar :current="current" :client="client" @navigate="navigate" />

  <main id="main" tabindex="-1">
    <LandingView v-if="current === '/landing'" :client="client" @navigate="navigate" />
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
    <AgentView v-else-if="current === '/agent'" :client="client" />
    <LearnView v-else-if="current === '/learn' && !routeId" @navigate="navigate" />
    <LearnArticleView
      v-else-if="current === '/learn'"
      :slug="routeId"
      @navigate="navigate"
    />
    <component
      :is="LocalAdminView"
      v-else-if="current === '/admin' && LocalAdminView !== null"
    />
  </main>

  <SignModal :client="client" />
</template>

<style scoped>
main:focus-visible {
  outline: none;
}
</style>
