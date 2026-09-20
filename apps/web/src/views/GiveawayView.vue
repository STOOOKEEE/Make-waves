<script setup lang="ts">
// Page tombola, intégrée à la section Compétitions et gardée comme route directe
// pour les liens existants. Aucun total public d'entrées n'est affiché :
// `growth/context/05-facts.md` interdit de publier nos chiffres de traction.
// Le seul compteur est personnel.
import { computed, onBeforeUnmount, onMounted, watch, watchEffect } from "vue";
import type { TideClient } from "@tide/client";
import ProductViewer from "../components/giveaway/ProductViewer.vue";
import TermsPanel from "../components/giveaway/TermsPanel.vue";
import { useCountdown } from "../composables/useCountdown";
import { useGiveaway, type GiveawayRuleId } from "../composables/useGiveaway";
import { useGiveawayTerms } from "../composables/useGiveawayTerms";
import { useSession } from "../composables/useSession";
import { useWalletEntry } from "../composables/useWalletEntry";
import {
  GEMWALLET_URL,
  GIVEAWAY_CLOSES_AT,
  GIVEAWAY_X_HANDLE,
  GIVEAWAY_X_URL,
  MAKE_WAVES_NAME,
  MAKE_WAVES_ORGANISER,
  MAKE_WAVES_URL,
  XAMAN_URL,
  XRPL_BASE_RESERVE_XRP,
} from "../data/giveaway";
import { CARRY_OVER_MONTHS, DRAW_WINDOW_DAYS, TERMS_VERSION } from "../data/giveaway-terms";
import { useI18n } from "../i18n/useI18n";
// Assets importés en module (convention de `BrandMark.vue`) : Vite les
// empreinte et les résout aussi bien au build qu'en test.
import modelUrl from "../assets/giveaway/airpods-max.glb?url";
import posterUrl from "../assets/giveaway/airpods-max-hero.webp";

const props = defineProps<{ client: TideClient }>();
const emit = defineEmits<{ navigate: [path: string] }>();

const { t, intlLocale } = useI18n({
  en: {
    pageTitle: "Win a pair of AirPods Max",
    eyebrow: "Giveaway · Free to enter",
    titleA: "Win a pair of",
    titleB: "AirPods Max",
    conditionBadge: "If Tide wins {hackathon}",
    lead: "One condition, and we would rather you read it here than in the small print: the prize is awarded only if Tide wins the {hackathon} grand prize. If we win, one of you leaves with a pair of AirPods Max. Entry is free and takes about thirty seconds.",
    ctaPrimary: "Enter now",
    ctaSecondary: "See how entries work",
    viewerHint: "Drag to rotate",
    viewerLabel: "Apple AirPods Max, interactive 3D model",
    cdDays: "Days",
    cdHours: "Hours",
    cdMins: "Min",
    cdSecs: "Sec",
    cdLabel: "Entries close in",
    closedLabel: "Entries are closed",
    closedBody: "The draw is done. We reach the winner through the XRPL wallet they entered with.",
    condLabel: "The condition, in plain sight",
    condTitle: "We win, you win.",
    condBody: "Tide is competing in {hackathon}, the hackathon run by {org}. If our project takes the grand prize, we draw one of you and send a pair of AirPods Max. If it does not, no prize is awarded, and we would rather you know that before entering than after.",
    condWhy: "Why tie the two together?",
    condWhyBody: "Because a giveaway where nothing is at stake for us is just a lottery. Here we are asking you to back a project, and the project pays it forward if it wins. That is a fairer deal than pretending the outcome is already decided.",
    condOnlyGrand: "Grand prize only",
    condOnlyGrandBody: "A category prize, a special mention or a place on the podium do not trigger the award. Only the grand prize does. It is written that way in Article 3 so nobody has to guess.",
    condTiming: "When we will know",
    condTimingBody: "Entries close on {close}. The draw is held within {draw} days of {org} publishing the official results. No date is promised for those results, because we do not control the schedule.",
    condLoss: "If we do not win",
    condLossBody: "Your entries are kept and carried over to our next draw, if we hold one within {months} months. And the Tide account you created stays yours either way, free, with everything the platform does.",
    condRules: "Read Article 3",
    stepsLabel: "Three steps",
    stepsTitleA: "Thirty seconds,",
    stepsTitleB: "then you are in.",
    stepsLead: "The first two happen on X. The third one happens here, and it is the one that actually counts your entries.",
    step1Title: "Follow us on X",
    step1Body: "That is where the winner is announced. Nothing else to do there.",
    step1Cta: "Open @{handle}",
    step2Title: "Repost the announcement",
    step2Body: "It is how other people find out. We check this on the drawn winner only.",
    step3Title: "Connect your XRPL wallet",
    step3Body: "On Tide your wallet is your account. No email, no password, no deposit. Connect it once, enter your X handle below, and you are in.",
    step3Cta: "Connect my wallet",
    walletLabel: "New to XRPL?",
    walletTitle: "Your wallet is your account.",
    walletBody: "Tide has no sign-up form. You install an XRPL wallet, keep {reserve} XRP on it so the ledger recognises the account, and sign one connection request. That signature is what makes your entries belong to a real person we can reach.",
    walletXaman: "Xaman",
    walletXamanBody: "Mobile app, iOS and Android. The most common XRPL wallet, and the one we recommend if you are starting from zero.",
    walletGem: "GemWallet",
    walletGemBody: "Browser extension, if you would rather stay on your computer.",
    walletGet: "Get it",
    walletReserve: "Why {reserve} XRP?",
    walletReserveBody: "The XRP Ledger asks every account to hold a small base reserve to exist. It stays yours, it is not a fee and Tide never touches it.",
    entriesLabel: "Your entries",
    entriesTitle: "Every step counts more than the last.",
    entriesLead: "Your total is personal. Nobody else's number is shown here, and neither is the crowd's.",
    entriesYours: "Your entries",
    ruleWallet: "Connect your wallet",
    ruleWalletBody: "Xaman or GemWallet, with {reserve} XRP on it. This is what creates your Tide account and what we contact you through.",
    ruleWalletCta: "Connect my wallet",
    ruleTrade: "Make your first paper trade",
    ruleTradeBody: "Virtual capital on live market prices. No money involved, no deposit, nothing to lose.",
    ruleTradeCta: "Open the terminal",
    ruleTradeHint: "Never traded before? The guided tutorial walks you through it first.",
    ruleTradeHintCta: "Take the tutorial",
    ruleReferral: "Bring a friend",
    ruleReferralBody: "Per friend who connects a wallet and makes their first paper trade. Referral links open shortly. The rest of the entries are live right now.",
    rulePoints: "+{n} entries",
    rulePoint: "+{n} entry",
    ruleDone: "Earned",
    ruleSoon: "Opening soon",
    signedOutNote: "Connect a wallet to see your entries.",
    xHandleLabel: "Your X handle",
    xHandlePlaceholder: "your_handle",
    entrySave: "Save my entry",
    entrySaving: "Saving…",
    entrySaved: "Entry saved",
    prizeLabel: "The prize",
    prizeTitle: "Apple AirPods Max",
    prizeBody: "Over-ear, active noise cancellation, spatial audio. One pair, one winner, shipped to you. Colour depends on availability where you live.",
    prizeValue: "Indicative value",
    prizeValueAmount: "≈ $549",
    prizeUnit: "Winners",
    prizeUnitAmount: "01",
    prizeShip: "Shipping",
    prizeShipAmount: "On us",
    finalTitle: "Good luck",
    finalBody: "Thirty seconds to enter. Then a free account you get to keep whether or not you win.",
    finalCta: "Connect my wallet",
    finalSecondary: "Learn to trade first",
  },
  fr: {
    pageTitle: "Gagne une paire d'AirPods Max",
    eyebrow: "Tombola · Participation gratuite",
    titleA: "Gagne une paire d'",
    titleB: "AirPods Max",
    conditionBadge: "Si Tide gagne {hackathon}",
    lead: "Une condition, et on préfère que tu la lises ici plutôt que dans les petites lignes : le lot n'est attribué que si Tide remporte le grand prix {hackathon}. Si on gagne, l'un de vous repart avec une paire d'AirPods Max. La participation est gratuite et prend une trentaine de secondes.",
    ctaPrimary: "Participer",
    ctaSecondary: "Voir comment gagner des entrées",
    viewerHint: "Fais-le tourner",
    viewerLabel: "Apple AirPods Max, modèle 3D interactif",
    cdDays: "Jours",
    cdHours: "Heures",
    cdMins: "Min",
    cdSecs: "Sec",
    cdLabel: "Fin des participations dans",
    closedLabel: "Les participations sont closes",
    closedBody: "Le tirage a eu lieu. On joint le gagnant via le wallet XRPL avec lequel il a participé.",
    condLabel: "La condition, en clair",
    condTitle: "On gagne, tu gagnes.",
    condBody: "Tide est en compétition sur {hackathon}, le hackathon organisé par {org}. Si notre projet décroche le grand prix, on tire l'un de vous au sort et on envoie une paire d'AirPods Max. Sinon, aucun lot n'est attribué, et on préfère que tu le saches avant de participer plutôt qu'après.",
    condWhy: "Pourquoi lier les deux ?",
    condWhyBody: "Parce qu'un giveaway où on ne risque rien n'est qu'une loterie. Là, on te demande de soutenir un projet, et le projet renvoie l'ascenseur s'il gagne. C'est un marché plus honnête que de faire comme si le résultat était acquis.",
    condOnlyGrand: "Le grand prix, et lui seul",
    condOnlyGrandBody: "Un prix de catégorie, une mention spéciale ou une place sur le podium ne déclenchent pas l'attribution. Seul le grand prix la déclenche. C'est écrit ainsi à l'article 3 pour que personne n'ait à deviner.",
    condTiming: "Quand on saura",
    condTimingBody: "Les participations closent le {close}. Le tirage a lieu dans les {draw} jours suivant la publication des résultats officiels par {org}. Aucune date n'est promise pour ces résultats : on ne maîtrise pas ce calendrier.",
    condLoss: "Si on ne gagne pas",
    condLossBody: "Tes entrées sont conservées et reportées sur notre prochain tirage, si on en organise un dans les {months} mois. Et le compte Tide que tu as créé te reste, gratuitement, avec tout ce que fait la plateforme.",
    condRules: "Lire l'article 3",
    stepsLabel: "Trois étapes",
    stepsTitleA: "Trente secondes,",
    stepsTitleB: "et c'est fait.",
    stepsLead: "Les deux premières se passent sur X. La troisième se passe ici, et c'est elle qui compte réellement tes entrées.",
    step1Title: "Suis-nous sur X",
    step1Body: "C'est là que le gagnant est annoncé. Rien d'autre à y faire.",
    step1Cta: "Ouvrir @{handle}",
    step2Title: "Reposte l'annonce",
    step2Body: "C'est comme ça que les autres la découvrent. On ne le vérifie que sur le gagnant tiré.",
    step3Title: "Connecte ton wallet XRPL",
    step3Body: "Sur Tide, ton wallet est ton compte. Pas d'e-mail, pas de mot de passe, pas de dépôt. Connecte-le une fois, saisis ton handle X ci-dessous et tu participes.",
    step3Cta: "Connecter mon wallet",
    walletLabel: "Tu débutes sur XRPL ?",
    walletTitle: "Ton wallet est ton compte.",
    walletBody: "Tide n'a pas de formulaire d'inscription. Tu installes un wallet XRPL, tu gardes {reserve} XRP dessus pour que le registre reconnaisse ton compte, et tu signes une demande de connexion. C'est cette signature qui rattache tes entrées à quelqu'un de réel.",
    walletXaman: "Xaman",
    walletXamanBody: "Application mobile, iOS et Android. Le wallet XRPL le plus répandu, et celui qu'on conseille si tu pars de zéro.",
    walletGem: "GemWallet",
    walletGemBody: "Extension de navigateur, si tu préfères rester sur ton ordinateur.",
    walletGet: "Le télécharger",
    walletReserve: "Pourquoi {reserve} XRP ?",
    walletReserveBody: "Le XRP Ledger demande à chaque compte de garder une petite réserve de base pour exister. Elle reste à toi, ce n'est pas des frais et Tide n'y touche jamais.",
    entriesLabel: "Tes entrées",
    entriesTitle: "Chaque étape compte plus que la précédente.",
    entriesLead: "Ton total est personnel. Ni le chiffre des autres ni celui de la foule ne sont affichés ici.",
    entriesYours: "Tes entrées",
    ruleWallet: "Connecte ton wallet",
    ruleWalletBody: "Xaman ou GemWallet, avec {reserve} XRP dessus. C'est ce qui crée ton compte Tide, et c'est par là qu'on te contacte.",
    ruleWalletCta: "Connecter mon wallet",
    ruleTrade: "Passe ton premier trade paper",
    ruleTradeBody: "Du capital virtuel sur les vrais prix du marché. Aucun argent en jeu, aucun dépôt, rien à perdre.",
    ruleTradeCta: "Ouvrir le terminal",
    ruleTradeHint: "Jamais tradé ? Le tutoriel guidé te prend par la main d'abord.",
    ruleTradeHintCta: "Faire le tutoriel",
    ruleReferral: "Amène un ami",
    ruleReferralBody: "Par ami qui connecte un wallet et passe son premier trade paper. Les liens de parrainage ouvrent bientôt. Les autres entrées, elles, comptent déjà.",
    rulePoints: "+{n} entrées",
    rulePoint: "+{n} entrée",
    ruleDone: "Obtenue",
    ruleSoon: "Bientôt",
    signedOutNote: "Connecte un wallet pour voir tes entrées.",
    xHandleLabel: "Ton handle X",
    xHandlePlaceholder: "ton_handle",
    entrySave: "Enregistrer ma participation",
    entrySaving: "Enregistrement…",
    entrySaved: "Participation enregistrée",
    prizeLabel: "Le lot",
    prizeTitle: "Apple AirPods Max",
    prizeBody: "Circum-auriculaire, réduction de bruit active, audio spatial. Une paire, un gagnant, expédiée chez toi. La couleur dépend des disponibilités dans ton pays.",
    prizeValue: "Valeur indicative",
    prizeValueAmount: "≈ 579 €",
    prizeUnit: "Gagnants",
    prizeUnitAmount: "01",
    prizeShip: "Livraison",
    prizeShipAmount: "Offerte",
    finalTitle: "Bonne chance",
    finalBody: "Trente secondes pour participer. Et un compte gratuit que tu gardes, que tu gagnes ou non.",
    finalCta: "Connecter mon wallet",
    finalSecondary: "Apprendre à trader d'abord",
  },
});

const session = useSession();
const walletEntry = useWalletEntry();
const terms = useGiveawayTerms();
const giveaway = useGiveaway(props.client);
const { dd, hh, mm, ss, expired } = useCountdown({ until: GIVEAWAY_CLOSES_AT });

/** Clos par la date, ou par le rebours qui vient d'atteindre zéro à l'écran. */
const closed = computed(() => giveaway.closed.value || expired.value);

const reserve = String(XRPL_BASE_RESERVE_XRP);

const RULE_COPY: Record<GiveawayRuleId, { title: string; body: string }> = {
  wallet: { title: "ruleWallet", body: "ruleWalletBody" },
  first_trade: { title: "ruleTrade", body: "ruleTradeBody" },
  referral: { title: "ruleReferral", body: "ruleReferralBody" },
};

function ruleTitle(id: GiveawayRuleId): string {
  return t(RULE_COPY[id].title);
}

function ruleBody(id: GiveawayRuleId): string {
  return t(RULE_COPY[id].body, { reserve });
}

/** « +1 entrée » vs « +3 entrées » : l'accord se joue sur le poids de la règle. */
function ruleWeight(weight: number): string {
  return weight > 1 ? t("rulePoints", { n: weight }) : t("rulePoint", { n: weight });
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(intlLocale.value, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

const closeDate = computed(() => formatDate(GIVEAWAY_CLOSES_AT));

/**
 * Identité comptable à interroger. Sur Tide un compte EST un wallet XRPL
 * signé : sans wallet connecté il n'y a pas d'identité, donc rien à lire, et
 * surtout rien à créer au passage sur une page de campagne.
 */
function resolveUserId(): string {
  return session.userId.value.trim();
}

async function refresh(): Promise<void> {
  await giveaway.load(resolveUserId(), session.walletConnected.value);
}

/**
 * Ouvre le règlement et amène à l'article 3. Le règlement est replié par
 * défaut : un simple lien d'ancre ne défilerait pas vers un contenu fermé.
 */
function openCondition(): void {
  const doc = document.querySelector<HTMLDetailsElement>(".terms-doc");
  if (doc !== null) doc.open = true;
  document.getElementById("terms-condition")?.scrollIntoView({ block: "center" });
}

/**
 * Point d'entrée unique du funnel wallet, partagé avec la landing et l'app-bar.
 * Tant que le règlement n'est pas accepté, le bouton n'ouvre pas le wallet : il
 * emmène à la case à cocher et la met en évidence. On ne peut pas opposer une
 * condition suspensive à quelqu'un qui n'a jamais eu l'occasion de la refuser.
 */
function connectWallet(): void {
  if (!terms.accepted.value) {
    document.getElementById("terms")?.scrollIntoView({ block: "center" });
    document.querySelector<HTMLInputElement>(".terms-accept input")?.focus();
    return;
  }
  walletEntry.show();
}

const xHandle = giveaway.xHandle;
const savedEntry = computed(() => xHandle.value.trim() !== "" && giveaway.entries.value > 0);

async function saveEntry(): Promise<void> {
  if (!terms.accepted.value) {
    document.getElementById("terms")?.scrollIntoView({ block: "center" });
    document.querySelector<HTMLInputElement>(".terms-accept input")?.focus();
    return;
  }
  const userId = resolveUserId();
  if (userId === "" || giveaway.walletAddress.value === null) {
    walletEntry.show();
    return;
  }
  await giveaway.save(userId, TERMS_VERSION, xHandle.value);
}

function onPaperWalletChanged(): void {
  void refresh();
}

onMounted(() => {
  void refresh();
  window.addEventListener("tide:paper-wallet-changed", onPaperWalletChanged);
});

// Le wallet peut se connecter pendant que la page est ouverte (retour de Xaman,
// signature GemWallet) : les entrées se recalculent sans rechargement.
watch([session.userId, session.liveAddress], () => {
  void refresh();
});

onBeforeUnmount(() => {
  window.removeEventListener("tide:paper-wallet-changed", onPaperWalletChanged);
});

// `t()` lit `locale` : le titre se retraduit tout seul à la bascule de langue.
watchEffect(() => {
  document.title = `${t("pageTitle")} | TIDE`;
});
</script>

<template>
  <div class="page giveaway">
    <!-- HERO -->
    <header class="gw-hero rv" v-reveal>
      <div class="hero-copy">
        <p class="lab">{{ t("eyebrow") }}</p>
        <h1><span>{{ t("titleA") }}</span><em>{{ t("titleB") }}</em></h1>
        <p class="cond-badge">
          <span class="dot" aria-hidden="true"></span>
          {{ t("conditionBadge", { hackathon: MAKE_WAVES_NAME }) }}
        </p>
        <p class="hero-lead">{{ t("lead", { hackathon: MAKE_WAVES_NAME }) }}</p>

        <dl v-if="!closed" class="hero-count">
          <div><dt class="lab">{{ t("cdDays") }}</dt><dd class="mono">{{ dd }}</dd></div>
          <div><dt class="lab">{{ t("cdHours") }}</dt><dd class="mono">{{ hh }}</dd></div>
          <div><dt class="lab">{{ t("cdMins") }}</dt><dd class="mono">{{ mm }}</dd></div>
          <div><dt class="lab">{{ t("cdSecs") }}</dt><dd class="mono">{{ ss }}</dd></div>
        </dl>
        <p v-if="!closed" class="count-label lab">{{ t("cdLabel") }}</p>

        <div v-else class="gw-closed">
          <p class="lab">{{ t("closedLabel") }}</p>
          <p>{{ t("closedBody") }}</p>
        </div>

        <div v-if="!closed" class="hero-cta">
          <button type="button" class="pill" @click="connectWallet">{{ t("ctaPrimary") }}</button>
          <a class="pill ghost" href="#entries">{{ t("ctaSecondary") }}</a>
        </div>
      </div>

      <div class="hero-visual">
        <span class="hero-orbit orbit-one" aria-hidden="true"></span>
        <span class="hero-orbit orbit-two" aria-hidden="true"></span>
        <ProductViewer :src="modelUrl" :poster="posterUrl" :label="t('viewerLabel')">
          <template #hint>{{ t("viewerHint") }}</template>
        </ProductViewer>
      </div>
    </header>

    <!-- LA CONDITION. Placée avant les étapes, parce qu'annoncer un lot
         conditionnel sans dire la condition sur la face de la page relève de la
         pratique commerciale trompeuse. Elle n'est pas dans les petites lignes. -->
    <section class="gw-cond rv" v-reveal>
      <div class="cond-head">
        <p class="lab">{{ t("condLabel") }}</p>
        <h2>{{ t("condTitle") }}</h2>
        <p class="cond-lead">
          {{ t("condBody", { hackathon: MAKE_WAVES_NAME, org: MAKE_WAVES_ORGANISER }) }}
        </p>
        <div class="cond-links">
          <a class="cond-link" :href="MAKE_WAVES_URL" target="_blank" rel="noopener noreferrer">
            {{ MAKE_WAVES_ORGANISER }}
          </a>
          <button type="button" class="cond-link" @click="openCondition">
            {{ t("condRules") }}
          </button>
        </div>
      </div>
      <ul class="cond-grid">
        <li>
          <h3>{{ t("condOnlyGrand") }}</h3>
          <p>{{ t("condOnlyGrandBody") }}</p>
        </li>
        <li>
          <h3>{{ t("condTiming") }}</h3>
          <p>
            {{ t("condTimingBody", { close: closeDate, draw: DRAW_WINDOW_DAYS, org: MAKE_WAVES_ORGANISER }) }}
          </p>
        </li>
        <li>
          <h3>{{ t("condLoss") }}</h3>
          <p>{{ t("condLossBody", { months: CARRY_OVER_MONTHS }) }}</p>
        </li>
        <li>
          <h3>{{ t("condWhy") }}</h3>
          <p>{{ t("condWhyBody") }}</p>
        </li>
      </ul>
    </section>

    <!-- COMMENT PARTICIPER -->
    <section class="gw-steps">
      <div class="s-head rv" v-reveal>
        <div>
          <p class="lab">{{ t("stepsLabel") }}</p>
          <h2>{{ t("stepsTitleA") }}<br />{{ t("stepsTitleB") }}</h2>
        </div>
        <p>{{ t("stepsLead") }}</p>
      </div>

      <div class="step rv" v-reveal>
        <div class="n mono">/ 01</div>
        <div class="step-body">
          <h3>{{ t("step1Title") }}</h3>
          <p>{{ t("step1Body") }}</p>
        </div>
        <a class="step-cta" :href="GIVEAWAY_X_URL" target="_blank" rel="noopener noreferrer">
          {{ t("step1Cta", { handle: GIVEAWAY_X_HANDLE }) }}
        </a>
      </div>

      <div class="step rv" v-reveal>
        <div class="n mono">/ 02</div>
        <div class="step-body">
          <h3>{{ t("step2Title") }}</h3>
          <p>{{ t("step2Body") }}</p>
        </div>
      </div>

      <div class="step rv" v-reveal>
        <div class="n mono">/ 03</div>
        <div class="step-body">
          <h3>{{ t("step3Title") }}</h3>
          <p>{{ t("step3Body") }}</p>
        </div>
        <button type="button" class="step-cta as-button" @click="connectWallet">
          {{ t("step3Cta") }}
        </button>
      </div>
    </section>

    <!-- COMMENT ON CRÉE UN COMPTE (il n'y a pas de formulaire, c'est le sujet) -->
    <section class="gw-wallet rv" v-reveal>
      <span class="wallet-glow" aria-hidden="true"></span>
      <div class="wallet-copy">
        <p class="lab">{{ t("walletLabel") }}</p>
        <h2>{{ t("walletTitle") }}</h2>
        <p>{{ t("walletBody", { reserve }) }}</p>
        <div class="wallet-note">
          <h3>{{ t("walletReserve", { reserve }) }}</h3>
          <p>{{ t("walletReserveBody") }}</p>
        </div>
      </div>
      <ul class="wallet-apps">
        <li>
          <h3>{{ t("walletXaman") }}</h3>
          <p>{{ t("walletXamanBody") }}</p>
          <a :href="XAMAN_URL" target="_blank" rel="noopener noreferrer">{{ t("walletGet") }}</a>
        </li>
        <li>
          <h3>{{ t("walletGem") }}</h3>
          <p>{{ t("walletGemBody") }}</p>
          <a :href="GEMWALLET_URL" target="_blank" rel="noopener noreferrer">{{ t("walletGet") }}</a>
        </li>
      </ul>
    </section>

    <!-- TES ENTRÉES -->
    <section id="entries" class="gw-entries rv" v-reveal>
      <div class="entries-head">
        <div>
          <p class="lab">{{ t("entriesLabel") }}</p>
          <h2>{{ t("entriesTitle") }}</h2>
          <p class="entries-lead">{{ t("entriesLead") }}</p>
        </div>
        <!-- Compteur PERSONNEL uniquement. Aucun total global n'est rendu ici. -->
        <div class="entries-total">
          <span class="lab">{{ t("entriesYours") }}</span>
          <strong class="mono">{{ giveaway.entries.value }}</strong>
          <span v-if="!session.connected.value" class="entries-note">
            {{ t("signedOutNote") }}
          </span>
        </div>
      </div>

      <form v-if="session.connected.value" class="giveaway-entry" @submit.prevent="saveEntry">
        <label for="giveaway-x-handle">{{ t("xHandleLabel") }}</label>
        <div class="giveaway-entry__row">
          <span aria-hidden="true">@</span>
          <input
            id="giveaway-x-handle"
            v-model="xHandle"
            :placeholder="t('xHandlePlaceholder')"
            maxlength="15"
            pattern="[A-Za-z0-9_]{1,15}"
            autocomplete="off"
            required
          />
          <button
            v-if="giveaway.walletAddress.value !== null"
            type="submit"
            :disabled="giveaway.saving.value || closed"
          >{{ giveaway.saving.value ? t("entrySaving") : t("entrySave") }}</button>
          <button v-else type="button" @click="connectWallet">{{ t("ruleWalletCta") }}</button>
        </div>
        <p v-if="giveaway.error.value" class="giveaway-entry__error">{{ giveaway.error.value }}</p>
        <p v-else-if="savedEntry" class="giveaway-entry__saved">{{ t("entrySaved") }}</p>
      </form>

      <ul class="rule-list">
        <li
          v-for="rule in giveaway.rules.value"
          :key="rule.id"
          class="rule"
          :class="{ done: rule.done, pending: rule.pending }"
        >
          <span class="rule-weight mono">{{ ruleWeight(rule.weight) }}</span>
          <div class="rule-body">
            <h3>{{ ruleTitle(rule.id) }}</h3>
            <p>{{ ruleBody(rule.id) }}</p>
            <p v-if="rule.id === 'first_trade' && !rule.done" class="rule-hint">
              {{ t("ruleTradeHint") }}
              <a href="#/tutorial" @click.prevent="emit('navigate', '/tutorial')">{{ t("ruleTradeHintCta") }}</a>
            </p>
          </div>
          <div class="rule-state">
            <span v-if="rule.done" class="tick">{{ t("ruleDone") }}</span>
            <span v-else-if="rule.pending" class="soon">{{ t("ruleSoon") }}</span>
            <button
              v-else-if="rule.id === 'wallet'"
              type="button"
              class="rule-cta"
              @click="connectWallet"
            >
              {{ t("ruleWalletCta") }}
            </button>
            <a
              v-else
              class="rule-cta"
              href="#/dashboard"
              @click.prevent="emit('navigate', '/dashboard')"
            >
              {{ t("ruleTradeCta") }}
            </a>
          </div>
        </li>
      </ul>
    </section>

    <!-- LE LOT -->
    <section class="gw-prize rv" v-reveal>
      <div class="prize-copy">
        <p class="lab">{{ t("prizeLabel") }}</p>
        <h2>{{ t("prizeTitle") }}</h2>
        <p>{{ t("prizeBody") }}</p>
      </div>
      <dl class="prize-specs">
        <div><dt class="lab">{{ t("prizeValue") }}</dt><dd class="mono">{{ t("prizeValueAmount") }}</dd></div>
        <div><dt class="lab">{{ t("prizeUnit") }}</dt><dd class="mono">{{ t("prizeUnitAmount") }}</dd></div>
        <div><dt class="lab">{{ t("prizeShip") }}</dt><dd>{{ t("prizeShipAmount") }}</dd></div>
      </dl>
    </section>

    <!-- RÈGLEMENT COMPLET + ACCEPTATION -->
    <section id="terms" class="gw-rules rv" v-reveal>
      <TermsPanel />
    </section>

    <!-- CTA FINAL -->
    <section v-if="!closed" class="gw-final rv" v-reveal>
      <h2>{{ t("finalTitle") }}</h2>
      <p>{{ t("finalBody") }}</p>
      <div class="hero-cta center">
        <button type="button" class="pill" @click="connectWallet">{{ t("finalCta") }}</button>
        <a class="pill ghost" href="#/learn" @click.prevent="emit('navigate', '/learn')">{{ t("finalSecondary") }}</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.giveaway { display: grid; gap: 96px; padding-bottom: 110px; }

/* ---------- HERO ---------- */
.gw-hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(420px, .92fr); gap: 48px; align-items: center; min-height: 640px; padding: 64px; overflow: hidden; border: 1px solid var(--line2); border-radius: 30px; background: radial-gradient(circle at 78% 20%, rgba(79, 106, 255, .22), transparent 34%), var(--panel); }
.gw-hero::before { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(255, 255, 255, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .035) 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(90deg, #000, transparent 72%); }
.hero-copy { position: relative; z-index: 2; }
.hero-copy h1 { display: grid; margin: 18px 0 0; font-size: clamp(44px, 6.2vw, 92px); font-weight: 900; line-height: .84; letter-spacing: -.045em; text-transform: uppercase; }
.hero-copy h1 em { color: var(--blue); font-style: normal; }
.hero-lead { max-width: 480px; margin-top: 26px; font-size: 16px; line-height: 1.55; color: var(--soft); }

.hero-count { display: flex; max-width: 470px; margin-top: 40px; border-top: 1px solid var(--line2); }
.hero-count > div { min-width: 96px; margin-right: 22px; padding: 16px 22px 0 0; border-right: 1px solid var(--line2); }
.hero-count > div:last-child { margin-right: 0; border-right: 0; }
.hero-count dt { margin-bottom: 5px; }
.hero-count dd { font-size: 30px; font-weight: 700; letter-spacing: -.02em; color: var(--gold); }
.count-label { margin-top: 12px; }

.gw-closed { margin-top: 36px; padding: 22px 24px; border: 1px solid var(--line2); border-radius: 18px; background: var(--panel2); }
.gw-closed p:last-child { margin-top: 8px; font-size: 15px; line-height: 1.55; color: var(--soft); }

.hero-cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
.hero-cta.center { justify-content: center; }
.pill { display: inline-flex; align-items: center; gap: 10px; padding: 16px 30px; border: 1px solid transparent; border-radius: 100px; background: #fff; color: var(--panel); font-family: var(--disp); font-size: 16px; font-weight: 800; cursor: pointer; transition: transform .3s var(--ease), opacity .2s; }
.pill:hover { transform: translateY(-2px); }
.pill.ghost { background: transparent; border-color: var(--line3); color: var(--text); }
.pill.ghost:hover { border-color: var(--text); }

.hero-visual { position: relative; z-index: 1; display: grid; place-items: center; min-height: 460px; }
.hero-visual > * { grid-area: 1 / 1; }
.hero-orbit { width: 92%; aspect-ratio: 1; border: 1px solid rgba(125, 145, 255, .24); border-radius: 50%; }
.orbit-one { transform: rotate(16deg); }
.orbit-two { width: 66%; transform: rotate(-24deg); }

/* ---------- LA CONDITION ---------- */
.cond-badge { display: inline-flex; align-items: center; gap: 10px; margin-top: 22px; padding: 9px 16px; border: 1px solid var(--gold); border-radius: 100px; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); }
.cond-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); }

.gw-cond { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); gap: 56px; }
.cond-head h2 { margin-top: 16px; font-size: clamp(32px, 4.6vw, 62px); font-weight: 900; line-height: .94; letter-spacing: -.04em; text-transform: uppercase; }
.cond-lead { max-width: 520px; margin-top: 20px; font-size: 16px; line-height: 1.6; color: var(--soft); }
.cond-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.cond-link { display: inline-flex; background: transparent; color: var(--text); cursor: pointer; padding: 9px 18px; border: 1px solid var(--line3); border-radius: 100px; font-family: var(--disp); font-size: 13px; font-weight: 700; transition: background .2s, color .2s, border-color .2s; }
.cond-link:hover { background: #fff; border-color: #fff; color: var(--panel); }
.cond-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--line3); border-left: 1px solid var(--line3); list-style: none; }
.cond-grid li { padding: 26px; border-right: 1px solid var(--line3); border-bottom: 1px solid var(--line3); }
.cond-grid h3 { font-size: 16px; font-weight: 800; letter-spacing: -.01em; }
.cond-grid p { margin-top: 9px; font-size: 14px; line-height: 1.6; color: var(--soft); }

/* ---------- ÉTAPES ---------- */
.s-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; margin-bottom: 56px; }
.s-head > div:first-child h2 { margin-top: 14px; }
.s-head h2 { font-size: clamp(36px, 6vw, 84px); font-weight: 900; line-height: .9; letter-spacing: -.04em; text-transform: uppercase; }
.s-head > p { max-width: 320px; font-size: 15px; line-height: 1.55; color: var(--soft); text-align: right; }
.step { display: grid; grid-template-columns: 110px 1fr auto; gap: 36px; align-items: baseline; padding: 40px 0; border-top: 1px solid var(--line3); transition: padding-left .4s var(--ease); }
.step:last-child { border-bottom: 1px solid var(--line3); }
.step:hover { padding-left: 18px; }
.step .n { font-size: 14px; }
.step h3 { font-size: clamp(22px, 3vw, 38px); font-weight: 800; line-height: 1; letter-spacing: -.02em; text-transform: uppercase; }
.step p { max-width: 420px; margin-top: 12px; font-size: 15px; line-height: 1.55; color: var(--soft); }
.step-cta { align-self: center; padding: 11px 20px; border: 1px solid var(--line3); border-radius: 100px; font-family: var(--disp); font-size: 14px; font-weight: 700; white-space: nowrap; transition: border-color .2s, background .2s, color .2s; }
.step-cta:hover { border-color: #fff; }
.step-cta.as-button { background: transparent; color: var(--text); cursor: pointer; }
.step-cta.as-button:hover { background: #fff; color: var(--panel); }

/* ---------- WALLET = COMPTE ---------- */
.gw-wallet { position: relative; display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px; overflow: hidden; padding: 56px; border-radius: 22px; background: linear-gradient(135deg, var(--panel2), var(--panel)); }
.wallet-glow { position: absolute; top: -34%; left: -6%; width: 480px; height: 480px; border-radius: 50%; background: radial-gradient(circle, rgba(79, 106, 255, .4), transparent 60%); pointer-events: none; }
.wallet-copy { position: relative; z-index: 2; }
.wallet-copy h2 { margin: 16px 0 18px; font-size: clamp(28px, 3.6vw, 50px); font-weight: 900; line-height: .96; letter-spacing: -.035em; text-transform: uppercase; }
.wallet-copy > p { max-width: 520px; font-size: 15px; line-height: 1.6; color: var(--soft); }
.wallet-note { margin-top: 30px; padding: 20px 22px; border: 1px solid var(--line2); border-radius: 14px; }
.wallet-note h3 { font-size: 15px; font-weight: 800; letter-spacing: -.01em; }
.wallet-note p { margin-top: 7px; font-size: 14px; line-height: 1.55; color: var(--soft); }
.wallet-apps { position: relative; z-index: 2; display: grid; gap: 16px; align-content: center; list-style: none; }
.wallet-apps li { padding: 24px; border: 1px solid var(--line2); border-radius: 18px; background: rgba(255, 255, 255, .02); }
.wallet-apps h3 { font-size: 19px; font-weight: 800; letter-spacing: -.01em; }
.wallet-apps p { margin: 8px 0 14px; font-size: 14px; line-height: 1.55; color: var(--soft); }
.wallet-apps a { display: inline-flex; padding: 9px 18px; border: 1px solid var(--line3); border-radius: 100px; font-family: var(--disp); font-size: 13px; font-weight: 700; transition: background .2s, color .2s, border-color .2s; }
.wallet-apps a:hover { background: #fff; border-color: #fff; color: var(--panel); }

/* ---------- ENTRÉES ---------- */
.entries-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-bottom: 44px; flex-wrap: wrap; }
.entries-head h2 { max-width: 620px; margin-top: 16px; font-size: clamp(28px, 3.6vw, 50px); font-weight: 900; line-height: .96; letter-spacing: -.035em; text-transform: uppercase; }
.entries-lead { max-width: 520px; margin-top: 16px; font-size: 15px; line-height: 1.55; color: var(--soft); }
.entries-total { display: grid; justify-items: end; gap: 6px; text-align: right; }
.entries-total strong { font-size: clamp(52px, 8vw, 92px); font-weight: 700; line-height: .9; letter-spacing: -.04em; color: var(--gold); }
.entries-note { max-width: 240px; font-size: 13px; line-height: 1.45; color: var(--mut2); }
.giveaway-entry { display: grid; gap: 10px; max-width: 620px; margin-bottom: 30px; }
.giveaway-entry label { font: 11px var(--mono); text-transform: uppercase; letter-spacing: .1em; color: var(--soft); }
.giveaway-entry__row { display: flex; align-items: center; gap: 0; border: 1px solid var(--line3); border-radius: 12px; overflow: hidden; }
.giveaway-entry__row > span { padding-left: 14px; color: var(--mut2); font: 15px var(--mono); }
.giveaway-entry input { min-width: 0; flex: 1; padding: 13px 10px; border: 0; outline: 0; background: transparent; color: var(--text); font: 14px var(--mono); }
.giveaway-entry button { margin: 4px; padding: 10px 15px; border: 0; border-radius: 8px; background: var(--text); color: var(--panel); font-weight: 800; cursor: pointer; }
.giveaway-entry button:disabled { opacity: .5; cursor: wait; }
.giveaway-entry__error { color: #ff6b6b; font-size: 13px; }
.giveaway-entry__saved { color: var(--gold); font-size: 13px; }

.rule-list { display: grid; list-style: none; border-top: 1px solid var(--line3); }
.rule { display: grid; grid-template-columns: 130px 1fr auto; gap: 32px; align-items: center; padding: 30px 0; border-bottom: 1px solid var(--line3); }
.rule-weight { font-size: 16px; font-weight: 700; color: var(--gold); }
.rule h3 { font-size: 19px; font-weight: 800; letter-spacing: -.01em; }
.rule-body p { max-width: 560px; margin-top: 7px; font-size: 14px; line-height: 1.55; color: var(--soft); }
.rule-hint { color: var(--mut2) !important; }
.rule-hint a { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
.rule.pending .rule-weight { color: var(--mut2); }
.rule.pending h3 { color: var(--soft); }
.rule-state { display: flex; justify-content: flex-end; }
.rule-cta { padding: 11px 20px; border: 1px solid var(--line3); border-radius: 100px; background: transparent; color: var(--text); font-family: var(--disp); font-size: 14px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: background .2s, color .2s, border-color .2s; }
.rule-cta:hover { background: #fff; border-color: #fff; color: var(--panel); }
.tick { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--gold); }
.tick::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--gold); }
.soon { font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--mut2); white-space: nowrap; }

/* ---------- LOT ---------- */
.gw-prize { display: grid; grid-template-columns: 1.3fr 1fr; gap: 56px; align-items: center; padding: 48px 0; border-top: 1px solid var(--line3); border-bottom: 1px solid var(--line3); }
.prize-copy h2 { margin: 16px 0 18px; font-size: clamp(30px, 4vw, 54px); font-weight: 900; line-height: .94; letter-spacing: -.035em; text-transform: uppercase; }
.prize-copy > p { max-width: 520px; font-size: 15px; line-height: 1.6; color: var(--soft); }
.prize-specs { display: flex; flex-wrap: wrap; justify-content: flex-end; }
.prize-specs > div { min-width: 120px; padding: 0 24px; border-right: 1px solid var(--line2); }
.prize-specs > div:last-child { border-right: 0; padding-right: 0; }
.prize-specs dt { margin-bottom: 6px; }
.prize-specs dd { font-size: 20px; font-weight: 800; letter-spacing: -.02em; }


/* ---------- CTA FINAL ---------- */
.gw-final { text-align: center; padding: 30px 0 20px; }
.gw-final h2 { font-size: clamp(48px, 11vw, 170px); font-weight: 900; line-height: .84; letter-spacing: -.045em; text-transform: uppercase; }
.gw-final p { max-width: 460px; margin: 24px auto 0; font-size: 17px; line-height: 1.55; color: var(--soft); }

@media (max-width: 1120px) {
  .gw-hero { grid-template-columns: 1fr; padding: 44px 32px; }
  .hero-visual { order: -1; min-height: 340px; }
  .gw-wallet { grid-template-columns: 1fr; gap: 34px; padding: 40px 30px; }
  .gw-cond { grid-template-columns: 1fr; gap: 34px; }
  .gw-prize { grid-template-columns: 1fr; gap: 30px; }
  .prize-specs { justify-content: flex-start; }
  .prize-specs > div:first-child { padding-left: 0; }
}
@media (max-width: 820px) {
  .giveaway { gap: 72px; }
  .s-head { flex-direction: column; align-items: flex-start; }
  .s-head > p { text-align: left; }
  .step { grid-template-columns: 1fr; gap: 12px; }
  .step-cta { justify-self: start; }
  .rule { grid-template-columns: 1fr; gap: 14px; }
  .rule-state { justify-content: flex-start; }
  .cond-grid { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .gw-hero { padding: 32px 22px; }
  .hero-count { flex-wrap: wrap; }
  .hero-count > div { min-width: 72px; padding-right: 14px; margin-right: 14px; }
  .entries-total { justify-items: start; text-align: left; }
  .prize-specs > div { padding: 0 18px 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
  .rv { opacity: 1; transform: none; }
}
</style>
