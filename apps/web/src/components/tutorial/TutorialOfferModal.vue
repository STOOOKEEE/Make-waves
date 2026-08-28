<script setup lang="ts">
/* Proposition du tutoriel au tout premier passage sur le terminal.
 *
 * Montée globalement dans `App.vue`, comme les trois autres modales du produit :
 * `DashboardView` n'est pas touché. Elle ne s'affiche qu'une fois — refuser
 * marque le tutoriel comme passé, et on ne redemande plus jamais. Un tutoriel
 * qui insiste est pire que pas de tutoriel du tout ; on le laisse retrouvable
 * depuis Tide School.
 */
import { computed } from "vue";
import { useI18n } from "../../i18n/useI18n";
import { useTutorial } from "../../composables/useTutorial";
import { STEP_COUNT } from "../../data/tutorial";

const emit = defineEmits<{ navigate: [path: string] }>();

const tutorial = useTutorial();

const { t } = useI18n({
  en: {
    kicker: "First time here",
    title: "Want the guided tour?",
    body: "Fifteen minutes in a sandbox on live market data. You'll place a real order, set a stop, and watch a leveraged position get liquidated — with fake money, and nothing that touches a wallet.",
    b1: "{n} steps, each one explains a single button",
    b2: "Perps, leverage and risk in depth",
    b3: "Skippable at any moment",
    accept: "Take the tour →",
    decline: "No thanks, I'll explore",
    later: "You can always start it from Tide School.",
  },
  fr: {
    kicker: "Première visite",
    title: "Tu veux la visite guidée ?",
    body: "Quinze minutes dans un bac à sable branché sur les données de marché en direct. Tu passeras un vrai ordre, poseras un stop, et verras une position à levier se faire liquider — en argent fictif, et sans que rien ne touche un wallet.",
    b1: "{n} étapes, chacune explique un seul bouton",
    b2: "Perps, levier et risque en profondeur",
    b3: "Passable à tout moment",
    accept: "Faire la visite →",
    decline: "Non merci, j'explore",
    later: "Tu peux toujours la lancer depuis Tide School.",
  },
});

const open = computed(() => tutorial.shouldOffer.value);

function accept(): void {
  tutorial.start();
  emit("navigate", "/tutorial");
}

/** Refuser = ne plus jamais proposer. Pas de relance, pas de rappel. */
function decline(): void {
  tutorial.skip();
}
</script>

<template>
  <div v-if="open" class="offer-overlay" role="dialog" aria-modal="true" :aria-label="t('title')">
    <div class="offer">
      <span class="lab kicker">{{ t("kicker") }}</span>
      <h2>{{ t("title") }}</h2>
      <p class="body">{{ t("body") }}</p>

      <ul class="points">
        <li>{{ t("b1", { n: STEP_COUNT }) }}</li>
        <li>{{ t("b2") }}</li>
        <li>{{ t("b3") }}</li>
      </ul>

      <div class="actions">
        <button class="primary" type="button" @click="accept">{{ t("accept") }}</button>
        <button class="ghost" type="button" @click="decline">{{ t("decline") }}</button>
      </div>
      <p class="later soft">{{ t("later") }}</p>
    </div>
  </div>
</template>

<style scoped>
button { background: none; border: none; color: inherit; padding: 0; cursor: pointer; }

.offer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1250;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(8, 8, 12, 0.72);
  backdrop-filter: blur(8px);
}
.offer {
  width: min(520px, 100%);
  background: var(--panel);
  border: 1px solid var(--line2);
  border-radius: 18px;
  padding: 30px 32px 26px;
  display: grid;
  gap: 12px;
}
.kicker { color: var(--up); }
.offer h2 {
  font-family: var(--disp);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
}
.body { color: var(--soft); font-size: 15px; line-height: 1.6; }
.points { display: grid; gap: 8px; margin-top: 4px; }
.points li {
  position: relative;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.45;
}
.points li::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--blue);
}
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.actions button {
  border-radius: 100px;
  padding: 13px 22px;
  font-weight: 700;
  font-size: 14px;
  border: 1px solid transparent;
}
.actions .primary { background: #fff; color: var(--panel); flex: 1; }
.actions .ghost { border-color: var(--line2); color: var(--text); }
.actions .ghost:hover { border-color: var(--text); }
.later { font-size: 12px; }
@media (max-width: 560px) {
  .offer { padding: 24px 20px 20px; }
  .actions .primary { flex: 1 1 100%; }
}
</style>
