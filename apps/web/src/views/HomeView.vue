<script setup lang="ts">
import type { RoutePath } from "../composables/useRoute";
import LightTunnel from "../components/LightTunnel.vue";
import SectionHead from "../components/ui/SectionHead.vue";
import OutlineButton from "../components/ui/OutlineButton.vue";
import GhostLink from "../components/ui/GhostLink.vue";
import LcdReadout from "../components/ui/LcdReadout.vue";
import Hairline from "../components/ui/Hairline.vue";

const emit = defineEmits<{ (e: "navigate", path: RoutePath): void }>();

const HEADLINE = "Le marché ne pardonne qu'aux préparés.";
const words = HEADLINE.split(" ");

const modes = [
  {
    name: "Paper",
    text: "Portefeuille virtuel, ordres simulés sur des prix réels. Zéro risque tant que tu apprends.",
  },
  {
    name: "Live",
    text: "Swap spot réel sur le DEX natif XRPL, signé dans Xaman. Non-custodial — tes clés ne bougent pas.",
  },
  {
    name: "Compétitions",
    text: "Tournois à buy-in, classement au mérite, prize pool distribué on-chain aux gagnants.",
  },
];

const steps = [
  { n: "01", text: "Connecte ton wallet Xaman." },
  { n: "02", text: "Trade en Paper sur de vrais prix de marché." },
  { n: "03", text: "Grimpe au classement, construis ton track record." },
  { n: "04", text: "Passe en Live et prouve ton skill on-chain." },
];
</script>

<template>
  <!-- Ouverture : tunnel de lumière + titre qui se révèle -->
  <LightTunnel full>
    <div class="hero">
      <span class="t-eyebrow fade" style="--d: 0.1s">Paper trading · XRPL mainnet</span>

      <h1 class="t-display headline">
        <span
          v-for="(word, i) in words"
          :key="i"
          class="word"
          :style="{ '--i': i }"
          >{{ word }}</span
        >
      </h1>

      <p class="hero__lede muted fade" style="--d: 1.5s">
        Tide est un terminal à deux modes : entraîne-toi en virtuel sur de vrais
        prix, prouve ton edge en compétition, puis passe en réel.
      </p>

      <div class="hero__cta fade" style="--d: 1.7s">
        <OutlineButton solid @click="emit('navigate', '/terminal')">
          Ouvrir le terminal
        </OutlineButton>
        <GhostLink @click="emit('navigate', '/leaderboard')">
          Voir le classement
        </GhostLink>
      </div>

      <div class="hero__lcd fade" style="--d: 2s">
        <LcdReadout label="Réseau">XRPL—MAINNET</LcdReadout>
      </div>
    </div>
  </LightTunnel>

  <!-- Le produit : un terminal, deux modes -->
  <section class="section surface-graphite">
    <div class="container block">
      <SectionHead eyebrow="Le produit" title="Un terminal, deux modes.">
        Paper et Live partagent le même feed de prix, la même interface et le même
        classement. Tu passes de l'entraînement au réel sans changer d'outil.
      </SectionHead>

      <div class="modes">
        <article v-for="mode in modes" :key="mode.name" class="card">
          <h3 class="t-subheading">{{ mode.name }}</h3>
          <p class="t-caption muted">{{ mode.text }}</p>
        </article>
      </div>
    </div>
  </section>

  <!-- Le funnel, en fragments -->
  <section class="section surface-void">
    <div class="container block">
      <SectionHead eyebrow="Comment ça marche" title="Du paper au on-chain." />
      <ul class="steps">
        <li v-for="(step, i) in steps" :key="step.n">
          <Hairline v-if="i > 0" />
          <div class="step">
            <span class="step__n">{{ step.n }}</span>
            <span class="step__text t-subheading">{{ step.text }}</span>
          </div>
        </li>
      </ul>
    </div>
  </section>

  <!-- Clôture sombre -->
  <section class="section surface-graphite">
    <div class="container closing">
      <h2 class="t-heading">Prêt à entrer dans le terminal ?</h2>
      <div class="closing__cta">
        <OutlineButton solid @click="emit('navigate', '/terminal')">
          Ouvrir le terminal
        </OutlineButton>
        <OutlineButton @click="emit('navigate', '/competitions')">
          Voir les compétitions
        </OutlineButton>
      </div>
      <p class="t-micro dim closing__foot">
        Tide · Make Waves XRPL · spot non-custodial · aucun conseil financier
      </p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-20);
}

.headline {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0 0.26em;
  margin-top: var(--spacing-10);
  max-width: 16ch;
}

.word {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.45em);
  filter: blur(12px);
  animation: word-in 1s var(--ease) forwards;
  /* révélation gauche → droite, mot par mot */
  animation-delay: calc(0.35s + var(--i) * 0.13s);
}

.fade {
  opacity: 0;
  animation: fade-up 0.9s var(--ease) forwards;
  animation-delay: var(--d, 0s);
}

.hero__lede {
  max-width: 480px;
  font-size: var(--text-subheading);
  line-height: var(--leading-subheading);
  letter-spacing: var(--tracking-subheading);
}

.hero__cta {
  display: flex;
  align-items: center;
  gap: var(--spacing-20);
  margin-top: var(--spacing-10);
}

.hero__lcd {
  margin-top: var(--spacing-30);
}

@keyframes word-in {
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- Sections ---- */
.block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--element-gap);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-13);
  padding: var(--card-padding);
  border-radius: var(--radius-cards);
  background: var(--tint-raise);
  border: 1px solid var(--hairline-dark);
}

.steps {
  display: flex;
  flex-direction: column;
}

.step {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-30);
  padding: var(--spacing-20) 0;
}

.step__n {
  font-family: var(--font-lcd);
  font-size: var(--text-lcd);
  letter-spacing: var(--tracking-lcd);
  color: var(--text-on-dark-muted);
  min-width: 48px;
}

.step__text {
  color: var(--color-paper);
}

.closing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-30);
  text-align: center;
}

.closing__cta {
  display: flex;
  gap: var(--spacing-20);
  flex-wrap: wrap;
  justify-content: center;
}

.closing__foot {
  margin-top: var(--spacing-20);
}

@media (max-width: 760px) {
  .modes {
    grid-template-columns: 1fr;
  }
}
</style>
