<script setup lang="ts">
/*
 * LearnView — index de Tide School. Chapeau éditorial + filtre par piste +
 * leçon vedette (.card.feat) + grille de cartes (.cgrid). Porte le même langage
 * visuel que CompetitionsView (docs/DESIGN.md). Bilingue via useI18n + data/learn.
 */
import { computed, ref } from "vue";
import {
  featuredArticle,
  localizedArticles,
  localizedCategories,
} from "../data/learn";
import type { Article, Category, Difficulty } from "../data/learn/types";
import { useI18n } from "../i18n/useI18n";
import SegControl from "../components/SegControl.vue";

const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale } = useI18n({
  en: {
    eyebrow: "Tide School",
    title: "Learn to trade",
    subtitle:
      "From your first candle to leverage and risk management. Short, honest lessons — then go practice on the terminal.",
    featBadge: "Start here",
    readCta: "Read lesson →",
    minutes: "{n} min read",
    countOne: "{n} lesson",
    countMany: "{n} lessons",
    filterAll: "All",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  fr: {
    eyebrow: "Tide School",
    title: "Apprends à trader",
    subtitle:
      "De ta première bougie au levier et à la gestion du risque. Des leçons courtes et honnêtes — puis file t'entraîner sur le terminal.",
    featBadge: "Commence ici",
    readCta: "Lire la leçon →",
    minutes: "{n} min de lecture",
    countOne: "{n} leçon",
    countMany: "{n} leçons",
    filterAll: "Tout",
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
  },
});

const featured = computed(() => featuredArticle(locale.value));
const categories = computed(() => localizedCategories(locale.value));

// Libellé de piste par id (pour le tag des cartes).
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

// Filtre segmenté : « Tout » + une pastille par piste. Valeurs stables.
const filterOptions = computed(() => [
  { value: "all", label: t("filterAll") },
  ...categories.value.map((c) => ({ value: c.id, label: c.label })),
]);
const filter = ref<string>("all");

// Grille = tous les articles hors vedette, filtrés par piste.
const grid = computed<Article[]>(() => {
  const all = localizedArticles(locale.value).filter(
    (a) => a.slug !== featured.value.slug,
  );
  return filter.value === "all"
    ? all
    : all.filter((a) => a.category === filter.value);
});

const countLabel = computed(() => {
  const n = grid.value.length;
  return t(n > 1 ? "countMany" : "countOne", { n });
});

function open(slug: string): void {
  emit("navigate", `/learn/${slug}`);
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="lab eyebrow">{{ t("eyebrow") }}</div>
        <h1>{{ t("title") }}</h1>
        <p>{{ t("subtitle") }}</p>
      </div>
    </div>

    <!-- leçon vedette -->
    <div v-reveal class="card feat" @click="open(featured.slug)">
      <div class="glow"></div>
      <div class="feat-main">
        <div class="badge">{{ t("featBadge") }}</div>
        <div class="feat-meta lab">
          {{ categoryLabel[featured.category] }} ·
          {{ difficultyLabel(featured.difficulty) }} ·
          <span class="mono">{{ t("minutes", { n: featured.minutes }) }}</span>
        </div>
        <h2>{{ featured.title }}</h2>
        <p>{{ featured.dek }}</p>
        <button class="btn btn-white" @click.stop="open(featured.slug)">
          {{ t("readCta") }}
        </button>
      </div>
      <div class="feat-side">
        <span class="feat-ico">{{ featured.icon }}</span>
      </div>
    </div>

    <div class="controls">
      <SegControl v-model="filter" :options="filterOptions" />
      <div class="lab">{{ countLabel }}</div>
    </div>

    <div class="cgrid">
      <article
        v-for="(a, i) in grid"
        :key="a.slug"
        v-reveal="(i % 6) * 40"
        class="card lesson"
        @click="open(a.slug)"
      >
        <div class="top">
          <span class="ico">{{ a.icon }}</span>
          <span class="diff mono" :class="a.difficulty">
            {{ difficultyLabel(a.difficulty) }}
          </span>
        </div>
        <div class="cat lab">{{ categoryLabel[a.category] }}</div>
        <h3>{{ a.title }}</h3>
        <div class="dek">{{ a.dek }}</div>
        <div class="foot">
          <span class="time mono">{{ t("minutes", { n: a.minutes }) }}</span>
          <span class="go">{{ t("readCta") }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.eyebrow {
  margin-bottom: 10px;
}

/* vedette — variante « leçon » de la carte feat des compétitions */
.feat {
  position: relative;
  overflow: hidden;
  padding: 40px;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 40px;
  align-items: center;
  margin-bottom: 14px;
  background: linear-gradient(135deg, #1d1d24, #16161b);
  cursor: pointer;
}
@media (max-width: 900px) {
  .feat {
    grid-template-columns: 1fr;
    padding: 28px;
  }
}
.feat .glow {
  position: absolute;
  top: -30%;
  right: -10%;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 106, 255, 0.4), transparent 60%);
  pointer-events: none;
}
.feat-main {
  position: relative;
}
.feat .badge {
  display: inline-flex;
  align-items: center;
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
  font-size: clamp(30px, 4.2vw, 52px);
  letter-spacing: -0.035em;
  line-height: 0.94;
}
.feat p {
  color: var(--soft);
  font-size: 15.5px;
  margin: 16px 0 26px;
  max-width: 460px;
  line-height: 1.55;
}
.feat-side {
  position: relative;
  display: grid;
  place-items: center;
}
.feat-ico {
  font-size: clamp(80px, 12vw, 150px);
  line-height: 1;
  filter: saturate(1.1);
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 22px 0 14px;
  flex-wrap: wrap;
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
  padding: 22px;
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
.lesson .top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.lesson .ico {
  font-size: 26px;
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
.lesson .cat {
  margin-bottom: 8px;
}
.lesson h3 {
  font-weight: 800;
  font-size: 21px;
  letter-spacing: -0.02em;
  line-height: 1.06;
  margin-bottom: 8px;
}
.lesson .dek {
  font-size: 13.5px;
  color: var(--soft);
  line-height: 1.55;
  margin-bottom: 20px;
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
