/* ===== TIDE School — agrégation + résolution de langue =====
 * Rassemble les articles bruts (un fichier par leçon) et expose la forme
 * résolue mono-langue à l'UI, sans dépendre du catalogue de compétitions runtime.
 */
import type { Locale } from "../../i18n/locale";
import type {
  Article,
  Block,
  Category,
  CategoryMeta,
  Localized,
  RawArticle,
  RawBlock,
} from "./types";
import { articleArt } from "./art";

import { whatIsTrading } from "./articles/what-is-trading";
import { readingAChart } from "./articles/reading-a-chart";
import { orderTypes } from "./articles/order-types";
import { orderBookSpread } from "./articles/order-book-spread";
import { howTideWorks } from "./articles/how-tide-works";
import { whatIsAPerpetual } from "./articles/what-is-a-perpetual";
import { leverageAndMargin } from "./articles/leverage-and-margin";
import { longAndShort } from "./articles/long-and-short";
import { takeProfitStopLoss } from "./articles/take-profit-stop-loss";
import { riskManagement101 } from "./articles/risk-management-101";
import { trendFollowing } from "./articles/trend-following";
import { meanReversionRanges } from "./articles/mean-reversion-ranges";
import { breakoutTrading } from "./articles/breakout-trading";
import { tradingPsychology } from "./articles/trading-psychology";
import { winningCompetitions } from "./articles/winning-competitions";
import { onChainTrackRecord } from "./articles/on-chain-track-record";

/** Registre ordonné : l'ordre pilote l'affichage de la grille. */
const ARTICLES_RAW: RawArticle[] = [
  // Basics
  whatIsTrading,
  readingAChart,
  orderTypes,
  orderBookSpread,
  howTideWorks,
  // Perps & leverage
  whatIsAPerpetual,
  leverageAndMargin,
  longAndShort,
  takeProfitStopLoss,
  // Strategies
  riskManagement101,
  trendFollowing,
  meanReversionRanges,
  breakoutTrading,
  tradingPsychology,
  // Tide & competitions
  winningCompetitions,
  onChainTrackRecord,
];

/** Ordre + libellés des pistes (résolus par langue à l'affichage). */
const CATEGORY_LABELS: Record<Category, Localized> = {
  basics: { en: "Basics", fr: "Bases" },
  perps: { en: "Perps & leverage", fr: "Perps & levier" },
  strategies: { en: "Strategies", fr: "Stratégies" },
  platform: { en: "Tide & competitions", fr: "Tide & compétitions" },
};
const CATEGORY_ORDER: Category[] = ["basics", "perps", "strategies", "platform"];

/** Exporté pour que le tutoriel interactif réutilise le même rendu de blocs. */
export function localizeBlock(b: RawBlock, l: Locale): Block {
  switch (b.type) {
    case "h":
      return { type: "h", text: b.text[l] };
    case "p":
      return { type: "p", text: b.text[l] };
    case "list":
      return { type: "list", items: b.items.map((i) => i[l]) };
    case "steps":
      return { type: "steps", items: b.items.map((i) => i[l]) };
    case "callout":
      return {
        type: "callout",
        variant: b.variant,
        title: b.title ? b.title[l] : undefined,
        text: b.text[l],
      };
    case "example":
      return {
        type: "example",
        title: b.title[l],
        rows: b.rows.map((r) => ({ k: r.k[l], v: r.v[l] })),
      };
    case "quote":
      return { type: "quote", text: b.text[l] };
    case "divider":
      return { type: "divider" };
  }
}

function localizeArticle(raw: RawArticle, l: Locale): Article {
  return {
    slug: raw.slug,
    category: raw.category,
    difficulty: raw.difficulty,
    minutes: raw.minutes,
    featured: raw.featured ?? false,
    popular: raw.popular ?? false,
    art: articleArt(raw.slug),
    title: raw.title[l],
    dek: raw.dek[l],
    seoTitle: (raw.seoTitle ?? raw.title)[l],
    seoDescription: (raw.seoDescription ?? raw.dek)[l],
    keywords: raw.keywords ?? [],
    updated: raw.updated ?? "2026-07-02",
    blocks: raw.blocks.map((b) => localizeBlock(b, l)),
    related: raw.related ?? [],
  };
}

/** Tous les articles résolus dans la langue demandée (ordre du registre). */
export function localizedArticles(locale: Locale): Article[] {
  return ARTICLES_RAW.map((raw) => localizeArticle(raw, locale));
}

/** Article par slug (résolu), ou `undefined` si inconnu. */
export function getArticle(
  slug: string | undefined,
  locale: Locale,
): Article | undefined {
  const raw = ARTICLES_RAW.find((a) => a.slug === slug);
  return raw ? localizeArticle(raw, locale) : undefined;
}

/** Article vedette (le premier marqué `featured`, sinon le premier du registre). */
export function featuredArticle(locale: Locale): Article {
  const raw = ARTICLES_RAW.find((a) => a.featured) ?? ARTICLES_RAW[0];
  if (!raw) {
    throw new Error("ARTICLES_RAW ne doit jamais être vide");
  }
  return localizeArticle(raw, locale);
}

/** Pistes présentes (dans l'ordre canonique), libellés résolus. */
export function localizedCategories(locale: Locale): CategoryMeta[] {
  return CATEGORY_ORDER.map((id) => ({ id, label: CATEGORY_LABELS[id][locale] }));
}

/** Articles marqués `popular` (colonne latérale), sinon repli sur les vedettes. */
export function popularArticles(locale: Locale, max = 5): Article[] {
  const all = localizedArticles(locale);
  const picked = all.filter((a) => a.popular);
  return (picked.length ? picked : all).slice(0, max);
}

/** Groupe résolu : une piste + ses articles (ordre du registre). */
export interface CategoryGroup {
  id: Category;
  label: string;
  articles: Article[];
}

/** Articles groupés par piste (ordre canonique), pistes vides omises. */
export function articlesByCategory(locale: Locale): CategoryGroup[] {
  const all = localizedArticles(locale);
  return CATEGORY_ORDER.map((id) => ({
    id,
    label: CATEGORY_LABELS[id][locale],
    articles: all.filter((a) => a.category === id),
  })).filter((g) => g.articles.length > 0);
}

/** Articles liés à un slug (résolus, dans l'ordre déclaré). */
export function relatedArticles(slug: string, locale: Locale): Article[] {
  const raw = ARTICLES_RAW.find((a) => a.slug === slug);
  if (!raw?.related?.length) {
    return [];
  }
  return raw.related
    .map((s) => getArticle(s, locale))
    .filter((a): a is Article => a !== undefined);
}
