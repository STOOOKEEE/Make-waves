<script setup lang="ts">
/* Panneau pédagogique du tutoriel : titre, idée-clé, contenu, objectif, et la
 * navigation. Le contenu est rendu par `ArticleBody` — le même composant que les
 * leçons Tide School, donc la même typographie et le même vocabulaire visuel.
 *
 * Le bouton Suivant n'est JAMAIS désactivé : un « Next » grisé est la première
 * cause d'abandon d'un tutoriel. Tant que l'objectif n'est pas atteint il est
 * simplement secondaire et s'appelle « Passer cette étape ». */
import { computed } from "vue";
import ArticleBody from "../learn/ArticleBody.vue";
import LearnHint from "../learn/LearnHint.vue";
import { useI18n } from "../../i18n/useI18n";
import type { TutorialStep } from "../../data/tutorial";

const props = defineProps<{
  step: TutorialStep;
  index: number;
  total: number;
  chapter: string;
  met: boolean;
  isLast: boolean;
}>();

const emit = defineEmits<{ next: []; back: []; skip: []; finish: [] }>();

const { t } = useI18n({
  en: {
    step: "Step {n} of {total}",
    goal: "Your turn",
    doneLabel: "Done",
    next: "Next",
    skipStep: "Skip this step",
    back: "Back",
    skip: "Skip the tutorial",
    finish: "Open the real terminal →",
    deeper: "Go deeper",
  },
  fr: {
    step: "Étape {n} sur {total}",
    goal: "À toi",
    doneLabel: "Fait",
    next: "Suivant",
    skipStep: "Passer cette étape",
    back: "Retour",
    skip: "Passer le tutoriel",
    finish: "Ouvrir le vrai terminal →",
    deeper: "Aller plus loin",
  },
});

const hasTask = computed(() => props.step.goal.kind !== "read");
const lessons = computed(() =>
  [props.step.lesson, ...props.step.extraLessons].filter(
    (slug): slug is string => slug !== undefined,
  ),
);
</script>

<template>
  <aside class="coach">
    <header class="coach-head">
      <span class="lab soft">{{ chapter }}</span>
      <span class="lab soft">{{ t("step", { n: index + 1, total }) }}</span>
    </header>

    <h2 class="coach-title">{{ step.title }}</h2>
    <p class="coach-key">{{ step.key }}</p>

    <div class="coach-body">
      <ArticleBody :blocks="step.blocks" />
    </div>

    <div v-if="hasTask" class="coach-goal" :class="{ met }" aria-live="polite">
      <span class="lab">{{ met ? t("doneLabel") : t("goal") }}</span>
      <p>{{ met && step.done ? step.done : step.task }}</p>
    </div>

    <div v-if="lessons.length > 0" class="coach-lessons">
      <span class="lab soft">{{ t("deeper") }}</span>
      <LearnHint v-for="slug in lessons" :key="slug" :slug="slug" :label="slug" />
    </div>

    <footer class="coach-nav">
      <button v-if="index > 0" class="ghost" type="button" @click="emit('back')">
        {{ t("back") }}
      </button>
      <button
        v-if="isLast"
        class="primary"
        type="button"
        @click="emit('finish')"
      >
        {{ t("finish") }}
      </button>
      <button
        v-else
        type="button"
        :class="met || !hasTask ? 'primary' : 'ghost'"
        @click="emit('next')"
      >
        {{ met || !hasTask ? t("next") : t("skipStep") }}
      </button>
      <button class="quit" type="button" @click="emit('skip')">{{ t("skip") }}</button>
    </footer>
  </aside>
</template>

<style scoped>
/* Le reset global ne touche que la police et le curseur : chaque surface
 * neutralise elle-même le style natif des boutons. */
button { background: none; border: none; color: inherit; padding: 0; }
.coach {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 22px;
  min-height: 0;
  overflow: hidden;
}
.coach-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.coach-title {
  font-family: var(--disp);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.15;
}
.coach-key {
  color: var(--up);
  font-size: 15px;
  line-height: 1.45;
}
/* Seul le corps de la leçon défile : l'objectif et les boutons restent visibles
 * en permanence, sinon l'utilisateur perd la consigne en lisant. */
.coach-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 6px;
}
.coach-goal {
  border: 1px solid var(--line2);
  border-left: 3px solid var(--blue);
  border-radius: 10px;
  padding: 14px 16px;
  background: var(--panel2);
}
.coach-goal.met {
  border-left-color: var(--up);
}
.coach-goal p {
  margin-top: 6px;
  font-size: 15px;
  line-height: 1.5;
}
.coach-goal.met p {
  color: var(--up);
}
.coach-lessons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.coach-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}
.coach-nav button {
  border-radius: 100px;
  padding: 11px 20px;
  font-weight: 700;
  font-size: 14px;
  border: 1px solid transparent;
}
.coach-nav .primary {
  background: #fff;
  color: var(--panel);
}
.coach-nav .ghost {
  border-color: var(--line2);
  color: var(--text);
}
.coach-nav .quit {
  margin-left: auto;
  color: var(--mut2);
  font-weight: 500;
  font-size: 13px;
  padding: 11px 4px;
}
.coach-nav .quit:hover {
  color: var(--text);
}
</style>
