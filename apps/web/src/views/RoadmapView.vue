<script setup lang="ts">
// Page « Vision & roadmap », atteignable UNIQUEMENT depuis le footer de la
// landing : c'est le pitch du projet pour l'équipe XRPL (jury Make Waves), pas
// une section du produit — d'où son absence de l'app-bar.
// Aucun appel API, aucune prop : tout le contenu vient de `data/roadmap`, seule
// source de vérité de la copie (bilingue, parité FR/EN garantie à la compilation).
import { computed } from "vue";
import { resolveRoadmap } from "../data/roadmap";
import { usePageSeo } from "../composables/useSeo";
import { useI18n } from "../i18n/useI18n";

const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale } = useI18n({
  en: { seoTitle: "Vision & roadmap · TIDE" },
  fr: { seoTitle: "Vision & feuille de route · TIDE" },
});

/** Contenu résolu dans la langue courante. */
const c = computed(() => resolveRoadmap(locale.value));

usePageSeo({
  title: () => t("seoTitle"),
  description: () => c.value.hero.seoDescription,
  path: "/roadmap",
});
</script>

<template>
  <div class="page roadmap">
    <!-- HERO : la promesse en deux lignes, et les trois étapes en pile à droite -->
    <header class="rm-hero rv" v-reveal>
      <div class="hero-copy">
        <p class="lab">{{ c.hero.eyebrow }}</p>
        <h1><span>{{ c.hero.titleA }}</span><em>{{ c.hero.titleB }}</em></h1>
        <p class="hero-lead">{{ c.hero.lead }}</p>
      </div>

      <!-- Visuel purement décoratif : il répète les étapes détaillées plus bas. -->
      <ol class="hero-stack" aria-hidden="true">
        <li v-for="s in c.stages.items" :key="s.id" :data-stage="s.id">
          <span class="hs-n mono">{{ s.index }}</span>
          <span class="hs-label">{{ s.label }}</span>
          <span v-if="s.id === 'trade'" class="hs-chip mono">SourceTag</span>
        </li>
      </ol>
    </header>

    <!-- LA THÈSE : pourquoi ce projet compte pour le ledger -->
    <section class="rm-thesis rv" v-reveal>
      <p class="lab">{{ c.thesis.label }}</p>
      <h2>{{ c.thesis.title }}</h2>
      <p class="lead">{{ c.thesis.lead }}</p>

      <ul class="thesis">
        <li v-for="(p, i) in c.thesis.points" :key="i" class="thesis-point">
          <h3>{{ p.title }}</h3>
          <p>{{ p.body }}</p>
        </li>
      </ul>
    </section>

    <!-- CE QUI EXISTE : Learn → Prove → Trade -->
    <section class="rm-stages rv" v-reveal>
      <p class="lab">{{ c.stages.label }}</p>
      <h2>{{ c.stages.title }}</h2>
      <p class="lead">{{ c.stages.lead }}</p>

      <article v-for="s in c.stages.items" :key="s.id" class="stage" :data-stage="s.id">
        <span class="n mono">{{ s.index }}</span>
        <p class="lab">{{ s.label }}</p>
        <h3>{{ s.title }}</h3>
        <p>{{ s.body }}</p>
        <dl class="stage-facts">
          <div v-for="f in s.facts" :key="f.k">
            <dt class="lab">{{ f.k }}</dt>
            <dd class="mono">{{ f.v }}</dd>
          </div>
        </dl>
        <a
          class="stage-cta"
          :href="'#' + s.cta.path"
          @click.prevent="emit('navigate', s.cta.path)"
        >{{ s.cta.label }}</a>
      </article>
    </section>

    <!-- FEUILLE DE ROUTE : une frise, chaque palier porte ses chantiers titrés -->
    <section class="rm-roadmap rv" v-reveal>
      <p class="lab">{{ c.roadmap.label }}</p>
      <h2>{{ c.roadmap.title }}</h2>
      <p class="lead">{{ c.roadmap.lead }}</p>

      <ol class="phases">
        <li v-for="(p, i) in c.roadmap.phases" :key="i" class="phase" :data-status="p.status">
          <p class="lab">{{ p.label }} · {{ p.when }}</p>
          <h3>{{ p.title }}</h3>
          <p class="phase-lead">{{ p.lead }}</p>
          <ul class="phase-items">
            <li v-for="(item, j) in p.items" :key="j">
              <h4>{{ item.title }}</h4>
              <p>{{ item.body }}</p>
            </li>
          </ul>
        </li>
      </ol>
    </section>

    <!-- LE DEX : la grande vision, annoncée comme à venir -->
    <section class="rm-dex rv" v-reveal>
      <p class="lab">{{ c.dex.label }}</p>
      <span class="dex-badge mono">{{ c.dex.badge }}</span>
      <h2>{{ c.dex.title }}</h2>
      <p class="lead">{{ c.dex.lead }}</p>

      <ol class="dex-steps">
        <li v-for="(s, i) in c.dex.steps" :key="i" class="dex-step">
          <h3>{{ s.title }}</h3>
          <p>{{ s.body }}</p>
        </li>
      </ol>
    </section>

    <!-- SOUS LE CAPOT : bloc délimité, écrit pour les ingénieurs XRPL -->
    <section class="rm-tech rv" v-reveal>
      <p class="lab">{{ c.tech.label }}</p>
      <h2>{{ c.tech.title }}</h2>
      <p class="lead">{{ c.tech.lead }}</p>

      <h3 class="tech-sub">{{ c.tech.fundingTitle }}</h3>
      <p class="tech-lead">{{ c.tech.fundingLead }}</p>
      <ol class="flow">
        <li v-for="(s, i) in c.tech.funding" :key="i" class="flow-step">
          <h4>{{ s.title }}</h4>
          <ul v-if="s.tx.length" class="tx">
            <li v-for="tx in s.tx" :key="tx" class="mono">{{ tx }}</li>
          </ul>
          <span v-else class="tx-none mono">0 tx</span>
          <p>{{ s.body }}</p>
        </li>
      </ol>

      <h3 class="tech-sub">{{ c.tech.primitivesTitle }}</h3>
      <ul class="primitives">
        <li v-for="p in c.tech.primitives" :key="p.name" class="primitive">
          <code class="mono">{{ p.name }}</code>
          <p>{{ p.role }}</p>
        </li>
      </ul>
      <p class="not-used">{{ c.tech.notUsed }}</p>

      <h3 class="tech-sub">{{ c.tech.stackTitle }}</h3>
      <ul class="tech">
        <li v-for="(g, i) in c.tech.stack" :key="i" class="tech-group">
          <h4>{{ g.title }}</h4>
          <p>{{ g.body }}</p>
        </li>
      </ul>
    </section>

    <!-- CTA FINAL -->
    <section class="rm-final rv" v-reveal>
      <h2>{{ c.cta.title }}</h2>
      <p>{{ c.cta.body }}</p>
      <div class="final-cta">
        <a
          class="pill"
          :href="'#' + c.cta.primary.path"
          @click.prevent="emit('navigate', c.cta.primary.path)"
        >{{ c.cta.primary.label }}</a>
        <a
          class="pill ghost"
          :href="'#' + c.cta.secondary.path"
          @click.prevent="emit('navigate', c.cta.secondary.path)"
        >{{ c.cta.secondary.label }}</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.roadmap { display: grid; gap: 96px; padding-bottom: 110px; }

/* ---------- HERO ---------- */
.rm-hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(340px, .78fr); gap: 48px; align-items: center; min-height: 580px; padding: 64px; overflow: hidden; border: 1px solid var(--line2); border-radius: 30px; background: radial-gradient(circle at 80% 18%, color-mix(in srgb, var(--blue) 22%, transparent), transparent 36%), var(--panel); }
.rm-hero::before { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(255, 255, 255, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .035) 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(90deg, #000, transparent 74%); }
.hero-copy { position: relative; z-index: 2; }
.hero-copy h1 { display: grid; margin: 18px 0 0; font-size: clamp(38px, 5.4vw, 78px); font-weight: 900; line-height: .88; letter-spacing: -.045em; text-transform: uppercase; }
.hero-copy h1 em { color: var(--blue); font-style: normal; }
.hero-lead { max-width: 560px; margin-top: 26px; font-size: 16px; line-height: 1.55; color: var(--soft); }

.hero-stack { position: relative; z-index: 2; display: grid; gap: 12px; list-style: none; }
.hero-stack li { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 22px 24px; border: 1px solid var(--line2); border-radius: 18px; background: var(--panel2); }
.hero-stack li[data-stage="prove"] { margin-left: 22px; }
.hero-stack li[data-stage="trade"] { margin-left: 44px; border-color: var(--blue); }
.hs-n { font-size: 12px; color: var(--mut2); }
.hs-label { font-size: 19px; font-weight: 800; letter-spacing: -.01em; text-transform: uppercase; }
.hs-chip { padding: 6px 11px; border: 1px solid var(--blue); border-radius: 100px; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--blue); white-space: nowrap; }

/* ---------- TITRES DE SECTION (vocabulaire commun) ---------- */
.rm-thesis > h2,
.rm-stages > h2,
.rm-roadmap > h2,
.rm-tech > h2 { max-width: 20ch; margin: 16px 0 18px; font-size: clamp(30px, 4.2vw, 56px); font-weight: 900; line-height: .94; letter-spacing: -.04em; text-transform: uppercase; }
.rm-thesis > .lead,
.rm-stages > .lead,
.rm-roadmap > .lead,
.rm-tech > .lead { max-width: 760px; font-size: 16px; line-height: 1.6; color: var(--soft); }

/* ---------- GRILLES BORDÉES (thèse, DEX, primitives) : une seule recette ---------- */
.thesis,
.dex-steps,
.primitives { border-top: 1px solid var(--line3); border-left: 1px solid var(--line3); list-style: none; }
.thesis-point,
.dex-step,
.primitive { border-right: 1px solid var(--line3); border-bottom: 1px solid var(--line3); }

/* ---------- LA THÈSE ---------- */
.thesis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 44px; }
.thesis-point { padding: 28px; }
.thesis-point:first-child { grid-column: 1 / -1; }
.thesis-point h3 { font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
.thesis-point p { margin-top: 10px; font-size: 14.5px; line-height: 1.65; color: var(--soft); }

/* ---------- LES TROIS ÉTAPES ---------- */
.rm-stages > .lead { margin-bottom: 34px; }
.stage { display: grid; grid-template-columns: 110px minmax(0, 1fr) auto; column-gap: 36px; row-gap: 14px; padding: 44px 0; border-top: 1px solid var(--line3); transition: padding-left .4s var(--ease); }
.stage:last-of-type { border-bottom: 1px solid var(--line3); }
.stage:hover { padding-left: 18px; }
.stage .n { grid-column: 1; grid-row: 1; font-size: 14px; color: var(--mut2); }
.stage > .lab { grid-column: 1; grid-row: 2; align-self: start; }
.stage h3 { grid-column: 2; grid-row: 1; font-size: clamp(22px, 2.6vw, 34px); font-weight: 800; line-height: 1.05; letter-spacing: -.02em; text-transform: uppercase; }
.stage > p:not(.lab) { grid-column: 2; grid-row: 2; max-width: 760px; font-size: 15px; line-height: 1.6; color: var(--soft); }
.stage-facts { grid-column: 2; grid-row: 3; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; margin-top: 10px; padding-top: 20px; border-top: 1px solid var(--line2); }
.stage-facts dt { color: var(--mut2); }
.stage-facts dd { margin-top: 7px; font-size: 17px; font-weight: 700; letter-spacing: -.02em; }
.stage-cta { grid-column: 3; grid-row: 1; align-self: start; padding: 11px 20px; border: 1px solid var(--line3); border-radius: 100px; font-family: var(--disp); font-size: 14px; font-weight: 700; white-space: nowrap; transition: background .2s, color .2s, border-color .2s; }
.stage-cta:hover { background: #fff; border-color: #fff; color: var(--panel); }

/* ---------- FEUILLE DE ROUTE (frise verticale) ---------- */
.phases { margin-top: 44px; list-style: none; }
.phase { display: grid; grid-template-columns: 220px minmax(0, 1fr); column-gap: 36px; row-gap: 12px; padding: 34px 0 38px 24px; border-top: 1px solid var(--line3); border-left: 2px solid var(--line3); }
.phase:last-child { border-bottom: 1px solid var(--line3); }
.phase > .lab { grid-column: 1; grid-row: 1 / span 3; align-self: start; line-height: 1.6; }
.phase h3 { grid-column: 2; grid-row: 1; font-size: clamp(20px, 2.4vw, 30px); font-weight: 800; line-height: 1.08; letter-spacing: -.02em; text-transform: uppercase; }
.phase-lead { grid-column: 2; grid-row: 2; max-width: 720px; font-size: 15px; line-height: 1.6; color: var(--soft); }
.phase-items { grid-column: 2; grid-row: 3; margin-top: 8px; border-top: 1px solid var(--line); list-style: none; }
.phase-items > li { padding: 18px 0; border-bottom: 1px solid var(--line); }
.phase-items h4 { font-size: 15px; font-weight: 800; letter-spacing: -.01em; }
.phase-items p { margin-top: 7px; max-width: 720px; font-size: 14px; line-height: 1.6; color: var(--soft); }
.phase[data-status="now"] { border-left-color: var(--blue); }
.phase[data-status="now"] > .lab { color: var(--blue); }

/* ---------- LE DEX ---------- */
.rm-dex { padding: 56px; border: 1px solid var(--line2); border-radius: 26px; background: var(--panel2); }
.dex-badge { display: block; width: fit-content; margin-top: 16px; padding: 7px 13px; border: 1px solid var(--line3); border-radius: 100px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--soft); }
.rm-dex h2 { max-width: 18ch; margin: 20px 0 18px; font-size: clamp(34px, 5.2vw, 76px); font-weight: 900; line-height: .9; letter-spacing: -.045em; text-transform: uppercase; }
.rm-dex > .lead { max-width: 820px; font-size: 16px; line-height: 1.6; color: var(--soft); }
.dex-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 44px; }
.dex-step { padding: 26px; }
.dex-step h3 { font-size: 16px; font-weight: 800; letter-spacing: -.01em; }
.dex-step p { margin-top: 10px; font-size: 14px; line-height: 1.65; color: var(--soft); }

/* ---------- SOUS LE CAPOT ---------- */
.rm-tech { padding: 64px 52px 68px; border-top: 1px solid var(--line3); background: var(--panel2); }
.tech-sub { margin-top: 64px; font-size: clamp(20px, 2.4vw, 30px); font-weight: 800; line-height: 1.06; letter-spacing: -.02em; text-transform: uppercase; }
.tech-lead { max-width: 820px; margin-top: 14px; font-size: 15px; line-height: 1.65; color: var(--soft); }

.flow { margin-top: 26px; list-style: none; }
.flow-step { position: relative; display: grid; grid-template-columns: 220px minmax(0, 1fr); column-gap: 36px; row-gap: 10px; padding: 26px 0 30px; }
.flow-step::before { content: ""; position: absolute; top: 0; bottom: 0; left: 237px; width: 1px; background: var(--line2); }
.flow-step:first-child::before { top: 30px; }
.flow-step:last-child::before { bottom: auto; height: 30px; }
.flow-step::after { content: ""; position: absolute; top: 26px; left: 233px; width: 9px; height: 9px; border-radius: 50%; background: var(--blue); }
.flow-step h4 { grid-column: 2; grid-row: 1; padding-left: 22px; font-size: 19px; font-weight: 800; letter-spacing: -.01em; }
.flow-step p { grid-column: 2; grid-row: 2; max-width: 680px; padding-left: 22px; font-size: 14px; line-height: 1.65; color: var(--soft); }
.tx { grid-column: 1; grid-row: 1 / span 2; display: flex; flex-wrap: wrap; align-content: start; gap: 7px; list-style: none; }
.tx li { padding: 6px 11px; border: 1px solid var(--line2); border-radius: 100px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--soft); overflow-wrap: anywhere; }
.tx-none { grid-column: 1; grid-row: 1 / span 2; align-self: start; justify-self: start; padding: 6px 11px; border: 1px dashed var(--line2); border-radius: 100px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--mut2); }

.primitives { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 30px; }
.primitive { padding: 24px 26px; }
.primitive code { display: inline-block; font-size: 13px; letter-spacing: -.01em; color: var(--text); overflow-wrap: anywhere; word-break: break-word; }
.primitive p { margin-top: 10px; font-size: 14px; line-height: 1.6; color: var(--soft); }
.not-used { max-width: 900px; margin-top: 26px; font-size: 14px; line-height: 1.65; color: var(--soft); }

.tech { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 30px; list-style: none; }
.tech-group { padding: 26px; border: 1px solid var(--line2); border-radius: 20px; background: var(--panel); }
.tech-group h4 { font-size: 16px; font-weight: 800; letter-spacing: -.01em; text-transform: uppercase; }
.tech-group p { margin-top: 10px; font-size: 14px; line-height: 1.65; color: var(--soft); }

/* ---------- CTA FINAL ---------- */
.rm-final { text-align: center; padding: 30px 0 20px; }
.rm-final h2 { max-width: 16ch; margin: 0 auto; font-size: clamp(34px, 4.8vw, 64px); font-weight: 900; line-height: .88; letter-spacing: -.045em; text-transform: uppercase; }
.rm-final > p { max-width: 520px; margin: 24px auto 0; font-size: 17px; line-height: 1.55; color: var(--soft); }
.final-cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 34px; }
.pill { display: inline-flex; align-items: center; gap: 10px; padding: 16px 30px; border: 1px solid transparent; border-radius: 100px; background: #fff; color: var(--panel); font-family: var(--disp); font-size: 16px; font-weight: 800; cursor: pointer; transition: transform .3s var(--ease), opacity .2s; }
.pill:hover { transform: translateY(-2px); }
.pill.ghost { background: transparent; border-color: var(--line3); color: var(--text); }
.pill.ghost:hover { border-color: var(--text); }

@media (max-width: 1120px) {
  .rm-hero { grid-template-columns: 1fr; padding: 44px 32px; }
  .tech { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rm-dex { padding: 40px 30px; }
  .rm-tech { padding: 48px 30px 54px; }
}
@media (max-width: 900px) {
  .roadmap { gap: 72px; }
  .stage { grid-template-columns: 1fr; row-gap: 12px; }
  .stage .n { grid-column: 1; grid-row: 1; }
  .stage > .lab { grid-column: 1; grid-row: 2; }
  .stage h3 { grid-column: 1; grid-row: 3; }
  .stage > p:not(.lab) { grid-column: 1; grid-row: 4; }
  .stage-facts { grid-column: 1; grid-row: 5; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stage-cta { grid-column: 1; grid-row: 6; justify-self: start; }
  .phase { grid-template-columns: 1fr; row-gap: 10px; padding-left: 20px; }
  .phase > .lab { grid-column: 1; grid-row: 1; }
  .phase h3 { grid-column: 1; grid-row: 2; }
  .phase-lead { grid-column: 1; grid-row: 3; }
  .phase-items { grid-column: 1; grid-row: 4; }
  .flow-step { grid-template-columns: 1fr; row-gap: 12px; padding-left: 20px; }
  .flow-step::before { left: 0; }
  .flow-step::after { top: 30px; left: -4px; }
  .flow-step h4 { grid-column: 1; grid-row: 2; padding-left: 0; }
  .flow-step p { grid-column: 1; grid-row: 3; padding-left: 0; }
  .tx { grid-column: 1; grid-row: 1; }
  .tx-none { grid-column: 1; grid-row: 1; }
  .primitives { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .thesis { grid-template-columns: 1fr; }
  .dex-steps { grid-template-columns: 1fr; }
  .tech { grid-template-columns: 1fr; }
  .stage-facts { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .rm-hero { padding: 32px 22px; }
  .hero-stack li { grid-template-columns: auto 1fr; padding: 18px; }
  .hero-stack li[data-stage="prove"] { margin-left: 0; }
  .hero-stack li[data-stage="trade"] { margin-left: 0; }
  .hs-chip { grid-column: 1 / -1; justify-self: start; }
  .thesis-point { padding: 22px; }
  .dex-step { padding: 22px; }
  .primitive { padding: 20px 22px; }
  .rm-dex { padding: 30px 20px; }
  .rm-tech { padding: 40px 20px 44px; }
}

@media (prefers-reduced-motion: reduce) {
  .stage, .stage-cta, .pill { transition: none; }
  .stage:hover { padding-left: 0; }
  .pill:hover { transform: none; }
}
</style>
