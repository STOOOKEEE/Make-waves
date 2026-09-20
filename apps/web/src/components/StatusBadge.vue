<script setup lang="ts">
import type { CompetitionStatus } from "@tide/client";
import { useI18n } from "../i18n/useI18n";

/* Badge d'état de compétition : live (menthe + point clignotant), soon (bleu),
 * ended (gris). Sémantique uniquement. */

const props = defineProps<{ status: CompetitionStatus }>();

const { t } = useI18n({
  en: { live: "Live", upcoming: "Upcoming", ended: "Ended" },
  fr: { live: "En cours", upcoming: "À venir", ended: "Terminée" },
});
</script>

<template>
  <span class="status" :class="status">
    <i v-if="status === 'live'"></i>{{ t(props.status) }}
  </span>
</template>

<style scoped>
.status {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  border-radius: 100px;
  padding: 5px 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.status.live {
  background: rgba(191, 246, 206, 0.16);
  color: var(--up);
}
.status.live i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--up);
  animation: bl 1.4s infinite;
}
.status.upcoming {
  background: rgba(79, 106, 255, 0.2);
  color: #aab8ff;
}
.status.ended {
  background: rgba(255, 255, 255, 0.08);
  color: var(--mut2);
}
@keyframes bl {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}
</style>
