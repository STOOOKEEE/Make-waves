<script setup lang="ts">
/*
 * LearnArticleView — page d'une leçon. En-tête éditorial (piste, titre, méta),
 * corps rendu par <ArticleBody>, puis rangée CTA (aller trader / voir les
 * compétitions) et leçons liées. Bilingue via useI18n + data/learn.
 */
import { computed } from "vue";
import { getArticle, localizedCategories, relatedArticles } from "../data/learn";
import type { Category } from "../data/learn/types";
import { useI18n } from "../i18n/useI18n";
import ArticleBody from "../components/learn/ArticleBody.vue";

const props = defineProps<{ slug: string | undefined }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale } = useI18n({
  en: {
    back: "← Tide School",
    minutes: "{n} min read",
    notFoundTitle: "Lesson not found",
    notFoundBody: "This lesson doesn't exist (yet). Head back to Tide School.",
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
    back: "← Tide School",
    minutes: "{n} min de lecture",
    notFoundTitle: "Leçon introuvable",
    notFoundBody: "Cette leçon n'existe pas (encore). Retourne à Tide School.",
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

const categoryLabel = computed<Record<Category, string>>(() => {
  const map = {} as Record<Category, string>;
  for (const c of localizedCategories(locale.value)) {
    map[c.id] = c.label;
  }
  return map;
});

function open(slug: string): void {
  emit("navigate", `/learn/${slug}`);
}
</script>

<template>
  <div class="page">
    <a class="back lab" href="#/learn" @click.prevent="emit('navigate', '/learn')">
      {{ t("back") }}
    </a>

    <template v-if="article">
      <header class="head">
        <div class="meta lab">
          {{ categoryLabel[article.category] }} ·
          {{ t(article.difficulty) }} ·
          <span class="mono">{{ t("minutes", { n: article.minutes }) }}</span>
        </div>
        <h1>{{ article.title }}</h1>
        <p class="dek">{{ article.dek }}</p>
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
            <span class="ico">{{ a.icon }}</span>
            <div>
              <div class="cat lab">{{ categoryLabel[a.category] }}</div>
              <h4>{{ a.title }}</h4>
            </div>
          </article>
        </div>
      </section>
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
.back {
  display: inline-block;
  padding: 10px 0 6px;
  transition: color 0.2s;
}
.back:hover {
  color: #fff;
}
.head {
  max-width: 720px;
  padding: 18px 0 20px;
}
.head .meta {
  margin-bottom: 16px;
}
.head h1 {
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(32px, 5vw, 60px);
  letter-spacing: -0.035em;
  line-height: 0.94;
}
.head .dek {
  margin-top: 16px;
  font-size: 18px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

/* rangée CTA de fin d'article */
.cta {
  max-width: 720px;
  margin: 44px 0 10px;
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

/* leçons liées */
.related {
  max-width: 720px;
  margin-top: 40px;
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
  padding: 18px;
  cursor: pointer;
  transition:
    transform 0.3s var(--ease),
    background 0.2s;
}
.rel:hover {
  transform: translateY(-3px);
  background: var(--panel2);
}
.rel .ico {
  font-size: 28px;
}
.rel .cat {
  margin-bottom: 4px;
}
.rel h4 {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.notfound {
  padding: 40px;
  text-align: center;
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
