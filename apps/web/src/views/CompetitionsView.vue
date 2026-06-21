<script setup lang="ts">
import { ref } from "vue";
import type { TideClient } from "@tide/client";
import { useCompetitions } from "../composables/useCompetitions";

const props = defineProps<{ client: TideClient }>();
const { participants, lastResult, error, create, join, close } = useCompetitions(
  props.client,
);

const compId = ref("");
const buyIn = ref(10);
const joinUser = ref("");

async function onCreate(): Promise<void> {
  await create({
    id: compId.value,
    buyIn: buyIn.value,
    rakeRatio: 0,
    payoutWeights: [0.5, 0.3, 0.2],
  });
}
</script>

<template>
  <section>
    <h2>Compétitions</h2>

    <form @submit.prevent="onCreate">
      <input v-model="compId" placeholder="Id du tournoi" />
      <input v-model.number="buyIn" type="number" step="any" placeholder="Buy-in" />
      <button type="submit">Créer</button>
    </form>

    <form @submit.prevent="join(compId, joinUser)">
      <input v-model="joinUser" placeholder="Joueur à inscrire" />
      <button type="submit">Rejoindre</button>
    </form>

    <button @click="close(compId)">Clôturer</button>

    <h3>Participants</h3>
    <ul>
      <li v-for="participant in participants" :key="participant">{{ participant }}</li>
    </ul>

    <div v-if="lastResult">
      <h3>Résultat</h3>
      <p>Reliquat : {{ lastResult.undistributed }}</p>
      <ul>
        <li v-for="payout in lastResult.payouts" :key="payout.userId">
          {{ payout.userId }} (rang {{ payout.rank }}) : {{ payout.amount }}
        </li>
      </ul>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
