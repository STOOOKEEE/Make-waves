<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { createClient } from "./lib/client";
import { useRoute } from "./composables/useRoute";
import { useAuth } from "./composables/useAuth";
import { useSession } from "./composables/useSession";
import AppBar from "./components/AppBar.vue";
import SignModal from "./components/SignModal.vue";
import AccountModal from "./components/AccountModal.vue";
import WalletEntryModal from "./components/WalletEntryModal.vue";
import { bootstrapAccountAuth } from "./composables/useAccountAuth";
import LandingView from "./views/LandingView.vue";
import DashboardView from "./views/DashboardView.vue";
import PortfolioView from "./views/PortfolioView.vue";
import LeaderboardView from "./views/LeaderboardView.vue";
import CompetitionsView from "./views/CompetitionsView.vue";
import CompetitionView from "./views/CompetitionView.vue";
import ArenaView from "./views/ArenaView.vue";
import LearnView from "./views/LearnView.vue";
import LearnArticleView from "./views/LearnArticleView.vue";

// La console d'administration est un outil local : cet import conditionnel est
// éliminé du build Vite de production, donc son code n'est jamais publié.
const LocalAdminView = import.meta.env.DEV
  ? defineAsyncComponent(() => import("./views/AdminView.vue"))
  : null;

// Archive de la landing d'avant le repositionnement « apprendre d'abord »,
// consultable sur #/landing-classic en développement. Même mécanisme que
// ci-dessus : l'import conditionnel est éliminé du build de production.
const LocalLandingClassicView = import.meta.env.DEV
  ? defineAsyncComponent(() => import("./views/LandingClassicView.vue"))
  : null;

const client = createClient();
bootstrapAccountAuth(client);
// Réinjecte une session cohérente avant tout appel API. Une adresse wallet
// persistée sans JWT wallet valide ne doit jamais rester affichée comme
// « connectée » : on revient alors à l'identité Paper et la reconnexion reste
// accessible depuis la barre d'app.
const session = useSession();
const restoredSession = useAuth(client).restore(session.liveAddress.value);
if (session.walletConnected.value && restoredSession !== "wallet") {
  session.disconnectWallet();
}
const { current, competitionId, routeId, navigate } = useRoute();
</script>

<template>
  <div class="grain"></div>
  <AppBar
    v-if="current !== '/landing' && current !== '/landing-classic'"
    :current="current"
    :client="client"
    @navigate="navigate"
  />

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
    <component
      :is="LocalLandingClassicView"
      v-else-if="current === '/landing-classic' && LocalLandingClassicView !== null"
      :client="client"
      @navigate="navigate"
    />
  </main>

  <SignModal :client="client" />
  <WalletEntryModal :client="client" />
  <AccountModal :client="client" @logged-out="navigate('/landing')" />
</template>

<style scoped>
main:focus-visible {
  outline: none;
}
</style>
