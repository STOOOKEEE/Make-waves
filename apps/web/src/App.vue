<script setup lang="ts">
import { ref } from "vue";
import { createClient } from "./lib/client";
import TerminalView from "./views/TerminalView.vue";
import LeaderboardView from "./views/LeaderboardView.vue";
import CompetitionsView from "./views/CompetitionsView.vue";

type Tab = "terminal" | "leaderboard" | "competitions";

const client = createClient();
const tab = ref<Tab>("terminal");
</script>

<template>
  <main class="app">
    <h1>Tide</h1>
    <nav>
      <button :class="{ active: tab === 'terminal' }" @click="tab = 'terminal'">
        Terminal
      </button>
      <button
        :class="{ active: tab === 'leaderboard' }"
        @click="tab = 'leaderboard'"
      >
        Leaderboard
      </button>
      <button
        :class="{ active: tab === 'competitions' }"
        @click="tab = 'competitions'"
      >
        Compétitions
      </button>
    </nav>

    <TerminalView v-if="tab === 'terminal'" :client="client" />
    <LeaderboardView v-else-if="tab === 'leaderboard'" :client="client" />
    <CompetitionsView v-else :client="client" />
  </main>
</template>

<style scoped>
.app {
  max-width: 720px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}
nav button.active {
  font-weight: bold;
}
input,
select,
button {
  margin: 0.2rem;
  padding: 0.4rem;
}
h2 {
  font-size: 1.1rem;
  margin-top: 1.5rem;
}
:deep(.error) {
  color: #c0392b;
}
table {
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #ddd;
  padding: 0.3rem 0.6rem;
}
</style>
