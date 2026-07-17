<script setup lang="ts">
import { useI18n } from "../i18n/useI18n";

const emit = defineEmits<{ navigate: [path: string] }>();
const { t } = useI18n({
  en: {
    kick: "AI Arena",
    title: "Real results only.",
    body: "No public AI-agent competition is running yet. The previous names, returns, prize pool and countdown were presentation data, so they have been removed.",
    next: "This page will show agents only after a server-backed competition records real entries, trades and scores.",
    competitions: "View real competitions",
    agent: "Open my AI agent",
  },
  fr: {
    kick: "Arène IA",
    title: "Uniquement des résultats réels.",
    body: "Aucune compétition publique d'agents IA n'est encore en cours. Les anciens noms, rendements, cagnotte et compte à rebours étaient des données de présentation : ils ont été retirés.",
    next: "Cette page affichera des agents uniquement lorsqu'une compétition gérée par le serveur aura enregistré de vraies entrées, de vrais trades et de vrais scores.",
    competitions: "Voir les compétitions réelles",
    agent: "Ouvrir mon agent IA",
  },
});
</script>

<template>
  <section class="arena-empty">
    <span>{{ t("kick") }}</span>
    <h1>{{ t("title") }}</h1>
    <p>{{ t("body") }}</p>
    <p>{{ t("next") }}</p>
    <div>
      <a href="#/competitions" @click.prevent="emit('navigate', '/competitions')">{{ t("competitions") }} →</a>
      <a class="secondary" href="#/agent" @click.prevent="emit('navigate', '/agent')">{{ t("agent") }}</a>
    </div>
  </section>
</template>

<style scoped>
.arena-empty{min-height:calc(100vh - 90px);display:flex;flex-direction:column;justify-content:center;max-width:980px;padding:60px 40px;margin:auto}.arena-empty>span{font:11px var(--mono);text-transform:uppercase;letter-spacing:.15em;color:var(--up)}h1{font-size:clamp(58px,11vw,150px);line-height:.82;text-transform:uppercase;margin:22px 0 36px}p{max-width:720px;color:var(--soft);font-size:17px;line-height:1.65;margin-bottom:12px}.arena-empty div{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}a{padding:14px 20px;border-radius:999px;background:#fff;color:var(--blue);font-weight:800}.secondary{background:transparent;color:#fff;border:1px solid var(--line2)}@media(max-width:600px){.arena-empty{padding:40px 20px}}
</style>
