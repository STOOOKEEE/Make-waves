/* ===== Tutoriel interactif — résolveurs =====
 * Même patron que `data/learn/index.ts` : le contenu est stocké bilingue, les
 * vues consomment une forme résolue mono-langue.
 */
import type { Locale } from "../../i18n/locale";
import { localizeBlock } from "../learn";
import { CHAPTERS, STEPS } from "./steps";
import type { ChapterId, RawTutorialStep, TutorialStep } from "./types";

export { CHAPTERS, STEPS } from "./steps";
export type { ChapterId, SpotlightTarget, TutorialStep } from "./types";

function localizeStep(raw: RawTutorialStep, locale: Locale): TutorialStep {
  return {
    id: raw.id,
    chapter: raw.chapter,
    title: raw.title[locale],
    key: raw.key[locale],
    blocks: raw.blocks.map((block) => localizeBlock(block, locale)),
    goal: raw.goal,
    task: raw.task?.[locale] ?? "",
    done: raw.done?.[locale] ?? "",
    extraLessons: raw.extraLessons ?? [],
    ...(raw.spotlight === undefined ? {} : { spotlight: raw.spotlight }),
    ...(raw.lesson === undefined ? {} : { lesson: raw.lesson }),
    ...(raw.preset === undefined ? {} : { preset: raw.preset }),
  };
}

export function localizedSteps(locale: Locale): TutorialStep[] {
  return STEPS.map((step) => localizeStep(step, locale));
}

export const STEP_COUNT = STEPS.length;

/** Index d'une étape par son id ; `-1` si l'id est inconnu (lien périmé). */
export function stepIndexById(id: string): number {
  return STEPS.findIndex((step) => step.id === id);
}

export function firstStepId(): string {
  return STEPS[0]?.id ?? "";
}

/** Libellé localisé d'un chapitre. */
export function chapterLabel(id: ChapterId, locale: Locale): string {
  return CHAPTERS.find((chapter) => chapter.id === id)?.label[locale] ?? id;
}

/** Numéro de chapitre (1-indexé) pour l'affichage de progression. */
export function chapterIndex(id: ChapterId): number {
  return CHAPTERS.findIndex((chapter) => chapter.id === id) + 1;
}
