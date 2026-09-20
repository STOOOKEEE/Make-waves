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
import TutorialConcept from "./TutorialConcept.vue";
import { useI18n } from "../../i18n/useI18n";
import { useTutorial } from "../../composables/useTutorial";
import { STEP_COUNT } from "../../data/tutorial";

const emit = defineEmits<{ navigate: [path: string] }>();

const tutorial = useTutorial();

const { t } = useI18n({
  en: {
    kicker: "First time here",
    title: "Learn the terminal by trading",
    body: "Fifteen minutes in a sandbox on live market data. You'll place a simulated order, set a stop, and watch a leveraged position get liquidated — with fake money, and nothing that touches a wallet.",
    b1: "{n} steps, each one explains a single button",
    b2: "Perps, leverage and risk in depth",
    b3: "Skippable at any moment",
    accept: "Start training →",
    decline: "No thanks, I'll explore",
    later: "You can always start it from Tide School.",
    visualLab: "TIDE TRAINING LAB",
    visualNote: "LIVE DATA · VIRTUAL CAPITAL · ZERO WALLET ACTION",
  },
  fr: {
    kicker: "Première visite",
    title: "Apprends le terminal en tradant",
    body: "Quinze minutes dans un bac à sable branché sur les données de marché en direct. Tu passeras un ordre simulé, poseras un stop, et verras une position à levier se faire liquider — en argent fictif, et sans que rien ne touche un wallet.",
    b1: "{n} étapes, chacune explique un seul bouton",
    b2: "Perps, levier et risque en profondeur",
    b3: "Passable à tout moment",
    accept: "Commencer l'entraînement →",
    decline: "Non merci, j'explore",
    later: "Tu peux toujours la lancer depuis Tide School.",
    visualLab: "LABO D'ENTRAÎNEMENT TIDE",
    visualNote: "DONNÉES RÉELLES · CAPITAL VIRTUEL · AUCUNE ACTION WALLET",
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
      <div class="offer-visual">
        <div class="visual-top">
          <span class="lab">{{ t("visualLab") }}</span>
          <!-- Plage dérivée du programme : ajouter une étape ne peut pas la désynchroniser. -->
          <b class="mono">01—{{ STEP_COUNT }}</b>
        </div>
        <TutorialConcept chapter="why" step-id="welcome" />
        <p class="visual-note mono">{{ t("visualNote") }}</p>
      </div>
      <div class="offer-copy">
        <span class="lab kicker">{{ t("kicker") }}</span>
        <h2>{{ t("title") }}</h2>
        <p class="body">{{ t("body") }}</p>

        <ul class="points">
          <li><i>01</i><span>{{ t("b1", { n: STEP_COUNT }) }}</span></li>
          <li><i>02</i><span>{{ t("b2") }}</span></li>
          <li><i>03</i><span>{{ t("b3") }}</span></li>
        </ul>

        <div class="actions">
          <button class="primary" type="button" @click="accept">{{ t("accept") }}</button>
          <button class="ghost" type="button" @click="decline">{{ t("decline") }}</button>
        </div>
        <p class="later soft">{{ t("later") }}</p>
      </div>
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
  width: min(880px, 100%);
  background: #111318;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 26px;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(260px, .85fr) minmax(0, 1.15fr);
  gap: 0;
  box-shadow: 0 32px 120px rgba(0, 0, 0, .38);
}
.offer-visual {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  overflow: hidden;
  border: 1px solid rgba(113, 132, 255, .28);
  border-radius: 18px;
  background:
    radial-gradient(circle at 80% 12%, rgba(79, 106, 255, .3), transparent 34%),
    #151722;
}
.visual-top { display: flex; justify-content: space-between; gap: 12px; color: #aeb8ff; }
.visual-top b { font-size: 10px; color: rgba(255, 255, 255, .5); }
.offer-visual :deep(.concept) { height: 210px; transform: scale(1.18); }
.visual-note { color: rgba(255, 255, 255, .4); font-size: 8px; letter-spacing: .1em; }
.offer-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 30px 34px;
}
.kicker { color: #aeb8ff; }
.offer h2 {
  font-family: var(--disp);
  margin-top: 10px;
  font-size: clamp(32px, 4vw, 47px);
  font-weight: 800;
  line-height: .98;
  letter-spacing: -.045em;
  text-transform: uppercase;
}
.body { margin-top: 16px; color: rgba(255, 255, 255, .65); font-size: 14px; line-height: 1.6; }
.points { display: grid; gap: 0; margin-top: 18px; border-top: 1px solid rgba(255, 255, 255, .1); }
.points li {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  font-size: 13px;
  line-height: 1.45;
}
.points i { color: #7184ff; font: normal 10px var(--mono); }
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.actions button {
  border-radius: 10px;
  padding: 13px 22px;
  font-weight: 700;
  font-size: 14px;
  border: 1px solid transparent;
}
.actions .primary { background: #fff; color: #111318; flex: 1; }
.actions .ghost { border-color: rgba(255, 255, 255, .15); color: var(--text); }
.actions .ghost:hover { border-color: var(--text); }
.later { margin-top: 10px; font-size: 10.5px; }
@media (max-width: 720px) {
  .offer { grid-template-columns: 1fr; max-height: calc(100dvh - 24px); overflow-y: auto; }
  .offer-visual { min-height: 180px; }
  .offer-visual :deep(.concept) { height: 110px; }
  .offer-copy { padding: 26px 20px 20px; }
  .actions .primary { flex: 1 1 100%; }
}
</style>
