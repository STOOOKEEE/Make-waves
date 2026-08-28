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
  },
});

const hasTask = computed(() => props.step.goal.kind !== "read");

/** Une pastille par chapitre : où on en est dans le parcours, d'un coup d'œil. */
const chapterDots = computed(() => {
  const current = CHAPTERS.findIndex((c) => c.id === props.step.chapter);
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
        <span class="lab chapter">{{ chapter }}</span>
        <span class="lab counter mono">{{ index + 1 }}<i>/</i>{{ total }}</span>
      </div>
      <div class="dots" aria-hidden="true">
        <span v-for="dot in chapterDots" :key="dot.id" class="dot" :class="dot.state"></span>
      </div>
    </header>

    <div class="coach-title-zone">
      <h2>{{ step.title }}</h2>
      <p class="coach-key">{{ step.key }}</p>
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
      <span class="tick" aria-hidden="true">{{ met ? "✓" : "" }}</span>
      <div>
        <span class="lab">{{ met ? t("doneLabel") : t("goal") }}</span>
        <p>{{ met && step.done ? step.done : step.task }}</p>
      </div>
    </div>

    <footer class="coach-nav">
      <button v-if="index > 0" class="ghost" type="button" @click="emit('back')">
        {{ t("back") }}
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
        {{ met || !hasTask ? t("next") : t("skipStep") }}
      </button>
      <a
        v-if="step.lesson"
        class="lesson-link"
        :href="`#/learn/${step.lesson}`"
        target="_blank"
        rel="noopener"
        >{{ t("lesson") }} ↗</a
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
  background: var(--panel);
  border: 1px solid var(--line2);
  border-radius: 16px;
  padding: 18px 20px 16px;
  min-height: 0;
  overflow: hidden;
}

/* ---- En-tête : chapitre, compteur, pastilles ---- */
.coach-head {
  display: grid;
  gap: 10px;
  padding-bottom: 11px;
  border-bottom: 1px solid var(--line);
}
.coach-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.chapter { color: var(--up); }
.counter { color: var(--mut2); letter-spacing: .06em; }
.counter i { font-style: normal; opacity: .5; margin: 0 1px; }
.dots { display: flex; gap: 4px; }
.dot {
  height: 3px;
  flex: 1;
  border-radius: 2px;
  background: var(--line2);
  transition: background .3s var(--ease);
}
.dot.past { background: var(--up); opacity: .55; }
.dot.current { background: var(--up); }

/* ---- Titre + idée-clé ---- */
.coach-title-zone { padding: 13px 0 12px; }
.coach-title-zone h2 {
  font-family: var(--disp);
  font-size: 23px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -.01em;
}
.coach-key {
  margin-top: 8px;
  padding-left: 11px;
  border-left: 2px solid var(--up);
  color: var(--up);
  font-size: 14px;
  line-height: 1.45;
}

/* ---- Corps : la SEULE zone qui défile ---- */
.coach-body-wrap { position: relative; flex: 1; min-height: 0; }
.coach-body {
  height: 100%;
  overflow-y: auto;
  padding-right: 10px;
  font-size: 14.5px;
}
.coach-body::-webkit-scrollbar { width: 3px; }
.coach-body::-webkit-scrollbar-thumb { background: var(--line2); border-radius: 2px; }
.coach-body::-webkit-scrollbar-track { background: transparent; }
/* Dit qu'il reste du texte, sans laisser croire à une coupure permanente. */
.fade {
  position: absolute;
  left: 0;
  right: 10px;
  bottom: 0;
  height: 44px;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, var(--panel));
}

/* ---- Récapitulatif de fin ---- */
.recap {
  margin-top: 18px;
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--line2);
  border-radius: 12px;
  background: var(--panel2);
}
.recap .lab { color: var(--gold); }
.recap-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; }
.recap-row span { color: var(--soft); }
.recap-row b { font-size: 15px; }
.recap-row b i { font-style: normal; font-size: 12px; opacity: .75; }
.recap-row .up { color: var(--up); }
.recap-row .down { color: var(--down); }

/* ---- Objectif : épinglé, avec sa coche ---- */
.coach-goal {
  display: flex;
  gap: 11px;
  align-items: flex-start;
  margin-top: 12px;
  padding: 11px 14px;
  border: 1px solid var(--line2);
  border-left: 3px solid var(--guide);
  border-radius: 10px;
  background: var(--panel2);
  transition: border-color .3s var(--ease);
}
.coach-goal .tick {
  flex-shrink: 0;
  width: 17px;
  height: 17px;
  margin-top: 2px;
  border-radius: 50%;
  border: 1.5px solid var(--line2);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  color: transparent;
  transition: all .3s var(--ease);
}
.coach-goal.met { border-left-color: var(--up); }
.coach-goal.met .tick {
  background: var(--up);
  border-color: var(--up);
  color: #06231a;
}
.coach-goal .lab { color: var(--soft); }
.coach-goal.met .lab { color: var(--up); }
.coach-goal p { margin-top: 4px; font-size: 14px; line-height: 1.45; }

/* ---- Navigation : épinglée ---- */
.coach-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.coach-nav button {
  border-radius: 100px;
  padding: 10px 17px;
  font-weight: 700;
  font-size: 13.5px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.coach-nav .grow { flex: 1; }
.coach-nav .primary { background: #fff; color: var(--panel); }
.coach-nav .ghost { border-color: var(--line2); color: var(--text); }
.coach-nav .ghost:hover { border-color: var(--text); }
.lesson-link {
  font-size: 12px;
  color: var(--mut2);
  white-space: nowrap;
  padding: 4px 0;
}
.lesson-link:hover { color: var(--text); }
.coach-nav .quit {
  flex-basis: 100%;
  text-align: left;
  color: var(--mut2);
  font-weight: 500;
  font-size: 12px;
  padding: 2px 0 0;
}
.coach-nav .quit:hover { color: var(--text); }
</style>
