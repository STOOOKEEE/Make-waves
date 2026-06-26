<script setup lang="ts">
// Vue détail d'une compétition — portée depuis design_site/competition.html.
// Hero + règles + récompenses + classement + déroulé + modale d'inscription 3 étapes.
// L'app-bar et le .grain sont globaux : on démarre au .page de la source.
import { ref } from "vue";
import type { TideClient } from "@tide/client";
import { getComp } from "../data/competitions";
import StatusBadge from "../components/StatusBadge.vue";
import { useCountdown } from "../composables/useCountdown";
import { useCompetitions } from "../composables/useCompetitions";

const props = defineProps<{ client: TideClient; competitionId?: string }>();
const emit = defineEmits<{ navigate: [path: string] }>();

// Compétition affichée (mock) + indicateur de pré-inscription.
const c = getComp(props.competitionId);
const isPre = c.status === "soon";

// Couleurs d'avatars du classement (cycle).
const avatarCols = ["#FFD66B", "#BFF6CE", "#FFB9AC", "#9d7bff", "#4F6AFF"];
// Couleurs de médailles des récompenses (or, argent, bronze, +reste).
const medals = ["#FFD66B", "#D9D4C8", "#C98800", "#2A2A30"];

// Lignes de règles (clé / valeur) dérivées des données.
const rules: Array<[string, string]> = [
  ["Capital de départ", c.capital],
  ["Levier max", c.leverage],
  ["Marchés autorisés", c.markets],
  ["Format de scoring", c.format],
  ["Durée", c.duration],
  ["Frais d'entrée", c.fee],
];

// Lignes du récapitulatif (modale, étape 2).
const recap: Array<[string, string]> = [
  ["Compétition", c.name],
  ["Capital crédité", c.capital],
  ["Frais d'entrée", c.fee],
  ["Cagnotte", c.pot],
];

// Index de l'étape « en cours » de la timeline : première non terminée.
const nextIdx = c.timeline.findIndex((t) => !t.done);

// Libellé du compte à rebours selon l'état.
const cdLabel = c.startsIn ? "Commence dans" : "Se termine dans";
// Compte à rebours réactif (inutile si la compétition est terminée).
const { dd, hh, mm, ss } = useCountdown({ days: c.daysLeft, hours: 11, mins: 38, secs: 52 });

// Libellé + classe du bouton « rejoindre » selon l'état.
const joinLabel =
  c.status === "ended"
    ? "Voir les résultats"
    : c.status === "soon"
      ? "Pré-inscription"
      : "Rejoindre la compétition";
const joinClass = c.status === "ended" ? "ended" : "";

// Titre du classement selon l'état.
const leadTitle = c.status === "ended" ? "Classement final" : "Classement live";

// ---- Modale d'inscription (3 étapes) ----
const showModal = ref(false);
const step = ref(0);
const agree = ref(false);
// Référence vers la carte « classement » (pour scroll si terminée).
const leadCard = ref<HTMLElement | null>(null);

const comps = useCompetitions(props.client);

// Titre de la modale + textes de succès selon pré-inscription.
const modalTitle = isPre ? "Pré-inscription" : "Inscription";
const successHeading = isPre ? "Pré-inscrit !" : "Tu es inscrit !";
const successParagraph = isPre
  ? `Ta place est réservée pour « ${c.name} ». On te préviendra au coup d'envoi.`
  : `Bienvenue dans « ${c.name} ». Ton capital de ${c.capital} est crédité. Que la meilleure stratégie gagne.`;

// Clic « rejoindre » : si terminée → scroll vers le classement, sinon ouvre la modale.
function onJoin(): void {
  if (c.status === "ended") {
    leadCard.value?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  step.value = 0;
  agree.value = false;
  showModal.value = true;
}

function closeModal(): void {
  showModal.value = false;
}

// Fermeture au clic sur le fond (et non sur la modale elle-même).
function onOverlayClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

function goStep1(): void {
  step.value = 1;
}

// Confirmation : passe au succès puis tente l'appel backend en best-effort.
async function confirm(): Promise<void> {
  step.value = 2;
  // Hybride : l'appel réseau ne bloque jamais l'UX de succès (erreurs captées
  // dans comps.error par le composable).
  await comps.join(c.id, "0xPilote.eth");
}
</script>

<template>
  <div class="page">
    <a href="#" class="back" @click.prevent="emit('navigate', '/competitions')"
      >← Toutes les compétitions</a
    >

    <!-- HERO -->
    <div class="card chero rv" v-reveal>
      <div class="glow"></div>
      <div>
        <div class="head">
          <span class="ico">{{ c.ico }}</span>
          <StatusBadge :status="c.status" />
        </div>
        <h1>{{ c.name }}</h1>
        <p>{{ c.long }}</p>
        <div class="row">
          <div>
            <div class="l">Participants</div>
            <div class="v">{{ c.players }}</div>
          </div>
          <div>
            <div class="l">Format</div>
            <div class="v" style="font-size: 15px">{{ c.format }}</div>
          </div>
          <div>
            <div class="l">Durée</div>
            <div class="v" style="font-size: 15px">{{ c.duration }}</div>
          </div>
        </div>
      </div>
      <div class="cside">
        <div class="potbox">
          <div class="l">Cagnotte</div>
          <div class="pot">{{ c.pot }}</div>
          <div class="cd-label">
            {{ c.status === "ended" ? "Compétition terminée" : cdLabel }}
          </div>
          <div class="cd" v-if="c.status !== 'ended'">
            <div>
              <div class="v">{{ dd }}</div>
              <div class="l2">Jours</div>
            </div>
            <div>
              <div class="v">{{ hh }}</div>
              <div class="l2">Heures</div>
            </div>
            <div>
              <div class="v">{{ mm }}</div>
              <div class="l2">Min</div>
            </div>
            <div>
              <div class="v">{{ ss }}</div>
              <div class="l2">Sec</div>
            </div>
          </div>
          <button class="joinbtn" :class="joinClass" @click="onJoin">
            {{ joinLabel }}
          </button>
        </div>
      </div>
    </div>

    <!-- BODY -->
    <div class="cgrid2">
      <div class="card sec rules rv" v-reveal>
        <div class="t">Règles & format</div>
        <div>
          <div class="ri" v-for="r in rules" :key="r[0]">
            <span class="k">{{ r[0] }}</span><span class="v">{{ r[1] }}</span>
          </div>
        </div>
      </div>
      <div class="card sec prz rv" v-reveal>
        <div class="t">Récompenses</div>
        <div>
          <div class="pr" v-for="(p, i) in c.prizes" :key="p.pos">
            <div class="pos">
              <span
                class="medal"
                :style="{
                  background: medals[i] ?? medals[3],
                  ...(i > 2 ? { color: 'var(--soft)' } : {}),
                }"
                >{{ i < 3 ? i + 1 : "★" }}</span
              >{{ p.pos }}
            </div>
            <div class="amt">{{ p.amt }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="cgrid2" style="margin-top: 14px">
      <div class="card sec lead rv" ref="leadCard" v-reveal>
        <div class="t">{{ leadTitle }}</div>
        <div v-if="c.leaders.length">
          <div
            class="lr"
            :class="{ t1: i === 0 }"
            v-for="(l, i) in c.leaders"
            :key="l.r"
          >
            <div class="rk">{{ l.r }}</div>
            <div style="display: flex; align-items: center; gap: 11px">
              <span class="av" :style="{ background: avatarCols[i % avatarCols.length] }">{{
                l.n.slice(0, 2).toUpperCase()
              }}</span>
              <span class="nm">{{ l.n }}</span>
            </div>
            <div class="ret">{{ l.ret }}</div>
          </div>
        </div>
        <div v-else class="empty">
          Le classement s'ouvrira au coup d'envoi.<br />Pré-inscris-toi pour réserver ta
          place sur la grille de départ.
        </div>
      </div>
      <div class="card sec rv" v-reveal>
        <div class="t">Déroulé</div>
        <div class="tl">
          <div
            class="ti"
            :class="{ done: t.done, now: i === nextIdx && c.status !== 'ended' }"
            v-for="(t, i) in c.timeline"
            :key="t.l"
          >
            <span class="node"></span>
            <span class="lt">{{ t.l }}</span>
            <span class="dt">{{ t.d }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODALE D'INSCRIPTION -->
  <div class="overlay" :class="{ show: showModal }" @click="onOverlayClick">
    <div class="modal">
      <div class="mhead">
        <span class="t">{{ modalTitle }}</span
        ><button class="x" @click="closeModal">✕</button>
      </div>
      <div class="steps-dots">
        <i :class="{ on: 0 <= step }"></i><i :class="{ on: 1 <= step }"></i
        ><i :class="{ on: 2 <= step }"></i>
      </div>
      <div class="mbody">
        <!-- étape 1 -->
        <div class="mstep" :class="{ on: step === 0 }">
          <div class="sl">Étape 1 / 3</div>
          <h3>Connecte ton wallet</h3>
          <div class="walletbox">
            <span class="wic">P</span>
            <div>
              <b>0xPilote.eth</b><span>0x7a2f…34f1 · Solana</span>
            </div>
            <span class="ok">✓ Connecté</span>
          </div>
          <p
            style="
              color: var(--soft);
              font-size: 13px;
              line-height: 1.55;
              margin-bottom: 18px;
            "
          >
            Aucun dépôt requis. Le capital de démo est crédité automatiquement à
            l'inscription.
          </p>
          <button class="mcta" @click="goStep1">Continuer</button>
        </div>
        <!-- étape 2 -->
        <div class="mstep" :class="{ on: step === 1 }">
          <div class="sl">Étape 2 / 3</div>
          <h3>Vérifie & accepte</h3>
          <div class="recap">
            <div class="ri" v-for="r in recap" :key="r[0]">
              <span class="k">{{ r[0] }}</span><span class="v">{{ r[1] }}</span>
            </div>
          </div>
          <label class="check"
            ><input type="checkbox" v-model="agree" /> J'ai lu et j'accepte le règlement
            de la compétition. Je comprends qu'il s'agit de trading sur capital fictif,
            sans risque financier réel.</label
          >
          <button class="mcta" :disabled="!agree" @click="confirm">
            Confirmer l'inscription
          </button>
        </div>
        <!-- étape 3 -->
        <div class="mstep" :class="{ on: step === 2 }">
          <div class="success">
            <span class="em">🎉</span>
            <h3>{{ successHeading }}</h3>
            <p>{{ successParagraph }}</p>
            <div class="sacts">
              <a
                href="#"
                class="p"
                @click.prevent="emit('navigate', '/dashboard')"
                >Aller trader →</a
              >
              <a
                href="#"
                class="s"
                @click.prevent="emit('navigate', '/leaderboard')"
                >Le classement</a
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
  padding: 18px 2px 6px;
}
.back:hover {
  color: #fff;
}

/* hero header */
.chero {
  position: relative;
  overflow: hidden;
  padding: 38px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 40px;
  align-items: center;
  margin-bottom: 14px;
  background: linear-gradient(135deg, #1d1d24, #16161b);
}
@media (max-width: 900px) {
  .chero {
    grid-template-columns: 1fr;
    padding: 28px;
  }
}
.chero .glow {
  position: absolute;
  top: -40%;
  right: -8%;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 106, 255, 0.42), transparent 60%);
  pointer-events: none;
}
.chero .head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  position: relative;
}
.chero .ico {
  font-size: 38px;
}
.chero h1 {
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(30px, 4vw, 52px);
  letter-spacing: -0.035em;
  line-height: 0.94;
  position: relative;
}
.chero p {
  color: var(--soft);
  font-size: 15px;
  margin: 16px 0 24px;
  max-width: 520px;
  position: relative;
  line-height: 1.6;
}
.chero .row {
  display: flex;
  gap: 36px;
  flex-wrap: wrap;
  position: relative;
}
.chero .row .l {
  font-size: 11px;
  color: var(--soft);
  margin-bottom: 5px;
}
.chero .row .v {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 19px;
}
.cside {
  position: relative;
}
.potbox {
  border: 1px solid var(--line2);
  border-radius: 16px;
  padding: 26px;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
}
.potbox .l {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--soft);
}
.potbox .pot {
  font-family: var(--mono);
  font-weight: 700;
  font-size: clamp(44px, 6vw, 64px);
  letter-spacing: -0.04em;
  line-height: 0.95;
  margin: 8px 0;
  color: var(--up);
}
.cd {
  display: flex;
  gap: 8px;
  margin: 16px 0 18px;
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
.cd-label {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--soft);
  margin-bottom: 8px;
}
.joinbtn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-weight: 800;
  font-size: 16px;
  background: #fff;
  color: var(--blue);
  transition:
    transform 0.25s var(--ease),
    filter 0.2s;
}
.joinbtn:hover {
  transform: translateY(-2px);
}
.joinbtn.ended {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.joinbtn.enrolled {
  background: var(--up);
  color: #06231a;
}

/* body grid */
.cgrid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 900px) {
  .cgrid2 {
    grid-template-columns: 1fr;
  }
}
.sec {
  padding: 24px;
}
.sec .t {
  font-weight: 800;
  font-size: 18px;
  margin-bottom: 18px;
  letter-spacing: -0.01em;
}
.rules .ri {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 0;
  border-top: 1px solid var(--line);
  font-size: 14px;
}
.rules .ri:first-child {
  border-top: none;
}
.rules .ri .k {
  color: var(--soft);
}
.rules .ri .v {
  font-family: var(--mono);
  font-weight: 700;
}
/* prizes */
.prz .pr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--line);
}
.prz .pr:first-child {
  border-top: none;
}
.prz .pos {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14.5px;
}
.prz .medal {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 12px;
  color: #0a0a0a;
  flex-shrink: 0;
}
.prz .amt {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 17px;
  color: var(--gold);
}
/* leaders */
.lead .lr {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 13px 0;
  border-top: 1px solid var(--line);
}
.lead .lr:first-child {
  border-top: none;
}
.lead .rk {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 15px;
  color: var(--soft);
}
.lead .lr.t1 .rk {
  color: var(--gold);
}
.lead .av {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 11px;
  color: #0a0a0a;
}
.lead .nm {
  font-weight: 700;
  font-size: 14px;
}
.lead .ret {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 15px;
  color: var(--up);
  text-align: right;
}
.lead .empty {
  color: var(--soft);
  font-size: 14px;
  padding: 8px 0;
  line-height: 1.6;
}
/* timeline */
.tl {
  position: relative;
  padding-left: 6px;
}
.tl .ti {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--line);
}
.tl .ti:first-child {
  border-top: none;
}
.tl .node {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--line2);
  justify-self: center;
}
.tl .ti.done .node {
  background: var(--up);
  border-color: var(--up);
}
.tl .ti.now .node {
  background: var(--blue);
  border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(79, 106, 255, 0.3);
}
.tl .lt {
  font-weight: 600;
  font-size: 14px;
}
.tl .ti.done .lt,
.tl .ti:not(.done):not(.now) .lt {
  color: var(--soft);
}
.tl .dt {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--soft);
}

/* MODAL */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 8, 15, 0.7);
  backdrop-filter: blur(6px);
  z-index: 100;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.overlay.show {
  display: flex;
}
.modal {
  background: var(--panel);
  border: 1px solid var(--line2);
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  animation: pop 0.35s var(--ease);
}
@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.modal .mhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 22px;
  border-bottom: 1px solid var(--line);
}
.modal .mhead .t {
  font-weight: 800;
  font-size: 16px;
}
.modal .x {
  border: none;
  background: var(--panel2);
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 16px;
}
.steps-dots {
  display: flex;
  gap: 6px;
  padding: 16px 22px 0;
}
.steps-dots i {
  height: 4px;
  flex: 1;
  background: var(--panel2);
  border-radius: 2px;
  transition: background 0.3s;
}
.steps-dots i.on {
  background: var(--blue);
}
.mbody {
  padding: 22px;
}
.mstep {
  display: none;
}
.mstep.on {
  display: block;
  animation: fade 0.3s ease;
}
@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.mstep .sl {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--soft);
  margin-bottom: 8px;
}
.mstep h3 {
  font-weight: 800;
  font-size: 21px;
  letter-spacing: -0.01em;
  margin-bottom: 16px;
}
.walletbox {
  display: flex;
  align-items: center;
  gap: 13px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 14px;
}
.walletbox .wic {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--blue), #9d7bff);
  display: grid;
  place-items: center;
  font-weight: 800;
  flex-shrink: 0;
}
.walletbox b {
  font-size: 15px;
}
.walletbox span {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--soft);
  display: block;
  margin-top: 2px;
}
.walletbox .ok {
  margin-left: auto;
  color: var(--up);
  font-size: 13px;
  font-weight: 700;
}
.recap {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 4px 15px;
  margin-bottom: 16px;
}
.recap .ri {
  display: flex;
  justify-content: space-between;
  padding: 11px 0;
  border-top: 1px solid var(--line);
  font-size: 13.5px;
}
.recap .ri:first-child {
  border-top: none;
}
.recap .ri .k {
  color: var(--soft);
}
.recap .ri .v {
  font-family: var(--mono);
  font-weight: 700;
}
.check {
  display: flex;
  gap: 11px;
  align-items: flex-start;
  margin-bottom: 18px;
  cursor: pointer;
  font-size: 13px;
  color: var(--soft);
  line-height: 1.5;
}
.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--blue);
  margin-top: 1px;
  flex-shrink: 0;
}
.mcta {
  width: 100%;
  border: none;
  border-radius: 11px;
  padding: 15px;
  font-weight: 800;
  font-size: 15px;
  background: #fff;
  color: var(--blue);
  transition:
    filter 0.2s,
    opacity 0.2s;
}
.mcta:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.mcta.green {
  background: var(--up);
  color: #06231a;
}
.success {
  text-align: center;
  padding: 14px 0 4px;
}
.success .em {
  font-size: 54px;
  margin-bottom: 10px;
  display: block;
}
.success h3 {
  font-size: 24px;
  margin-bottom: 10px;
}
.success p {
  color: var(--soft);
  font-size: 14px;
  margin-bottom: 22px;
  line-height: 1.55;
}
.success .sacts {
  display: flex;
  gap: 10px;
}
.success .sacts a {
  flex: 1;
  text-align: center;
  border-radius: 11px;
  padding: 14px;
  font-weight: 700;
  font-size: 14px;
}
.success .sacts .p {
  background: var(--up);
  color: #06231a;
}
.success .sacts .s {
  border: 1px solid var(--line2);
  color: #fff;
}
</style>
