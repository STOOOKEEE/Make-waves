<script setup lang="ts">
/*
 * CompetitionsView — écran des compétitions. Carte vedette (saison 04) +
 * grille filtrable. Porté depuis design_site/competitions.html.
 */
import { computed, ref } from "vue";
import { localizedCompetitions, getComp } from "../data/competitions";
import type { CompetitionMock, CompetitionStatus } from "../data/competitions";
import { useCountdown } from "../composables/useCountdown";
import { useI18n } from "../i18n/useI18n";
import StatusBadge from "../components/StatusBadge.vue";
import SegControl from "../components/SegControl.vue";

const emit = defineEmits<{ navigate: [path: string] }>();

const { t, locale } = useI18n({
  en: {
    pageTitle: "Competitions",
    pageSubtitle:
      "Seasons, flash tournaments and sponsored challenges. Pick your arena.",
    featBadge: "Live · featured",
    featTitle1: "Season 04 —",
    featTitle2: "Grand Championship",
    featDesc:
      "TIDE's flagship competition. 6 weeks, $100,000 in virtual capital, the best return takes the pot. Open to all, no entry fee.",
    featPlayersLabel: "Players",
    featFormatLabel: "Format",
    featRankLabel: "Your rank",
    featFormatValue: "Net return",
    ctaKeepTrading: "Keep trading →",
    ctaViewDetails: "View details",
    potLabel: "Prize pool",
    cdDays: "Days",
    cdHours: "Hours",
    cdMins: "Min",
    cdSecs: "Sec",
    cardEntryLabel: "Entry",
    registered: "{n} registered",
    countOne: "{n} competition",
    countMany: "{n} competitions",
    ctaLive: "Join",
    ctaSoon: "Pre-register",
    ctaEnded: "View results",
    filterAll: "All",
    filterLive: "Live",
    filterSoon: "Soon",
    filterEnded: "Ended",
  },
  fr: {
    pageTitle: "Compétitions",
    pageSubtitle:
      "Saisons, tournois éclair et défis sponsorisés. Choisis ton arène.",
    featBadge: "En cours · vedette",
    featTitle1: "Saison 04 —",
    featTitle2: "Grand Championnat",
    featDesc:
      "La compétition phare de TIDE. 6 semaines, $100 000 de capital virtuel, le meilleur rendement rafle la cagnotte. Ouvert à tous, sans frais d'entrée.",
    featPlayersLabel: "Participants",
    featFormatLabel: "Format",
    featRankLabel: "Ton rang",
    featFormatValue: "Rendement net",
    ctaKeepTrading: "Continuer à trader →",
    ctaViewDetails: "Voir les détails",
    potLabel: "Cagnotte",
    cdDays: "Jours",
    cdHours: "Heures",
    cdMins: "Min",
    cdSecs: "Sec",
    cardEntryLabel: "Entrée",
    registered: "{n} inscrits",
    countOne: "{n} compétition",
    countMany: "{n} compétitions",
    ctaLive: "Rejoindre",
    ctaSoon: "Pré-inscription",
    ctaEnded: "Voir les résultats",
    filterAll: "Toutes",
    filterLive: "En cours",
    filterSoon: "À venir",
    filterEnded: "Terminées",
  },
});

// Compétition vedette + reste de la grille (hors vedette) — réactif à la langue.
const featured = computed(() => getComp("season-04", locale.value));
const grid = computed(() =>
  localizedCompetitions(locale.value).filter((c) => !c.featured),
);

// Compte à rebours de la cagnotte vedette.
const { dd, hh, mm, ss } = useCountdown({
  days: 4,
  hours: 11,
  mins: 38,
  secs: 52,
});

// Filtre segmenté → statut. Valeurs stables ; libellés traduits.
const FILTERS = computed(() => [
  { value: "all", label: t("filterAll") },
  { value: "live", label: t("filterLive") },
  { value: "soon", label: t("filterSoon") },
  { value: "ended", label: t("filterEnded") },
]);
const filter = ref("all");

const filtered = computed<CompetitionMock[]>(() => {
  const g = grid.value;
  return filter.value === "all"
    ? g
    : g.filter((c) => c.status === filter.value);
});

const countLabel = computed(() => {
  const n = filtered.value.length;
  return t(n > 1 ? "countMany" : "countOne", { n });
});

// CTA selon le statut (classe + libellé traduit).
const CTA = computed<Record<CompetitionStatus, { c: string; l: string }>>(
  () => ({
    live: { c: "join", l: t("ctaLive") },
    soon: { c: "soon", l: t("ctaSoon") },
    ended: { c: "ended", l: t("ctaEnded") },
  }),
);

function openComp(id: string): void {
  emit("navigate", `/competition/${id}`);
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>{{ t("pageTitle") }}</h1>
        <p>{{ t("pageSubtitle") }}</p>
      </div>
    </div>

    <!-- vedette -->
    <div
      v-reveal
      class="card feat"
      @click="openComp(featured.id)"
    >
      <div class="glow"></div>
      <div>
        <div class="badge"><i></i> {{ t("featBadge") }}</div>
        <h2>{{ t("featTitle1") }}<br />{{ t("featTitle2") }}</h2>
        <p>{{ t("featDesc") }}</p>
        <div class="row">
          <div>
            <div class="l">{{ t("featPlayersLabel") }}</div>
            <div class="v">12 480</div>
          </div>
          <div>
            <div class="l">{{ t("featFormatLabel") }}</div>
            <div class="v">{{ t("featFormatValue") }}</div>
          </div>
          <div>
            <div class="l">{{ t("featRankLabel") }}</div>
            <div class="v up">#18</div>
          </div>
        </div>
        <div class="acts">
          <button
            class="btn btn-white"
            @click.stop="emit('navigate', '/dashboard')"
          >
            {{ t("ctaKeepTrading") }}
          </button>
          <button class="btn btn-line" @click.stop="openComp(featured.id)">
            {{ t("ctaViewDetails") }}
          </button>
        </div>
      </div>
      <div class="feat-side">
        <div class="potbox">
          <div class="l">{{ t("potLabel") }}</div>
          <div class="pot">$50,000</div>
          <div class="cd">
            <div><div class="v">{{ dd }}</div><div class="l2">{{ t("cdDays") }}</div></div>
            <div><div class="v">{{ hh }}</div><div class="l2">{{ t("cdHours") }}</div></div>
            <div><div class="v">{{ mm }}</div><div class="l2">{{ t("cdMins") }}</div></div>
            <div><div class="v">{{ ss }}</div><div class="l2">{{ t("cdSecs") }}</div></div>
          </div>
          <div class="lab">USDC + NFT · top 50</div>
        </div>
      </div>
    </div>

    <div class="controls">
      <SegControl v-model="filter" :options="FILTERS" />
      <div class="lab">{{ countLabel }}</div>
    </div>

    <div class="cgrid">
      <div
        v-for="(c, i) in filtered"
        :key="c.id"
        v-reveal="(i % 6) * 40"
        class="card comp"
        @click="openComp(c.id)"
      >
        <div class="top">
          <span class="ico">{{ c.ico }}</span>
          <StatusBadge :status="c.status" />
        </div>
        <h3>{{ c.name }}</h3>
        <div class="desc">{{ c.desc }}</div>
        <div class="meta">
          <div>
            <div class="l">{{ t("potLabel") }}</div>
            <div class="v gold">{{ c.pot }}</div>
          </div>
          <div>
            <div class="l">{{ t("cardEntryLabel") }}</div>
            <div class="v" style="font-size: 14px">{{ c.fee }}</div>
          </div>
        </div>
        <template v-if="c.cap">
          <div class="bar"><i :style="{ width: c.pct + '%' }"></i></div>
          <div class="barl">
            <span>{{ t("registered", { n: c.players }) }}</span>
            <span>{{ c.pct }}% · {{ c.cap }} max</span>
          </div>
        </template>
        <div v-else class="barl" style="margin-top: 4px">
          <span>{{ c.players }}</span>
          <span></span>
        </div>
        <button class="cta" :class="CTA[c.status].c">
          {{ CTA[c.status].l }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feat {
  position: relative;
  overflow: hidden;
  padding: 40px;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 40px;
  align-items: center;
  margin-bottom: 14px;
  background: linear-gradient(135deg, #1d1d24, #16161b);
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
.feat .badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: var(--up);
  color: #06231a;
  font-weight: 700;
  border-radius: 100px;
  padding: 7px 14px;
  margin-bottom: 20px;
}
.feat .badge i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #06231a;
  animation: bl 1.4s infinite;
}
@keyframes bl {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}
.feat h2 {
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(34px, 4.6vw, 58px);
  letter-spacing: -0.035em;
  line-height: 0.92;
  position: relative;
}
.feat p {
  color: var(--soft);
  font-size: 15.5px;
  margin: 16px 0 26px;
  max-width: 440px;
  position: relative;
  line-height: 1.55;
}
.feat .row {
  display: flex;
  gap: 30px;
  margin-bottom: 28px;
  position: relative;
  flex-wrap: wrap;
}
.feat .row .l {
  font-size: 11px;
  color: var(--soft);
  margin-bottom: 5px;
}
.feat .row .v {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 20px;
}
.feat .acts {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  position: relative;
}
.feat-side {
  position: relative;
}
.feat .potbox {
  border: 1px solid var(--line2);
  border-radius: 16px;
  padding: 26px;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
}
.feat .potbox .l {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--soft);
}
.feat .potbox .pot {
  font-family: var(--mono);
  font-weight: 700;
  font-size: clamp(44px, 6vw, 68px);
  letter-spacing: -0.04em;
  line-height: 0.95;
  margin: 10px 0;
  color: var(--up);
}
.cd {
  display: flex;
  gap: 8px;
  margin: 18px 0 22px;
}
.cd div {
  flex: 1;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 11px 4px;
}
.cd .v {
  font-family: var(--mono);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}
.cd .l2 {
  font-family: var(--mono);
  font-size: 8.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--soft);
  margin-top: 5px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
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
.comp {
  padding: 22px;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.3s var(--ease),
    background 0.2s;
  cursor: pointer;
}
.comp:hover {
  transform: translateY(-4px);
  background: var(--panel2);
}
.comp .top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
}
.comp .ico {
  font-size: 24px;
}
.comp h3 {
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin-bottom: 6px;
}
.comp .desc {
  font-size: 13px;
  color: var(--soft);
  line-height: 1.5;
  margin-bottom: 20px;
  flex: 1;
}
.comp .meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
}
.comp .meta .l {
  font-size: 10.5px;
  color: var(--soft);
  margin-bottom: 4px;
}
.comp .meta .v {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 16px;
}
.comp .meta .v.gold {
  color: var(--gold);
}
.comp .bar {
  height: 6px;
  background: var(--panel2);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}
.comp:hover .bar {
  background: #111;
}
.comp .bar i {
  display: block;
  height: 100%;
  background: var(--blue);
  border-radius: 3px;
}
.comp .barl {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--soft);
  margin-bottom: 18px;
}
.comp .cta {
  width: 100%;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  border-radius: 10px;
  padding: 13px;
  border: none;
  cursor: pointer;
}
.comp .cta.join {
  background: #fff;
  color: var(--blue);
}
.comp .cta.soon {
  background: none;
  border: 1px solid var(--line2);
  color: #fff;
}
.comp .cta.ended {
  background: none;
  border: 1px solid var(--line);
  color: var(--mut2);
}
</style>
