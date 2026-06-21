<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { TideClient } from "@tide/client";
import { useLeaderboard } from "../composables/useLeaderboard";
import { formatAmount, formatSigned } from "../lib/format";
import AppPage from "../components/AppPage.vue";
import SectionHead from "../components/ui/SectionHead.vue";
import OutlineButton from "../components/ui/OutlineButton.vue";
import LcdReadout from "../components/ui/LcdReadout.vue";

const props = defineProps<{ client: TideClient }>();
const { entries, error, load } = useLeaderboard(props.client);

const count = computed(() => String(entries.value.length).padStart(3, "0"));

onMounted(load);
</script>

<template>
  <AppPage>
    <SectionHead eyebrow="Classement" title="Leaderboard.">
      Classé à l'equity du portefeuille. Un track record public — c'est ce que tu
      pourras prouver on-chain en passant en Live.
    </SectionHead>

    <div class="bar">
      <LcdReadout label="Joueurs classés">{{ count }}</LcdReadout>
      <OutlineButton @click="load">Rafraîchir</OutlineButton>
    </div>

    <div v-if="entries.length > 0" class="board">
      <div class="row row--head">
        <span class="t-eyebrow">#</span>
        <span class="t-eyebrow">Joueur</span>
        <span class="t-eyebrow col-num">Equity</span>
        <span class="t-eyebrow col-num">PnL</span>
      </div>
      <div v-for="entry in entries" :key="entry.userId" class="row">
        <span class="rank">{{ String(entry.rank).padStart(2, "0") }}</span>
        <span class="player t-subheading">{{ entry.userId }}</span>
        <span class="equity col-num">{{ formatAmount(entry.equity) }}</span>
        <span class="pnl col-num" :class="{ 'pnl--down': entry.pnl < 0 }">
          <span class="pnl__caret">{{ entry.pnl >= 0 ? "▲" : "▼" }}</span>
          {{ formatSigned(entry.pnl) }}
        </span>
      </div>
    </div>
    <p v-else class="empty">Aucun joueur classé pour l'instant.</p>

    <p v-if="error" class="error">{{ error }}</p>
  </AppPage>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-20);
}

.board {
  display: flex;
  flex-direction: column;
}

.row {
  display: grid;
  grid-template-columns: 56px 1fr 160px 160px;
  align-items: baseline;
  gap: var(--spacing-20);
  padding: var(--spacing-20) 0;
  border-bottom: 1px solid var(--hairline-dark);
}
.row--head {
  padding-bottom: var(--spacing-13);
}

.col-num {
  text-align: right;
}

.rank {
  font-family: var(--font-lcd);
  font-size: var(--text-lcd);
  letter-spacing: var(--tracking-lcd);
  color: var(--text-on-dark-muted);
}

.player {
  color: var(--color-paper);
}

.equity {
  font-size: var(--text-subheading);
  letter-spacing: var(--tracking-subheading);
}

.pnl {
  font-size: var(--text-subheading);
  letter-spacing: var(--tracking-subheading);
  font-weight: var(--weight-medium);
  color: var(--color-paper);
}
/* Achromatie : la baisse recule (steel), elle ne devient pas rouge. */
.pnl--down {
  color: var(--text-on-dark-muted);
}
.pnl__caret {
  font-size: var(--text-micro);
}

@media (max-width: 620px) {
  .row {
    grid-template-columns: 40px 1fr 1fr;
  }
  .equity {
    display: none;
  }
  .row--head .col-num:first-of-type {
    display: none;
  }
}
</style>
