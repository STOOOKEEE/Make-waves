<script setup lang="ts">
/*
 * LearnView — index de Tide School en ROADMAP verticale (beginner → pro).
 * Une ligne centrale descend ; les niveaux (jalons) sont posés dessus et les
 * leçons alternent gauche/droite autour. Vignette ASCII sur chaque carte.
 * Bilingue, sur le design system (docs/BRAND.md) : bleu = seul accent.
 */
import { computed, watchEffect } from "vue";
import { articlesByCategory } from "../data/learn";
import type { Article, Category, Difficulty } from "../data/learn/types";
import { useI18n } from "../i18n/useI18n";

const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale } = useI18n({
  en: {
    eyebrow: "Tide School",
    title: "The trader's path",
    subtitle:
      "One route from your first candle to competing on-chain. Follow the line, clear each level, and go from beginner to pro.",
    start: "Start",
    startSub: "No experience needed",
    pro: "Pro",
    proSub: "You're ready to compete",
    level: "Level {n}",
    lvBeginner: "Beginner",
    lvIntermediate: "Intermediate",
    lvAdvanced: "Advanced",
    lvPro: "Pro",
    descBasics: "Read the market, master orders, and learn how Tide works.",
    descPerps: "Perps, leverage, long & short, TP/SL — safely simulated in Paper.",
    descStrategies: "Risk management, trends, ranges, breakouts and psychology.",
    descPlatform: "Compete for pots and build a verifiable on-chain track record.",
    readCta: "Read →",
    minutesRead: "{n} min",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    ctaTitle: "That's the whole path.",
    ctaBody: "Now put it to work — trade with virtual capital or jump into a competition.",
    ctaTrade: "Open the terminal →",
    ctaComps: "Browse competitions",
  },
  fr: {
    eyebrow: "Tide School",
    title: "Le parcours du trader",
    subtitle:
      "Une seule route, de ta première bougie à la compétition on-chain. Suis la ligne, passe chaque niveau, et va de débutant à pro.",
    start: "Départ",
    startSub: "Aucune expérience requise",
    pro: "Pro",
    proSub: "Prêt à concourir",
    level: "Niveau {n}",
    lvBeginner: "Débutant",
    lvIntermediate: "Intermédiaire",
    lvAdvanced: "Avancé",
    lvPro: "Pro",
    descBasics: "Lis le marché, maîtrise les ordres, et comprends comment marche Tide.",
    descPerps: "Perps, levier, long & short, TP/SL — simulés sans risque en Paper.",
    descStrategies: "Gestion du risque, tendances, ranges, breakouts et psychologie.",
    descPlatform: "Concours pour des cagnottes et bâtis un track record on-chain vérifiable.",
    readCta: "Lire →",
    minutesRead: "{n} min",
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
    ctaTitle: "Voilà tout le parcours.",
    ctaBody: "Maintenant passe à la pratique — trade en capital virtuel ou saute dans une compétition.",
    ctaTrade: "Ouvrir le terminal →",
    ctaComps: "Voir les compétitions",
  },
});

// Ordre des niveaux = ordre pédagogique (beginner → pro).
const LEVEL_META: { id: Category; tagKey: string; descKey: string }[] = [
  { id: "basics", tagKey: "lvBeginner", descKey: "descBasics" },
  { id: "perps", tagKey: "lvIntermediate", descKey: "descPerps" },
  { id: "strategies", tagKey: "lvAdvanced", descKey: "descStrategies" },
  { id: "platform", tagKey: "lvPro", descKey: "descPlatform" },
];

interface RoadStop extends Article {
  side: "left" | "right";
}
interface RoadLevel {
  id: Category;
  n: string;
  label: string;
  tag: string;
  desc: string;
  /** Côté du titre de niveau : celui de sa 1ʳᵉ leçon (aligné aux cartes). */
  side: "left" | "right";
  stops: RoadStop[];
}

// Roadmap : niveaux dans l'ordre, leçons alternées gauche/droite (zigzag continu).
const roadmap = computed<RoadLevel[]>(() => {
  const groups = articlesByCategory(locale.value);
  let idx = 0;
  return LEVEL_META.map((lv, i) => {
    const g = groups.find((x) => x.id === lv.id);
    const stops: RoadStop[] = (g?.articles ?? []).map((a) => ({
      ...a,
      side: idx++ % 2 === 0 ? "left" : "right",
    }));
    return {
      id: lv.id,
      n: String(i + 1).padStart(2, "0"),
      label: g?.label ?? lv.id,
      tag: t(lv.tagKey),
      desc: t(lv.descKey),
      side: stops[0]?.side ?? "left",
      stops,
    };
  });
});

function difficultyLabel(d: Difficulty): string {
  return t(d);
}

function open(slug: string): void {
  emit("navigate", `/learn/${slug}`);
}

// Le titre d'onglet suit la langue choisie : il restait en anglais en FR.
watchEffect(() => {
  document.title = `${t("eyebrow")} — ${t("title")} | TIDE`;
});
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

    <div class="road">
      <template v-for="level in roadmap" :key="level.id">
        <!-- jalon / niveau -->
        <div class="milestone" :class="level.side" v-reveal>
          <div class="ms-node mono">{{ level.n }}</div>
          <div class="ms-head">
            <div class="lab ms-lab">{{ t("level", { n: level.n }) }} · {{ level.tag }}</div>
            <h2>{{ level.label }}</h2>
            <p>{{ level.desc }}</p>
          </div>
        </div>

        <!-- leçons du niveau -->
        <article
          v-for="stop in level.stops"
          :key="stop.slug"
          class="stop"
          :class="stop.side"
          v-reveal
        >
          <div class="node"></div>
          <div class="card lesson" @click="open(stop.slug)">
            <div class="lesson-art">
              <pre aria-hidden="true">{{ stop.art }}</pre>
            </div>
            <div class="lesson-body">
              <div class="lesson-top">
                <span class="diff mono" :class="stop.difficulty">
                  {{ difficultyLabel(stop.difficulty) }}
                </span>
                <span class="time mono">{{ t("minutesRead", { n: stop.minutes }) }}</span>
              </div>
              <h3>{{ stop.title }}</h3>
              <div class="dek">{{ stop.dek }}</div>
              <div class="go">{{ t("readCta") }}</div>
            </div>
          </div>
        </article>
      </template>
    </div>

    <!-- arrivée : pro — hors de la ligne (qui s'arrête avant), mais centré -->
    <div class="cap bottom" v-reveal>
      <div class="cap-node pro mono">★</div>
      <div class="cap-text">
        <div class="cap-title">{{ t("pro") }}</div>
        <div class="lab">{{ t("proSub") }}</div>
      </div>
    </div>

    <!-- CTA de fin de parcours -->
    <div class="road-cta card" v-reveal>
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
  </div>
</template>

<style scoped>
.eyebrow {
  margin-bottom: 10px;
}
.head-copy p {
  max-width: 640px;
}

/* ============ ROADMAP ============ */
.road {
  position: relative;
  max-width: 1080px;
  margin: 8px auto 0;
  padding: 8px 0 8px;
}
/* la ligne centrale qui descend — « route » en pointillés clairs, visible sur
 * le fond bleu, avec un halo doux. Un rail continu discret dessous pour la
 * continuité. */
.road::before {
  content: "";
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  border-radius: 4px;
  background:
    repeating-linear-gradient(
      180deg,
      #ffffff 0 12px,
      rgba(255, 255, 255, 0) 12px 26px
    ),
    linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.22) 5%, rgba(255, 255, 255, 0.22) 95%, transparent);
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.45);
}

/* --- caps départ/arrivée --- */
.cap {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  justify-items: center;
  text-align: center;
  gap: 10px;
  padding: 6px 0;
}
.cap-node {
  grid-column: 2;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: var(--panel);
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.12);
}
.cap.top .cap-node {
  color: var(--blue);
}
.cap-node.pro {
  color: var(--blue);
  background: #fff;
  box-shadow: 0 0 0 5px rgba(79, 106, 255, 0.22);
}
.cap-text {
  grid-column: 2;
}
.cap-title {
  font-family: var(--disp);
  font-weight: 900;
  text-transform: uppercase;
  font-size: 22px;
  letter-spacing: -0.03em;
  line-height: 1;
}
.cap.bottom {
  margin-top: 30px;
}

/* --- jalon / niveau : nœud sur la ligne, texte décalé du côté des cartes --- */
.milestone {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 54px 1fr;
  align-items: center;
  margin: 34px 0 12px;
}
.ms-node {
  grid-column: 2;
  justify-self: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  background: linear-gradient(150deg, var(--blue), var(--blue-dk));
  border: 3px solid #fff;
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.14);
}
.ms-head {
  max-width: 420px;
}
.milestone.left .ms-head {
  grid-column: 1;
  text-align: right;
  margin-left: auto;
}
.milestone.right .ms-head {
  grid-column: 3;
  text-align: left;
}
.ms-lab {
  margin-bottom: 6px;
}
.ms-head h2 {
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(24px, 3vw, 34px);
  letter-spacing: -0.03em;
  line-height: 1;
}
.ms-head p {
  color: var(--soft);
  font-size: 14.5px;
  line-height: 1.5;
  margin: 8px 0 0;
  max-width: 380px;
}
.milestone.left .ms-head p {
  margin-left: auto;
}

/* --- une leçon posée sur la ligne --- */
.stop {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 54px 1fr;
  align-items: center;
  margin: 16px 0;
}
.stop .node {
  grid-column: 2;
  justify-self: center;
  z-index: 2;
  position: relative;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--blue);
  border: 3px solid #fff;
  box-shadow: 0 0 0 4px rgba(79, 106, 255, 0.3);
}
/* petit connecteur node → carte */
.stop .node::before {
  content: "";
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 2px;
  background: rgba(255, 255, 255, 0.6);
}
.stop.left .node::before {
  right: 100%;
}
.stop.right .node::before {
  left: 100%;
}
.stop.left .card {
  grid-column: 1;
}
.stop.right .card {
  grid-column: 3;
}

/* --- carte leçon (vignette ASCII bleutée + corps) --- */
.lesson {
  cursor: pointer;
  transition:
    transform 0.3s var(--ease),
    box-shadow 0.3s var(--ease);
}
.lesson:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px -22px rgba(79, 106, 255, 0.6);
}
.lesson-art {
  position: relative;
  height: 128px;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
  display: grid;
  place-items: center;
  background:
    radial-gradient(120% 130% at 78% -18%, rgba(79, 106, 255, 0.32), transparent 56%),
    linear-gradient(158deg, #21243c, #14141d);
}
.lesson-art::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, 0.28));
  pointer-events: none;
}
.lesson-art pre {
  margin: 0;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.3;
  color: #c7cfff;
  white-space: pre;
  text-shadow: 0 0 18px rgba(79, 106, 255, 0.45);
}
.lesson-body {
  padding: 16px 20px 18px;
  display: flex;
  flex-direction: column;
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
.lesson .time {
  font-size: 11px;
  color: var(--soft);
}
.lesson h3 {
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.02em;
  line-height: 1.08;
  margin-bottom: 7px;
}
.lesson .dek {
  font-size: 13px;
  color: var(--soft);
  line-height: 1.5;
  margin-bottom: 14px;
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

/* --- CTA de fin --- */
.road-cta {
  max-width: 1080px;
  margin: 24px auto 0;
  padding: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #1d1d24, #16161b);
}
.road-cta h3 {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 22px;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.road-cta p {
  color: var(--soft);
  font-size: 14px;
  margin-top: 6px;
  max-width: 360px;
}
.cta-acts {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ============ MOBILE : ligne à gauche, cartes empilées ============ */
@media (max-width: 860px) {
  .road::before {
    left: 19px;
    transform: none;
  }
  .cap,
  .milestone {
    grid-template-columns: 38px 1fr;
    display: grid;
    text-align: left;
    justify-items: start;
    max-width: none;
    gap: 14px;
    align-items: center;
  }
  .cap-node,
  .ms-node {
    grid-column: 1;
    margin: 0;
    width: 38px;
    height: 38px;
    font-size: 14px;
  }
  .cap-text,
  .ms-head,
  .milestone.left .ms-head,
  .milestone.right .ms-head {
    grid-column: 2;
    text-align: left;
    margin-left: 0;
  }
  .milestone.left .ms-head p,
  .milestone.right .ms-head p {
    margin-left: 0;
  }
  .stop {
    grid-template-columns: 38px 1fr;
    column-gap: 14px;
  }
  .stop .node,
  .stop.left .node,
  .stop.right .node {
    grid-column: 1;
  }
  .stop .card,
  .stop.left .card,
  .stop.right .card {
    grid-column: 2;
  }
  .stop .node::before {
    display: none;
  }
}
</style>
