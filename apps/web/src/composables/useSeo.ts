/* SEO côté client pour Tide School. Le site est une SPA en hash-routing (le
 * référencement profond reste limité), mais on fait le maximum côté document :
 * <title>, meta description/keywords, Open Graph/Twitter, canonical, et un
 * JSON-LD `Article`. Les balises sont créées à la volée et retirées au démontage
 * (retour à l'état par défaut) pour ne pas polluer les autres écrans.
 */
import { onUnmounted, toValue, watchEffect } from "vue";
import type { MaybeRefOrGetter, Ref } from "vue";
import type { Article } from "../data/learn/types";
import type { Locale } from "../i18n/locale";

/** Doit rester identique au <title> de `apps/web/index.html` : c'est le titre
 *  restauré quand une vue quitte l'écran et relâche son SEO. */
const DEFAULT_TITLE = "TIDE — Learn to trade crypto with virtual money";
const BRAND = "TIDE School";

interface ManagedTag {
  el: HTMLElement;
  created: boolean;
  /** Valeur des attributs écrasés, telle qu'elle était avant l'écriture
   *  (`null` = l'attribut n'existait pas). Sert à rendre à `index.html` ses
   *  balises statiques quand la vue se démonte. */
  prev: Record<string, string | null>;
}

/** Écrit les attributs sur `el` après avoir mémorisé leur valeur d'origine. */
function writeAttrs(el: HTMLElement, attrs: Record<string, string>): Record<string, string | null> {
  const prev: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(attrs)) {
    prev[k] = el.getAttribute(k);
    el.setAttribute(k, v);
  }
  return prev;
}

/** Retire les balises créées, restaure celles qui existaient déjà. */
function clearManaged(managed: ManagedTag[]): void {
  for (const { el, created, prev } of managed) {
    if (created) {
      el.remove();
      continue;
    }
    for (const [k, v] of Object.entries(prev)) {
      if (v === null) {
        el.removeAttribute(k);
      } else {
        el.setAttribute(k, v);
      }
    }
  }
}

function upsertMeta(
  managed: ManagedTag[],
  selector: string,
  attrs: Record<string, string>,
): void {
  let el = document.head.querySelector<HTMLElement>(selector);
  const created = el === null;
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  managed.push({ el, created, prev: writeAttrs(el, attrs) });
}

function upsertLink(managed: ManagedTag[], rel: string, href: string): void {
  let el = document.head.querySelector<HTMLElement>(`link[rel="${rel}"]`);
  const created = el === null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  managed.push({ el, created, prev: writeAttrs(el, { href }) });
}

/**
 * Applique les métadonnées SEO d'un article (réactif). Sur une valeur absente,
 * restaure le titre par défaut.
 */
export function useArticleSeo(
  article: Ref<Article | undefined>,
  locale: Ref<Locale>,
): void {
  let managed: ManagedTag[] = [];
  let jsonLd: HTMLScriptElement | null = null;

  function clear(): void {
    clearManaged(managed);
    managed = [];
    if (jsonLd) {
      jsonLd.remove();
      jsonLd = null;
    }
  }

  watchEffect(() => {
    clear();
    const a = article.value;
    if (!a) {
      document.title = DEFAULT_TITLE;
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}#/learn/${a.slug}`;
    const title = `${a.seoTitle} · ${BRAND}`;
    document.title = title;
    document.documentElement.setAttribute("lang", locale.value);

    upsertMeta(managed, 'meta[name="description"]', {
      name: "description",
      content: a.seoDescription,
    });
    if (a.keywords.length) {
      upsertMeta(managed, 'meta[name="keywords"]', {
        name: "keywords",
        content: a.keywords.join(", "),
      });
    }
    // Open Graph
    upsertMeta(managed, 'meta[property="og:type"]', { property: "og:type", content: "article" });
    upsertMeta(managed, 'meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta(managed, 'meta[property="og:description"]', {
      property: "og:description",
      content: a.seoDescription,
    });
    upsertMeta(managed, 'meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta(managed, 'meta[property="og:site_name"]', {
      property: "og:site_name",
      content: BRAND,
    });
    // Twitter
    upsertMeta(managed, 'meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta(managed, 'meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta(managed, 'meta[name="twitter:description"]', {
      name: "twitter:description",
      content: a.seoDescription,
    });
    upsertLink(managed, "canonical", url);

    // JSON-LD Article
    const ld = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.seoTitle,
      description: a.seoDescription,
      keywords: a.keywords.join(", "),
      inLanguage: locale.value,
      dateModified: a.updated,
      articleSection: a.category,
      author: { "@type": "Organization", name: BRAND },
      publisher: { "@type": "Organization", name: "TIDE" },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    };
    jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.textContent = JSON.stringify(ld);
    document.head.appendChild(jsonLd);
  });

  onUnmounted(() => {
    clear();
    document.title = DEFAULT_TITLE;
  });
}

/* ---- SEO d'une page simple (pas un article) ---- */

/** Métadonnées d'une page de contenu : titre déjà formaté (marque comprise),
 *  description, et chemin du hash-router (« /roadmap ») pour l'URL canonique.
 *  Chaque champ accepte une valeur, une ref ou un getter : la page reste
 *  réactive au changement de langue. */
export interface PageSeo {
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  path: MaybeRefOrGetter<string>;
}

/**
 * Applique les métadonnées SEO d'une page (réactif). Même contrat que
 * `useArticleSeo` : les balises créées ici sont retirées au démontage et le
 * titre revient à celui d'`index.html`.
 */
export function usePageSeo(page: PageSeo): void {
  let managed: ManagedTag[] = [];

  function clear(): void {
    clearManaged(managed);
    managed = [];
  }

  watchEffect(() => {
    clear();
    const title = toValue(page.title);
    const description = toValue(page.description);
    const url = `${window.location.origin}${window.location.pathname}#${toValue(page.path)}`;

    document.title = title;

    upsertMeta(managed, 'meta[name="description"]', { name: "description", content: description });
    // Open Graph
    upsertMeta(managed, 'meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta(managed, 'meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta(managed, 'meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    upsertMeta(managed, 'meta[property="og:url"]', { property: "og:url", content: url });
    // Twitter — le type de carte reste celui d'`index.html` (`summary`) : tant
    // qu'aucune image de partage n'existe, une carte large vide est pire.
    upsertMeta(managed, 'meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta(managed, 'meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });
    upsertLink(managed, "canonical", url);
  });

  onUnmounted(() => {
    clear();
    document.title = DEFAULT_TITLE;
  });
}
