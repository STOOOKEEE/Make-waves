<script setup lang="ts">
import { ref } from "vue";
import type { TideClient } from "@tide/client";
import { useCompetitions } from "../composables/useCompetitions";
import { formatAmount } from "../lib/format";
import AppPage from "../components/AppPage.vue";
import SectionHead from "../components/ui/SectionHead.vue";
import OutlineButton from "../components/ui/OutlineButton.vue";

const props = defineProps<{ client: TideClient }>();
const { participants, lastResult, error, create, join, close } = useCompetitions(
  props.client,
);

const compId = ref("");
const buyIn = ref(10);
const joinUser = ref("");

const PAYOUT_WEIGHTS = [0.5, 0.3, 0.2] as const;

async function onCreate(): Promise<void> {
  await create({
    id: compId.value,
    buyIn: buyIn.value,
    rakeRatio: 0,
    payoutWeights: [...PAYOUT_WEIGHTS],
  });
}
</script>

<template>
  <AppPage>
    <SectionHead eyebrow="Tournois" title="Compétitions.">
      Buy-in à l'inscription, classement au mérite, prize pool réparti aux
      premiers. Le buy-in est une transaction taggée — chaque inscription compte
      on-chain.
    </SectionHead>

    <div class="grid">
      <!-- Créer -->
      <div class="card">
        <h3 class="t-subheading">Nouveau tournoi</h3>
        <form class="form" @submit.prevent="onCreate">
          <div class="field">
            <label for="cid">Id du tournoi</label>
            <input id="cid" v-model="compId" placeholder="esilv-2026" />
          </div>
          <div class="field">
            <label for="buyin">Buy-in</label>
            <input
              id="buyin"
              v-model.number="buyIn"
              type="number"
              step="any"
              placeholder="10"
            />
          </div>
          <OutlineButton solid type="submit">Créer</OutlineButton>
        </form>
      </div>

      <!-- Rejoindre / gérer -->
      <div class="card">
        <h3 class="t-subheading">Participants</h3>
        <form class="form" @submit.prevent="join(compId, joinUser)">
          <div class="field">
            <label for="player">Joueur à inscrire</label>
            <input id="player" v-model="joinUser" placeholder="pseudo" />
          </div>
          <div class="card__actions">
            <OutlineButton type="submit">Rejoindre</OutlineButton>
            <OutlineButton @click="close(compId)">Clôturer</OutlineButton>
          </div>
        </form>

        <ul v-if="participants.length > 0" class="players">
          <li v-for="participant in participants" :key="participant" class="player">
            {{ participant }}
          </li>
        </ul>
        <p v-else class="empty">Aucun participant.</p>
      </div>
    </div>

    <!-- Résultat de clôture -->
    <div v-if="lastResult" class="result">
      <div class="result__head">
        <span class="t-eyebrow">Résultat de clôture</span>
        <span class="t-caption dim">
          Reliquat : {{ formatAmount(lastResult.undistributed) }}
        </span>
      </div>
      <ul class="payouts">
        <li v-for="payout in lastResult.payouts" :key="payout.userId" class="payout">
          <span class="rank">{{ String(payout.rank).padStart(2, "0") }}</span>
          <span class="t-subheading">{{ payout.userId }}</span>
          <span class="amount">{{ formatAmount(payout.amount) }}</span>
        </li>
      </ul>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </AppPage>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--element-gap);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-20);
  padding: var(--card-padding);
  border-radius: var(--radius-cards);
  background: var(--tint-raise);
  border: 1px solid var(--hairline-dark);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-13);
}

.card__actions {
  display: flex;
  gap: var(--spacing-10);
}

.players {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-10);
}
.players .player {
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-caption);
  padding: var(--spacing-5) var(--spacing-13);
  border-radius: var(--radius-links);
  border: 1px solid var(--hairline-dark);
  color: var(--text-on-dark-soft);
}

.result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-20);
  padding: var(--card-padding);
  border-radius: var(--radius-cards);
  background: var(--tint-raise-strong);
  border: 1px solid var(--hairline-dark);
}
.result__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--spacing-20);
}

.payouts {
  display: flex;
  flex-direction: column;
}
.payout {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: baseline;
  gap: var(--spacing-20);
  padding: var(--spacing-13) 0;
  border-bottom: 1px solid var(--hairline-dark);
}
.rank {
  font-family: var(--font-lcd);
  font-size: var(--text-lcd);
  letter-spacing: var(--tracking-lcd);
  color: var(--text-on-dark-muted);
}
.amount {
  font-size: var(--text-subheading);
  letter-spacing: var(--tracking-subheading);
  font-weight: var(--weight-medium);
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
