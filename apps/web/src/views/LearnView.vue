<script setup lang="ts">
/*
 * LearnView — index de Tide School (façon Coinbase Learn, marque TIDE).
 * En-tête éditorial + leçon vedette & colonne « Popular » + puces de piste +
 * sections groupées par piste (cartes à vignette ASCII). Bilingue, sur le
 * design system (docs/DESIGN.md) : bleu unique accent, mono pour les nombres.
 */
import { computed, onMounted, ref } from "vue";
import {
  articlesByCategory,
  featuredArticle,
  localizedArticles,
  localizedCategories,
  popularArticles,
} from "../data/learn";
import type { Article, Category, Difficulty } from "../data/learn/types";
import { useI18n } from "../i18n/useI18n";

const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale } = useI18n({
  en: {
    eyebrow: "Tide School",
    title: "Learn to trade",
    subtitle:
      "Beginner guides, practical playbooks and market know-how — from your first candle to leverage, risk and on-chain competition.",
    featBadge: "Start here",
    popularTitle: "Popular",
    readCta: "Read →",
    readLesson: "Read lesson →",
    minutes: "{n} min",
    minutesRead: "{n} min read",
    filterAll: "All",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  fr: {
    eyebrow: "Tide School",
    title: "Apprends à trader",
    subtitle:
      "Guides pour débutants, playbooks pratiques et savoir-faire de marché — de ta première bougie au levier, au risque et à la compétition on-chain.",
    featBadge: "Commence ici",
    popularTitle: "Populaire",
    readCta: "Lire →",
    readLesson: "Lire la leçon →",
    minutes: "{n} min",
    minutesRead: "{n} min de lecture",
    filterAll: "Tout",
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  },
});

onMounted(() => {
  document.title = "TIDE School — Learn to trade | TIDE";
});

const featured = computed(() => featuredArticle(locale.value));
const popular = computed(() =>
  popularArticles(locale.value).filter((a) => a.slug !== featured.value.slug),
);
const categories = computed(() => localizedCategories(locale.value));

const categoryLabel = computed<Record<Category, string>>(() => {
  const map = {} as Record<Category, string>;
  for (const c of categories.value) {
    map[c.id] = c.label;
  }
  return map;
});

function difficultyLabel(d: Difficulty): string {
  return t(d);
}

// Puces de filtre : « Tout » + une par piste.
const filter = ref<string>("all");
const chips = computed(() => [
  { value: "all", label: t("filterAll") },
  ...categories.value.map((c) => ({ value: c.id, label: c.label })),
]);

// Sections affichées : toutes les pistes (filtre "all") ou une seule.
const groups = computed(() => {
  const all = articlesByCategory(locale.value);
  return filter.value === "all"
    ? all
    : all.filter((g) => g.id === filter.value);
});

// Sur une piste précise, on liste tout ; sur "all", la vedette reste en tête et
// n'est pas répétée dans sa section.
function sectionArticles(id: Category, articles: Article[]): Article[] {
  return filter.value === "all"
    ? articles.filter((a) => a.slug !== featured.value.slug)
    : articles;
}

const totalCount = computed(() => localizedArticles(locale.value).length);

function open(slug: string): void {
  emit("navigate", `/learn/${slug}`);
}
</script>

<template>
  <div class="page learn">
    <div class="page-head">
      <div class="head-copy">
        <div class="lab eyebrow">{{ t("eyebrow") }}</div>
        <h1>{{ t("title") }}</h1>
        <p>{{ t("subtitle") }}</p>
      </div>
    </div>

    <!-- vedette + populaire -->
    <div class="top">
      <article v-reveal class="card feat" @click="open(featured.slug)">
        <div class="glow"></div>
        <div class="feat-main">
          <div class="badge">{{ t("featBadge") }}</div>
          <div class="feat-meta lab">
            {{ categoryLabel[featured.category] }} ·
            {{ difficultyLabel(featured.difficulty) }} ·
            <span class="mono">{{ t("minutesRead", { n: featured.minutes }) }}</span>
          </div>
          <h2>{{ featured.title }}</h2>
          <p>{{ featured.dek }}</p>
          <button class="btn btn-white" @click.stop="open(featured.slug)">
            {{ t("readLesson") }}
          </button>
        </div>
        <div class="feat-side">
          <pre class="feat-art" aria-hidden="true">{{ featured.art }}</pre>
        </div>
      </article>

      <aside v-reveal="80" class="card popular">
        <div class="lab pop-head">{{ t("popularTitle") }}</div>
        <button
          v-for="(a, i) in popular"
          :key="a.slug"
          class="pop-row"
          @click="open(a.slug)"
        >
          <span class="pop-idx mono">{{ String(i + 1).padStart(2, "0") }}</span>
          <span class="pop-body">
            <span class="pop-cat lab">{{ categoryLabel[a.category] }}</span>
            <span class="pop-title">{{ a.title }}</span>
          </span>
        </button>
      </aside>
    </div>

    <!-- puces de piste -->
    <div class="chips">
      <button
        v-for="c in chips"
        :key="c.value"
        class="chip"
        :class="{ on: filter === c.value }"
        @click="filter = c.value"
      >
        {{ c.label }}
      </button>
      <span class="spacer"></span>
      <span class="lab count">{{ totalCount }} lessons</span>
    </div>

    <!-- sections groupées par piste -->
    <section
      v-for="group in groups"
      :key="group.id"
      class="cat-section"
    >
      <div class="cat-head">
        <h2>{{ group.label }}</h2>
        <span class="lab mono">{{ group.articles.length }}</span>
      </div>
      <div class="cgrid">
        <article
          v-for="(a, i) in sectionArticles(group.id, group.articles)"
          :key="a.slug"
          v-reveal="(i % 6) * 40"
          class="card lesson"
          @click="open(a.slug)"
        >
          <div class="lesson-body">
            <div class="lesson-top">
              <span class="cat lab">{{ categoryLabel[a.category] }}</span>
              <span class="diff mono" :class="a.difficulty">
                {{ difficultyLabel(a.difficulty) }}
              </span>
            </div>
            <h3>{{ a.title }}</h3>
            <div class="dek">{{ a.dek }}</div>
            <div class="foot">
              <span class="time mono">{{ t("minutesRead", { n: a.minutes }) }}</span>
              <span class="go">{{ t("readCta") }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.eyebrow {
  margin-bottom: 10px;
}
.head-copy p {
  max-width: 640px;
}

/* ---- vedette + populaire ---- */
.top {
  display: grid;
  grid-template-columns: 1.75fr 1fr;
  gap: 14px;
  margin-bottom: 30px;
}
@media (max-width: 980px) {
  .top {
    grid-template-columns: 1fr;
  }
}

.feat {
  position: relative;
  overflow: hidden;
  padding: 36px;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 32px;
  align-items: center;
  background: linear-gradient(135deg, #1d1d24, #16161b);
  cursor: pointer;
}
@media (max-width: 620px) {
  .feat {
    grid-template-columns: 1fr;
    padding: 26px;
  }
}
.feat .glow {
  position: absolute;
  top: -30%;
  right: -10%;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 106, 255, 0.4), transparent 60%);
  pointer-events: none;
}
.feat-main {
  position: relative;
}
.feat .badge {
  display: inline-flex;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: #fff;
  color: var(--blue);
  font-weight: 700;
  border-radius: 100px;
  padding: 7px 14px;
  margin-bottom: 16px;
}
.feat-meta {
  margin-bottom: 12px;
}
.feat h2 {
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(28px, 3.6vw, 46px);
  letter-spacing: -0.035em;
  line-height: 0.96;
}
.feat p {
  color: var(--soft);
  font-size: 15.5px;
  margin: 14px 0 24px;
  max-width: 440px;
  line-height: 1.55;
}
.feat-side {
  position: relative;
  display: grid;
  place-items: center;
}
.feat-art {
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.3;
  color: var(--blue);
  white-space: pre;
  margin: 0;
  overflow: hidden;
}
@media (max-width: 620px) {
  .feat-side {
    display: none;
  }
}

.popular {
  padding: 22px 22px 10px;
  display: flex;
  flex-direction: column;
}
.pop-head {
  margin-bottom: 8px;
}
.pop-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  text-align: left;
  background: none;
  border: none;
  border-top: 1px solid var(--line);
  padding: 14px 0;
  cursor: pointer;
  color: var(--text);
  transition: opacity 0.2s;
}
.pop-row:first-of-type {
  border-top: none;
}
.pop-row:hover {
  opacity: 0.68;
}
.pop-idx {
  color: var(--blue);
  font-weight: 700;
  font-size: 12px;
  flex: 0 0 auto;
}
.pop-cat {
  display: block;
  margin-bottom: 3px;
}
.pop-title {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

/* ---- puces de piste ---- */
.chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}
.chip {
  font-weight: 600;
  font-size: 13px;
  color: var(--soft);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--line);
  border-radius: 100px;
  padding: 8px 15px;
  transition:
    color 0.2s,
    background 0.2s,
    border-color 0.2s;
}
.chip:hover {
  color: #fff;
}
.chip.on {
  color: var(--blue);
  background: #fff;
  border-color: #fff;
}
.chips .spacer {
  flex: 1;
}
.chips .count {
  color: var(--mut2);
}

/* ---- sections ---- */
.cat-section {
  margin-top: 34px;
}
.cat-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}
.cat-head h2 {
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(20px, 2.6vw, 30px);
  letter-spacing: -0.03em;
  line-height: 1;
}
.cat-head .mono {
  color: var(--mut2);
}

.cgrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 1000px) {
  .cgrid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .cgrid {
    grid-template-columns: 1fr;
  }
}

.lesson {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition:
    transform 0.3s var(--ease),
    background 0.2s;
}
.lesson:hover {
  transform: translateY(-4px);
  background: var(--panel2);
}
.lesson-body {
  padding: 22px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.lesson-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.lesson .diff {
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 9px;
  border-radius: 100px;
  border: 1px solid var(--line2);
  color: var(--soft);
}
.lesson .diff.beginner {
  color: #fff;
}
.lesson h3 {
  font-weight: 800;
  font-size: 20px;
  letter-spacing: -0.02em;
  line-height: 1.08;
  margin-bottom: 8px;
}
.lesson .dek {
  font-size: 13.5px;
  color: var(--soft);
  line-height: 1.55;
  margin-bottom: 18px;
  flex: 1;
}
.lesson .foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}
.lesson .time {
  font-size: 11px;
  color: var(--soft);
}
.lesson .go {
  font-weight: 700;
  font-size: 13px;
  color: var(--blue);
  transition: transform 0.2s var(--ease);
}
.lesson:hover .go {
  transform: translateX(3px);
}
</style>
