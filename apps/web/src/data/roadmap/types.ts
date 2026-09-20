/* ===== Page « Vision & roadmap » — modèle de contenu =====
 * Page destinée à l'équipe XRPL (jury Make Waves), pas aux utilisateurs :
 * la thèse (pourquoi Tide compte pour le ledger), ce qui tourne aujourd'hui
 * (Learn → Prove → Trade), la feuille de route datée, le DEX en section propre,
 * puis un bloc technique délimité pour les ingénieurs XRPL.
 *
 * Même patron que `data/learn` : contenu bilingue en `Localized`, résolu en
 * mono-langue par `data/roadmap/index.ts`. Aucun markdown, aucun `v-html`.
 */
import type { Localized } from "../learn/types";

/** Un fait chiffré affiché en mono (« Lessons · 16 »). */
export interface RawFact {
  k: Localized;
  v: Localized;
}

/** Lien de navigation interne (hash-router). */
export interface RawCta {
  label: Localized;
  path: string;
}

/** Point titré (thèse, feature, groupe technique). */
export interface RawPoint {
  title: Localized;
  body: Localized;
}

/** Étape du funnel produit : ce qui existe aujourd'hui. */
export interface RawStage {
  id: "learn" | "prove" | "trade";
  index: string;
  label: Localized;
  title: Localized;
  body: Localized;
  facts: RawFact[];
  cta: RawCta;
}

/** Étape du parcours de financement, avec les transactions XRPL qu'elle émet. */
export interface RawFundingStep {
  title: Localized;
  /** Transactions XRPL de l'étape, en mono (ex. "Payment · 2.22 XRP"). Vide = aucune. */
  tx: string[];
  body: Localized;
}

/** Primitive XRPL utilisée et son rôle dans Tide. */
export interface RawPrimitive {
  name: string;
  role: Localized;
}

/** Ordre de lecture de la roadmap : ce qui est en ligne, puis les paliers. */
export type PhaseStatus = "now" | "next" | "then" | "later";

export interface RawPhase {
  status: PhaseStatus;
  label: Localized;
  when: Localized;
  title: Localized;
  lead: Localized;
  items: RawPoint[];
}

export interface RawRoadmapContent {
  hero: {
    eyebrow: Localized;
    titleA: Localized;
    titleB: Localized;
    lead: Localized;
    /** Résumé court (≤ 160 caractères) pour <meta description>. */
    seoDescription: Localized;
  };
  thesis: {
    label: Localized;
    title: Localized;
    lead: Localized;
    points: RawPoint[];
  };
  stages: {
    label: Localized;
    title: Localized;
    lead: Localized;
    items: RawStage[];
  };
  roadmap: {
    label: Localized;
    title: Localized;
    lead: Localized;
    phases: RawPhase[];
  };
  dex: {
    label: Localized;
    badge: Localized;
    title: Localized;
    lead: Localized;
    steps: RawPoint[];
  };
  tech: {
    label: Localized;
    title: Localized;
    lead: Localized;
    fundingTitle: Localized;
    fundingLead: Localized;
    funding: RawFundingStep[];
    primitivesTitle: Localized;
    primitives: RawPrimitive[];
    notUsed: Localized;
    stackTitle: Localized;
    stack: RawPoint[];
  };
  cta: {
    title: Localized;
    body: Localized;
    primary: RawCta;
    secondary: RawCta;
  };
}

/* ---- Forme résolue (mono-langue) consommée par la vue ---- */

export interface Fact {
  k: string;
  v: string;
}
export interface Cta {
  label: string;
  path: string;
}
export interface Point {
  title: string;
  body: string;
}
export interface Stage {
  id: RawStage["id"];
  index: string;
  label: string;
  title: string;
  body: string;
  facts: Fact[];
  cta: Cta;
}
export interface FundingStep {
  title: string;
  tx: string[];
  body: string;
}
export interface Primitive {
  name: string;
  role: string;
}
export interface Phase {
  status: PhaseStatus;
  label: string;
  when: string;
  title: string;
  lead: string;
  items: Point[];
}

export interface RoadmapContent {
  hero: { eyebrow: string; titleA: string; titleB: string; lead: string; seoDescription: string };
  thesis: { label: string; title: string; lead: string; points: Point[] };
  stages: { label: string; title: string; lead: string; items: Stage[] };
  roadmap: { label: string; title: string; lead: string; phases: Phase[] };
  dex: { label: string; badge: string; title: string; lead: string; steps: Point[] };
  tech: {
    label: string;
    title: string;
    lead: string;
    fundingTitle: string;
    fundingLead: string;
    funding: FundingStep[];
    primitivesTitle: string;
    primitives: Primitive[];
    notUsed: string;
    stackTitle: string;
    stack: Point[];
  };
  cta: { title: string; body: string; primary: Cta; secondary: Cta };
}
