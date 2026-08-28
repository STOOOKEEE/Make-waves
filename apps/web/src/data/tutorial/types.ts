/* ===== Tutoriel interactif — modèle d'une étape =====
 *
 * On **étend le modèle de Tide School** au lieu d'inventer un format : le corps
 * pédagogique d'une étape est un `RawBlock[]`, donc bilingue par construction
 * (`Localized = Record<Locale, string>` rend une traduction manquante impossible
 * à compiler) et rendu par `ArticleBody.vue`, qui prend `{ blocks }` et rien
 * d'autre.
 *
 * Ce qu'une étape ajoute à un article : une **attente** (ce que l'utilisateur
 * doit faire pour la valider) et une **zone à mettre en lumière**.
 */
import type { Block, Localized, RawBlock } from "../learn/types";
import type { StepGoal } from "../../lib/sandbox/goals";

export type ChapterId = "why" | "read" | "orders" | "perps" | "risk" | "next";

/**
 * Zones ancrables du bac à sable. Ce sont des **identifiants**, pas des
 * coordonnées : le surlignage est une classe CSS appliquée au composant visé.
 * Aucune mesure géométrique, donc testable sous happy-dom.
 */
export type SpotlightTarget =
  | "watchlist"
  | "chart"
  | "chart.mode"
  | "book"
  | "ticket"
  | "ticket.product"
  | "ticket.orderKind"
  | "ticket.side"
  | "ticket.amount"
  | "ticket.leverage"
  | "ticket.risk"
  | "ticket.summary"
  | "ticket.place"
  | "blotter"
  | "accelerate";

/** État imposé au bac à sable à l'entrée d'une étape (mise en scène). */
export interface SandboxPreset {
  readonly product?: "spot" | "perp";
  readonly orderKind?: "market" | "limit";
  readonly side?: "buy" | "sell";
  readonly amount?: number;
  readonly leverage?: number;
  readonly chartMode?: "candles" | "line";
  /** Dérive adverse imposée : sert au scénario de liquidation. */
  readonly drift?: number;
}

export interface RawTutorialStep {
  /** Stable : sert au deep-link `#/tutorial/:id` et à la reprise persistée. */
  readonly id: string;
  readonly chapter: ChapterId;
  readonly title: Localized;
  /** L'idée à retenir, en une phrase, affichée en exergue. */
  readonly key: Localized;
  readonly blocks: RawBlock[];
  readonly goal: StepGoal;
  /** Consigne impérative — obligatoire dès que l'objectif n'est pas `read`. */
  readonly task?: Localized;
  /** Message de validation, affiché quand l'objectif tombe. */
  readonly done?: Localized;
  readonly spotlight?: SpotlightTarget;
  /** Slug d'une leçon Tide School pour approfondir. */
  readonly lesson?: string;
  readonly extraLessons?: readonly string[];
  readonly preset?: SandboxPreset;
}

/** Forme résolue mono-langue, miroir de ce que fait `localizeArticle`. */
export interface TutorialStep {
  readonly id: string;
  readonly chapter: ChapterId;
  readonly title: string;
  readonly key: string;
  readonly blocks: Block[];
  readonly goal: StepGoal;
  readonly task: string;
  readonly done: string;
  readonly spotlight?: SpotlightTarget;
  readonly lesson?: string;
  readonly extraLessons: readonly string[];
  readonly preset?: SandboxPreset;
}

export interface ChapterMeta {
  readonly id: ChapterId;
  readonly label: Localized;
}
