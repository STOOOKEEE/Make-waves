<script setup lang="ts">
/*
 * LearnArticleView — page d'une leçon (façon Coinbase Learn, sur la marque TIDE).
 * Colonne de lecture centrée + sommaire latéral collant, en-tête ASCII, méta +
 * date de MAJ, corps rendu par <ArticleBody>, CTA et leçons liées. SEO complet
 * via useArticleSeo (title/meta/OG/JSON-LD).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { getArticle, localizedCategories, relatedArticles } from "../data/learn";
import type { Category } from "../data/learn/types";
import { tableOfContents } from "../data/learn/toc";
import { useI18n } from "../i18n/useI18n";
import { useArticleSeo } from "../composables/useSeo";
import ArticleBody from "../components/learn/ArticleBody.vue";

const props = defineProps<{ slug: string | undefined }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale, intlLocale } = useI18n({
  en: {
    home: "TIDE School",
    minutes: "{n} min read",
    updated: "Updated {d}",
    onThisPage: "On this page",
    notFoundTitle: "Lesson not found",
    notFoundBody: "This lesson doesn't exist (yet). Head back to Tide School.",
    back: "← All lessons",
    ctaTitle: "Ready to put it to work?",
    ctaBody: "Open the terminal and trade it with virtual capital — zero risk.",
    ctaTrade: "Open the terminal →",
    ctaComps: "Browse competitions",
    relatedTitle: "Keep learning",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  fr: {
    home: "TIDE School",
    minutes: "{n} min de lecture",
    updated: "Mis à jour le {d}",
    onThisPage: "Sur cette page",
    notFoundTitle: "Leçon introuvable",
    notFoundBody: "Cette leçon n'existe pas (encore). Retourne à Tide School.",
    back: "← Toutes les leçons",
    ctaTitle: "Prêt à passer à la pratique ?",
    ctaBody: "Ouvre le terminal et trade-le avec du capital virtuel — zéro risque.",
    ctaTrade: "Ouvrir le terminal →",
    ctaComps: "Voir les compétitions",
    relatedTitle: "Continue d'apprendre",
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  },
});

const article = computed(() => getArticle(props.slug, locale.value));
const related = computed(() =>
  props.slug ? relatedArticles(props.slug, locale.value) : [],
);
const toc = computed(() =>
  article.value ? tableOfContents(article.value.blocks) : [],
);

const categoryLabel = computed<Record<Category, string>>(() => {
  const map = {} as Record<Category, string>;
  for (const c of localizedCategories(locale.value)) {
    map[c.id] = c.label;
  }
  return map;
});

const updatedLabel = computed(() => {
  const a = article.value;
  if (!a) return "";
  const d = new Date(a.updated + "T00:00:00");
  return t("updated", {
    d: d.toLocaleDateString(intlLocale.value, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  });
});

useArticleSeo(article, locale);

// ---- Sommaire : ancre active via IntersectionObserver ----
const activeId = ref("");
let observer: IntersectionObserver | null = null;

function observeHeadings(): void {
  observer?.disconnect();
  if (typeof IntersectionObserver === "undefined") return;
  const els = toc.value
    .map((e) => document.getElementById(e.id))
    .filter((el): el is HTMLElement => el !== null);
  if (!els.length) return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) activeId.value = en.target.id;
      }
    },
    { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
  );
  els.forEach((el) => observer?.observe(el));
}

function scrollTo(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  activeId.value = id;
}

onMounted(() => setTimeout(observeHeadings, 0));
watch([() => props.slug, locale], () => setTimeout(observeHeadings, 0));
onBeforeUnmount(() => observer?.disconnect());

function open(slug: string): void {
  emit("navigate", `/learn/${slug}`);
}
</script>

<template>
  <div class="page learn-article">
    <template v-if="article">
      <div class="article-grid">
        <main class="article-main">
          <nav class="crumb lab">
            <a href="#/learn" @click.prevent="emit('navigate', '/learn')">{{ t("home") }}</a>
            <span class="sep">/</span>
            <span class="cur">{{ categoryLabel[article.category] }}</span>
          </nav>
          <header class="head">
            <div class="meta lab">
              <span class="pill">{{ categoryLabel[article.category] }}</span>
              <span class="pill">{{ t(article.difficulty) }}</span>
              <span class="dot mono">{{ t("minutes", { n: article.minutes }) }}</span>
              <span class="dot mono">{{ updatedLabel }}</span>
            </div>
            <h1>{{ article.title }}</h1>
            <p class="dek">{{ article.dek }}</p>
            <pre class="art" aria-hidden="true">{{ article.art }}</pre>
          </header>

          <ArticleBody :blocks="article.blocks" />

          <div class="cta card" v-reveal>
            <div>
              <h3>{{ t("ctaTitle") }}</h3>
              <p>{{ t("ctaBody") }}</p>
            </div>
            <div class="cta-acts">
              <button class="btn btn-white" @click="emit('navigate', '/dashboard')">
                {{ t("ctaTrade") }}
              </button>
              <button class="btn btn-line" @click="emit('navigate', '/competitions')">
                {{ t("ctaComps") }}
              </button>
            </div>
          </div>

          <section v-if="related.length" class="related">
            <div class="lab rel-head">{{ t("relatedTitle") }}</div>
            <div class="rel-grid">
              <article
                v-for="a in related"
                :key="a.slug"
                class="card rel"
                @click="open(a.slug)"
              >
                <div class="rel-body">
                  <div class="cat lab">{{ categoryLabel[a.category] }}</div>
                  <h4>{{ a.title }}</h4>
                </div>
                <span class="rel-go">→</span>
              </article>
            </div>
          </section>
        </main>

        <aside v-if="toc.length" class="toc">
          <div class="toc-inner">
            <div class="lab toc-head">{{ t("onThisPage") }}</div>
            <ul>
              <li v-for="entry in toc" :key="entry.id">
                <button
                  :class="{ on: activeId === entry.id }"
                  @click="scrollTo(entry.id)"
                >
                  {{ entry.text }}
                </button>
              </li>
            </ul>
            <a class="toc-back lab" href="#/learn" @click.prevent="emit('navigate', '/learn')">
              {{ t("back") }}
            </a>
          </div>
        </aside>
      </div>
    </template>

    <div v-else class="notfound card">
      <h2>{{ t("notFoundTitle") }}</h2>
      <p>{{ t("notFoundBody") }}</p>
      <button class="btn btn-white" @click="emit('navigate', '/learn')">
        {{ t("back") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0 10px;
}
.crumb a {
  transition: color 0.2s;
}
.crumb a:hover {
  color: #fff;
}
.crumb .sep {
  color: var(--mut2);
}
.crumb .cur {
  color: var(--soft);
}

/* Colonne de lecture CENTRÉE (piste du milieu) + sommaire dans la gouttière
 * droite. Les gouttières 1fr égales garantissent que le texte est bien au
 * centre de la page, quel que soit le sommaire. */
.article-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 720px) minmax(0, 1fr);
  column-gap: 40px;
  align-items: start;
}
.article-main {
  grid-column: 2;
  min-width: 0;
}
.toc {
  grid-column: 3;
}
@media (max-width: 1080px) {
  .article-grid {
    grid-template-columns: minmax(0, 720px);
    justify-content: center;
  }
  .article-main {
    grid-column: 1;
  }
  .toc {
    display: none;
  }
}

/* --- en-tête --- */
.head {
  padding: 4px 0 12px;
}
.art {
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.3;
  color: var(--blue);
  background: linear-gradient(135deg, #1b1b22, #16161b);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 26px 22px;
  margin: 26px 0 4px;
  overflow-x: auto;
  white-space: pre;
  -webkit-overflow-scrolling: touch;
}
.meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.meta .pill {
  color: #fff;
  border: 1px solid var(--line2);
  border-radius: 100px;
  padding: 4px 10px;
}
.meta .dot {
  color: var(--soft);
  font-size: 11px;
}
.head h1 {
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(30px, 4.6vw, 54px);
  letter-spacing: -0.035em;
  line-height: 0.96;
}
.head .dek {
  margin-top: 16px;
  font-size: 18.5px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

/* --- CTA fin d'article --- */
.cta {
  margin: 48px 0 10px;
  padding: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #1d1d24, #16161b);
}
.cta h3 {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 22px;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.cta p {
  color: var(--soft);
  font-size: 14px;
  margin-top: 6px;
  max-width: 340px;
}
.cta-acts {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* --- leçons liées --- */
.related {
  margin-top: 44px;
}
.rel-head {
  margin-bottom: 14px;
}
.rel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 640px) {
  .rel-grid {
    grid-template-columns: 1fr;
  }
}
.rel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  cursor: pointer;
  transition:
    transform 0.3s var(--ease),
    background 0.2s;
}
.rel:hover {
  transform: translateY(-3px);
  background: var(--panel2);
}
.rel-body {
  flex: 1;
  min-width: 0;
}
.rel .cat {
  margin-bottom: 5px;
}
.rel h4 {
  font-weight: 700;
  font-size: 15.5px;
  letter-spacing: -0.01em;
  line-height: 1.25;
}
.rel-go {
  color: var(--blue);
  font-weight: 700;
  font-size: 18px;
  flex: 0 0 auto;
  transition: transform 0.2s var(--ease);
}
.rel:hover .rel-go {
  transform: translateX(3px);
}

/* --- sommaire --- */
.toc-inner {
  position: sticky;
  top: 84px;
  max-width: 240px;
}
.toc-head {
  margin-bottom: 12px;
}
.toc ul {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  border-left: 1px solid var(--line);
}
.toc li button {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--soft);
  font-family: var(--disp);
  font-size: 13px;
  line-height: 1.35;
  padding: 7px 0 7px 14px;
  margin-left: -1px;
  border-left: 2px solid transparent;
  transition:
    color 0.2s,
    border-color 0.2s;
}
.toc li button:hover {
  color: #fff;
}
.toc li button.on {
  color: #fff;
  border-left-color: var(--blue);
}
.toc-back {
  transition: color 0.2s;
}
.toc-back:hover {
  color: #fff;
}

.notfound {
  padding: 40px;
  text-align: center;
  max-width: 560px;
  margin: 20px auto 0;
}
.notfound h2 {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 26px;
  margin-bottom: 10px;
}
.notfound p {
  color: var(--soft);
  margin-bottom: 20px;
}
</style>
