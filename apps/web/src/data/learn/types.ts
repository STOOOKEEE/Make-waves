/* ===== TIDE School — modèle de contenu éducatif =====
 * Articles/tutos bilingues, stockés en blocs typés (pas de markdown/HTML).
 * Même patron que data/competitions.ts : champs textuels en `Localized`
 * ({ en, fr }), résolus pour une langue via les helpers d'index.ts.
 * Les vues consomment la forme résolue `Article` (tout en `string`).
 */
import type { Locale } from "../../i18n/locale";

/** Chaîne traduite (une entrée par langue supportée). */
export type Localized = Record<Locale, string>;

/** Pistes du cursus. */
export type Category = "basics" | "perps" | "strategies" | "platform";

/** Niveau de difficulté d'un article. */
export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Variantes d'encart (callout). `warn` = garde-fou risque. */
export type CalloutVariant = "info" | "warn" | "tip";

/* ---- Forme brute bilingue (contenu source) ---- */

export interface RawExampleRow {
  k: Localized;
  v: Localized;
}

export type RawBlock =
  | { type: "h"; text: Localized }
  | { type: "p"; text: Localized }
  | { type: "list"; items: Localized[] }
  | { type: "steps"; items: Localized[] }
  | { type: "callout"; variant: CalloutVariant; title?: Localized; text: Localized }
  | { type: "example"; title: Localized; rows: RawExampleRow[] }
  | { type: "quote"; text: Localized }
  | { type: "divider" };

export interface RawArticle {
  slug: string;
  category: Category;
  difficulty: Difficulty;
  /** Temps de lecture estimé (minutes). */
  minutes: number;
  featured?: boolean;
  /** Mise en avant secondaire (colonne « Popular »). */
  popular?: boolean;
  title: Localized;
  /** Chapeau (résumé court sur la carte + en tête d'article). */
  dek: Localized;
  /** Titre SEO (<title>). Repli sur `title` + suffixe marque si absent. */
  seoTitle?: Localized;
  /** Meta description SEO. Repli sur `dek` si absent. */
  seoDescription?: Localized;
  /** Mots-clés SEO (langue-neutres). */
  keywords?: string[];
  /** Date de dernière mise à jour (ISO, ex. "2026-07-02") — crédibilité SEO. */
  updated?: string;
  blocks: RawBlock[];
  /** Slugs d'articles liés (bloc « à lire ensuite »). */
  related?: string[];
}

/* ---- Forme résolue (mono-langue) consommée par l'UI ---- */

export interface ExampleRow {
  k: string;
  v: string;
}

export type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "callout"; variant: CalloutVariant; title?: string; text: string }
  | { type: "example"; title: string; rows: ExampleRow[] }
  | { type: "quote"; text: string }
  | { type: "divider" };

export interface Article {
  slug: string;
  category: Category;
  difficulty: Difficulty;
  minutes: number;
  featured: boolean;
  popular: boolean;
  /** Illustration ASCII (monospace) — remplace les emojis. */
  art: string;
  title: string;
  dek: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  updated: string;
  blocks: Block[];
  related: string[];
}

/** Métadonnée de piste (libellé traduit résolu). */
export interface CategoryMeta {
  id: Category;
  label: string;
}
