<script setup lang="ts">
import { onMounted } from "vue";
import type { TideClient } from "@tide/client";
import { useLeaderboard } from "../composables/useLeaderboard";

const props = defineProps<{ client: TideClient }>();
const { entries, error, load } = useLeaderboard(props.client);

onMounted(load);
</script>

<template>
  <section>
    <h2>Leaderboard</h2>
    <button @click="load">Rafraîchir</button>
    <table v-if="entries.length > 0">
      <thead>
        <tr><th>#</th><th>Joueur</th><th>Equity</th><th>PnL</th></tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.userId">
          <td>{{ entry.rank }}</td>
          <td>{{ entry.userId }}</td>
          <td>{{ entry.equity }}</td>
          <td>{{ entry.pnl }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>Aucun joueur classé.</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
