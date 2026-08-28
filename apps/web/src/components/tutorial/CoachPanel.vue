<script setup lang="ts">
/* Panneau pédagogique du tutoriel.
 *
 * Trois zones fixes et une seule qui défile : l'en-tête (chapitre + progression),
 * le corps de la leçon (la seule partie scrollable), puis l'objectif et la
 * navigation, épinglés en bas. On ne doit jamais perdre la consigne de vue en
 * lisant, ni avoir à chercher le bouton Suivant.
 *
 * Le bouton Suivant n'est JAMAIS désactivé : un « Next » grisé est la première
 * cause d'abandon d'un tutoriel. Tant que l'objectif n'est pas atteint il est
 * simplement secondaire et s'appelle « Passer cette étape ».
 */
import { computed, ref, watch } from "vue";
import ArticleBody from "../learn/ArticleBody.vue";
import TutorialConcept from "./TutorialConcept.vue";
import { useI18n } from "../../i18n/useI18n";
import { CHAPTERS, type ChapterId, type TutorialStep } from "../../data/tutorial";

const props = defineProps<{
  step: TutorialStep;
  index: number;
  total: number;
  chapter: string;
  met: boolean;
  isLast: boolean;
  /** Récapitulatif chiffré, uniquement sur la dernière étape. */
  recap?: { trades: number; equity: string; delta: string; up: boolean } | undefined;
}>();

const emit = defineEmits<{ next: []; back: []; skip: []; finish: [] }>();

const { t } = useI18n({
  en: {
    goal: "Your turn",
    doneLabel: "Done",
    next: "Next",
    skipStep: "Skip this step",
    back: "Back",
    skip: "Skip the tutorial",
    finish: "Open the real terminal →",
    lesson: "Full lesson",
    recapTitle: "What you just did",
    recapTrades: "Orders placed",
    recapEquity: "Final equity",
    more: "Scroll for more",
    trainingPath: "Tide training path",
    remember: "Remember this",
    mission: "Practice mission",
    achieved: "Skill unlocked",
    stepLabel: "Step {n}",
    chapterLabel: "Chapter {n} of {total}",
  },
  fr: {
    goal: "À toi",
    doneLabel: "Fait",
    next: "Suivant",
    skipStep: "Passer cette étape",
    back: "Retour",
    skip: "Passer le tutoriel",
    finish: "Ouvrir le vrai terminal →",
    lesson: "Leçon complète",
    recapTitle: "Ce que tu viens de faire",
    recapTrades: "Ordres passés",
    recapEquity: "Équité finale",
    more: "Fais défiler",
    trainingPath: "Parcours d'entraînement Tide",
    remember: "À retenir",
    mission: "Mission pratique",
    achieved: "Compétence débloquée",
    stepLabel: "Étape {n}",
    chapterLabel: "Chapitre {n} sur {total}",
  },
});

const hasTask = computed(() => props.step.goal.kind !== "read");
const progress = computed(() => ((props.index + 1) / props.total) * 100);
const chapterPosition = computed(() =>
  Math.max(0, CHAPTERS.findIndex((item) => item.id === props.step.chapter)),
);

/** Une pastille par chapitre : où on en est dans le parcours, d'un coup d'œil. */
const chapterDots = computed(() => {
  const current = chapterPosition.value;
  return CHAPTERS.map((chapter: { id: ChapterId }, i) => ({
    id: chapter.id,
    state: i < current ? "past" : i === current ? "current" : "future",
  }));
});

// Indique qu'il reste du texte sous la ligne de flottaison, et disparaît dès
// qu'on a atteint le bas : un dégradé permanent ferait croire à une coupure.
const body = ref<HTMLElement | null>(null);
const hasMore = ref(false);

function checkOverflow(): void {
  const el = body.value;
  if (el === null) return;
  hasMore.value = el.scrollHeight - el.scrollTop - el.clientHeight > 24;
}

watch(
  () => props.step.id,
  () => {
    if (body.value !== null) body.value.scrollTop = 0;
    // Laisse le rendu se poser avant de mesurer.
    requestAnimationFrame(checkOverflow);
  },
  { immediate: true },
);
</script>

<template>
  <aside class="coach">
    <header class="coach-head">
      <div class="coach-meta">
        <span class="lab path-label">{{ t("trainingPath") }}</span>
        <span class="lab counter mono">{{ String(index + 1).padStart(2, "0") }}<i>/</i>{{ total }}</span>
      </div>
      <div class="step-progress" role="progressbar" :aria-valuenow="index + 1" :aria-valuemin="1" :aria-valuemax="total">
        <i :style="{ width: `${progress}%` }"></i>
      </div>
      <div class="chapter-row">
        <span class="chapter-index mono">{{ String(chapterPosition + 1).padStart(2, "0") }}</span>
        <div>
          <span class="lab">{{ t("chapterLabel", { n: chapterPosition + 1, total: chapterDots.length }) }}</span>
          <strong>{{ chapter }}</strong>
        </div>
        <div class="dots" aria-hidden="true">
          <span v-for="dot in chapterDots" :key="dot.id" class="dot" :class="dot.state"></span>
        </div>
      </div>
    </header>

    <div class="coach-title-zone">
      <div class="title-copy">
        <span class="lab step-label">{{ t("stepLabel", { n: String(index + 1).padStart(2, "0") }) }}</span>
        <h2>{{ step.title }}</h2>
      </div>
      <div class="concept-wrap"><TutorialConcept :chapter="step.chapter" :step-id="step.id" /></div>
      <div class="coach-key">
        <span class="lab">{{ t("remember") }}</span>
        <p>{{ step.key }}</p>
      </div>
    </div>

    <div class="coach-body-wrap">
      <div ref="body" class="coach-body" @scroll="checkOverflow">
        <ArticleBody :blocks="step.blocks" />

        <div v-if="recap" class="recap">
          <span class="lab">{{ t("recapTitle") }}</span>
          <div class="recap-row">
            <span>{{ t("recapTrades") }}</span><b class="mono">{{ recap.trades }}</b>
          </div>
          <div class="recap-row">
            <span>{{ t("recapEquity") }}</span>
            <b class="mono" :class="recap.up ? 'up' : 'down'">
              {{ recap.equity }} <i>{{ recap.delta }}</i>
            </b>
          </div>
        </div>
      </div>
      <div v-if="hasMore" class="fade" aria-hidden="true"></div>
    </div>

    <div v-if="hasTask" class="coach-goal" :class="{ met }" aria-live="polite">
      <span class="mission-number mono" aria-hidden="true">{{ met ? "✓" : String(index + 1).padStart(2, "0") }}</span>
      <div class="mission-copy">
        <span class="lab">{{ met ? t("achieved") : t("mission") }}</span>
        <p>{{ met && step.done ? step.done : step.task }}</p>
      </div>
      <span class="mission-state lab">{{ met ? t("doneLabel") : t("goal") }}</span>
    </div>

    <footer class="coach-nav">
      <button v-if="index > 0" class="ghost" type="button" @click="emit('back')">
        <span aria-hidden="true">←</span> {{ t("back") }}
      </button>
      <button v-if="isLast" class="primary grow" type="button" @click="emit('finish')">
        {{ t("finish") }}
      </button>
      <button
        v-else
        type="button"
        class="grow"
        :class="met || !hasTask ? 'primary' : 'ghost'"
        @click="emit('next')"
      >
        {{ met || !hasTask ? t("next") : t("skipStep") }} <span aria-hidden="true">→</span>
      </button>
      <a
        v-if="step.lesson"
        class="lesson-link"
        :href="`#/learn/${step.lesson}`"
        target="_blank"
        rel="noopener"
        ><span>{{ t("lesson") }}</span> ↗</a
      >
      <button class="quit" type="button" @click="emit('skip')">{{ t("skip") }}</button>
    </footer>
  </aside>
</template>

<style scoped>
button { background: none; border: none; color: inherit; padding: 0; }

.coach {
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 88% 8%, rgba(79, 106, 255, .18), transparent 24%),
    #111318;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 24px;
  padding: 20px;
  min-height: 0;
  overflow: hidden;
  box-shadow: 0 22px 70px rgba(5, 7, 14, .24);
}

.coach-head {
  display: grid;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
}
.coach-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.path-label { color: #aeb8ff; }
.counter { color: rgba(255, 255, 255, .62); letter-spacing: .06em; }
.counter i { font-style: normal; opacity: .5; margin: 0 1px; }
.step-progress {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, .1);
}
.step-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f6aff, #dbe0ff);
  transition: width .4s var(--ease);
}
.chapter-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 11px;
}
.chapter-row > div:nth-child(2) { display: grid; gap: 2px; }
.chapter-row .lab { color: rgba(255, 255, 255, .45); font-size: 9px; }
.chapter-row strong { font-size: 13px; font-weight: 700; }
.chapter-index {
  color: #7184ff;
  font-size: 23px;
  line-height: 1;
  font-weight: 700;
}
.dots { display: flex; gap: 4px; width: 74px; }
.dot {
  height: 3px;
  flex: 1;
  border-radius: 2px;
  background: rgba(255, 255, 255, .12);
  transition: background .3s var(--ease);
}
.dot.past { background: #7184ff; opacity: .55; }
.dot.current { background: #fff; }

.coach-title-zone {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 12px;
  padding: 16px 0 14px;
}
.title-copy { align-self: center; }
.step-label { color: #7184ff; }
.coach-title-zone h2 {
  font-family: var(--disp);
  max-width: 13ch;
  margin-top: 6px;
  font-size: clamp(27px, 2.1vw, 35px);
  font-weight: 800;
  line-height: .98;
  letter-spacing: -.035em;
  text-transform: uppercase;
}
.concept-wrap {
  width: 132px;
  height: 92px;
  align-self: center;
}
.coach-key {
  grid-column: 1 / -1;
  position: relative;
  overflow: hidden;
  padding: 12px 14px 12px 17px;
  border: 1px solid rgba(113, 132, 255, .35);
  border-radius: 12px;
  background: rgba(79, 106, 255, .09);
}
.coach-key::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #7184ff;
}
.coach-key .lab { color: #aeb8ff; }
.coach-key p {
  margin-top: 4px;
  color: rgba(255, 255, 255, .9);
  font-size: 13.5px;
  line-height: 1.45;
}

.coach-body-wrap { position: relative; flex: 1; min-height: 0; }
.coach-body {
  height: 100%;
  overflow-y: auto;
  padding: 2px 10px 8px 0;
}
.coach-body::-webkit-scrollbar { width: 3px; }
.coach-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, .22); border-radius: 2px; }
.coach-body::-webkit-scrollbar-track { background: transparent; }
.fade {
  position: absolute;
  left: 0;
  right: 10px;
  bottom: 0;
  height: 44px;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, #111318);
}
:deep(.body) { color: rgba(255, 255, 255, .78); font-size: 14px; }
:deep(.b-p) { line-height: 1.6; }
:deep(.b-h) { margin: 24px 0 8px; font-size: 19px; line-height: 1.08; color: #fff; }
:deep(.b-h:first-child) { margin-top: 4px; }
:deep(.b-h::before) { color: #7184ff; }
:deep(.b-callout), :deep(.b-example), :deep(.b-quote) {
  border-radius: 12px;
  border-color: rgba(255, 255, 255, .11);
  background: rgba(255, 255, 255, .045);
}
:deep(.b-callout) { padding: 13px 14px; }
:deep(.b-example) { padding: 13px 14px; }
:deep(.b-list) { gap: 6px; }

.recap {
  margin-top: 18px;
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 12px;
  background: rgba(255, 255, 255, .05);
}
.recap .lab { color: var(--gold); }
.recap-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; }
.recap-row span { color: rgba(255, 255, 255, .58); }
.recap-row b { font-size: 15px; }
.recap-row b i { font-style: normal; font-size: 12px; opacity: .75; }
.recap-row .up { color: var(--up); }
.recap-row .down { color: var(--down); }

.coach-goal {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  margin-top: 13px;
  padding: 13px 14px;
  border: 1px solid rgba(255, 82, 82, .42);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 82, 82, .12), rgba(255, 255, 255, .035));
  transition: border-color .3s var(--ease), background .3s var(--ease);
}
.mission-number {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--guide);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}
.coach-goal.met {
  border-color: rgba(113, 132, 255, .5);
  background: linear-gradient(135deg, rgba(79, 106, 255, .17), rgba(255, 255, 255, .04));
}
.coach-goal.met .mission-number { background: #7184ff; }
.mission-copy .lab { color: rgba(255, 255, 255, .55); }
.coach-goal.met .mission-copy .lab { color: #aeb8ff; }
.mission-copy p { margin-top: 3px; font-size: 13.5px; font-weight: 650; line-height: 1.4; }
.mission-state { color: #ff9494; }
.coach-goal.met .mission-state { color: #aeb8ff; }

.coach-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, .1);
}
.coach-nav button {
  min-height: 40px;
  border-radius: 10px;
  padding: 10px 15px;
  font-weight: 700;
  font-size: 13px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.coach-nav .grow { flex: 1; }
.coach-nav .primary { background: #fff; color: #111318; }
.coach-nav .ghost { border-color: rgba(255, 255, 255, .16); color: #fff; }
.coach-nav .ghost:hover { border-color: rgba(255, 255, 255, .48); }
.lesson-link {
  font-size: 12px;
  color: rgba(255, 255, 255, .54);
  white-space: nowrap;
  padding: 4px 3px;
}
.lesson-link:hover { color: var(--text); }
.coach-nav .quit {
  flex-basis: 100%;
  text-align: left;
  min-height: auto;
  color: rgba(255, 255, 255, .42);
  font-weight: 500;
  font-size: 11.5px;
  padding: 2px 0 0;
}
.coach-nav .quit:hover { color: var(--text); }

@media (max-width: 560px) {
  .coach { padding: 16px; border-radius: 20px; }
  .coach-title-zone { grid-template-columns: minmax(0, 1fr) 102px; }
  .concept-wrap { width: 102px; height: 76px; }
  .coach-title-zone h2 { font-size: 27px; }
  .dots { width: 54px; }
  .coach-goal { grid-template-columns: auto 1fr; }
  .mission-state { display: none; }
  .lesson-link { order: 3; flex-basis: 100%; }
}
</style>
