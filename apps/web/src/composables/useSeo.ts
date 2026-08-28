/* SEO côté client pour Tide School. Le site est une SPA en hash-routing (le
 * référencement profond reste limité), mais on fait le maximum côté document :
 * <title>, meta description/keywords, Open Graph/Twitter, canonical, et un
 * JSON-LD `Article`. Les balises sont créées à la volée et retirées au démontage
 * (retour à l'état par défaut) pour ne pas polluer les autres écrans.
 */
import { onUnmounted, watchEffect } from "vue";
import type { Ref } from "vue";
import type { Article } from "../data/learn/types";
import type { Locale } from "../i18n/locale";

/** Doit rester identique au <title> de `apps/web/index.html` : c'est le titre
 *  restauré quand une vue quitte l'écran et relâche son SEO. */
const DEFAULT_TITLE = "TIDE — Learn to trade crypto with virtual money";
const BRAND = "TIDE School";

interface ManagedTag {
  el: HTMLElement;
  created: boolean;
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
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  managed.push({ el, created });
}

function upsertLink(managed: ManagedTag[], rel: string, href: string): void {
  let el = document.head.querySelector<HTMLElement>(`link[rel="${rel}"]`);
  const created = el === null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  managed.push({ el, created });
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
    for (const { el, created } of managed) {
      if (created) {
        el.remove();
      }
    }
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
