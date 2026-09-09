<script setup lang="ts">
// Landing page — page d'accueil SPÉCIALE : elle n'utilise PAS l'app-bar global,
// elle rend sa propre barre supérieure (.bar) et ses propres tokens de couleurs
// (différents des tokens globaux). Le .grain global est déjà rendu par App.vue.
import { onMounted, onUnmounted, ref, nextTick, computed, watch } from 'vue'
import type { TideClient } from '@tide/client'
import { useSession } from '../composables/useSession'
import { useWalletEntry } from '../composables/useWalletEntry'
import { useI18n } from '../i18n/useI18n'
import LangToggle from '../components/LangToggle.vue'
import BrandMark from '../components/BrandMark.vue'
import { articlesByCategory } from '../data/learn'

const props = defineProps<{ client: TideClient }>()
const { userId, connected } = useSession()

const { t, locale, intlLocale } = useI18n({
  en: {
    soundOff: 'SOUND [OFF]',
    soundOn: 'SOUND [ON]',
    heroDesc: 'TIDE TEACHES YOU TO TRADE CRYPTO ON REAL MARKETS, WITH VIRTUAL MONEY, BEFORE YOU EVER RISK YOUR OWN.',
    seasonLive: 'XRPL MAINNET · LIVE',
    tradersCount: 'REAL MARKET DATA',
    join: 'Open app',
    heroTag: '[ LEARN · PRACTISE · THEN COMPETE ]',
    heroTitleL1: 'Learn to',
    heroTitleL2: 'Trade',
    demoWallet: 'Season leader',
    s04Return: 'S04 return · rank #{rank}',
    topTradersLive: 'Top traders — live',
    segSchool: 'School',
    segLeaderboard: 'Leaderboard',
    segCompetitions: 'Competitions',
    marqPractice: 'Practise',
    marqFakeMoney: 'Fake Money',
    marqRealSkill: 'Real Skill',
    manifestoLabel: 'The manifesto',
    manifestoP1: 'Nobody is born knowing how to read a chart. ',
    manifestoHighlight: 'So we teach you first, and let you practise for free.',
    manifestoP2: ' Sixteen lessons, a guided tutorial, and a $10,000 paper account on real crypto markets. No deposit, no KYC, and no real money involved while you learn.',
    stepsHeadL1: 'Three steps',
    stepsHeadL2: 'from zero',
    stepsLead: 'You start by understanding, not by depositing. The tutorial walks you through your first trade, click by click, and you can skip it whenever you want.',
    step1Title: 'Understand the basics',
    step1Body: 'Sixteen bilingual lessons: charts, order types, perpetuals, leverage, risk. Written for someone who has never placed a trade.',
    step2Title: 'Practise with fake money',
    step2Body: 'A guided sandbox running on live market data. Open a position, set a stop, watch it play out. No real money is involved at any point.',
    step3Title: 'Then compete',
    step3Body: 'When it clicks, take your paper account into competitions and settle the results on XRPL.',
    learnLabel: 'Tide School',
    learnHeadL1: 'Four tracks.',
    learnHeadL2: 'Sixteen lessons.',
    learnLead: 'A path that starts at "what is a market" and ends at running a strategy under pressure. Every lesson is free, bilingual, and finishes with a drill you can do straight away in the terminal.',
    learnCta: 'Start learning →',
    learnTrackLessons: '{n} lessons',
    learnTotal: '{n} lessons · 4 tracks · EN & FR',
    learnSideLabel: 'Guided tutorial',
    learnSideBody: 'Your first trade, explained click by click. Skippable at any time.',
    featureLabel: 'Explore Tide',
    featureTitle: 'Everything you need, in one place.',
    featureLearn: 'Learn',
    featureLearnBody: 'Sixteen lessons on charts, orders, perps, leverage and risk.',
    featureTrading: 'Trading',
    featureTradingBody: 'Paper spot and perpetual positions using real market data.',
    featurePortfolio: 'Portfolio',
    featurePortfolioBody: 'Persisted balances, open positions and real PnL.',
    featureLeaderboard: 'Leaderboard',
    featureLeaderboardBody: 'Ranks computed from persisted backend performance.',
    featureCompetitions: 'Competitions',
    featureCompetitionsBody: 'Verified XRP entry pools and on-chain payouts.',
    featureArena: 'AI Arena',
    featureArenaBody: 'Agent strategies under identical constraints. Opens when a real competition runs.',
    ctaHeadL1: 'Start with',
    ctaHeadL2: 'lesson one',
    ctaP: 'Free, bilingual, and no wallet needed. You connect one later, only when you want to act on-chain.',
    ctaBtn: 'Open Tide School →',
    ctaBtn2: 'Create a free account',
    footerTagline: 'Learn to trade crypto on real markets with virtual money. Then prove it on-chain.',
    colProduct: 'Product',
    colResources: 'Resources',
    linkTerminal: 'Terminal',
    linkLeaderboard: 'Leaderboard',
    linkCompetitions: 'Competitions',
    linkSchool: 'Tide School',
    linkDocumentation: 'First lesson',
    linkGiveaway: 'AirPods Max giveaway',
    copyright: '© 2026 TIDE LABS — BUILT ON-CHAIN',
    disclaimer: 'PAPER TRADING INVOLVES NO REAL CAPITAL',
  },
  fr: {
    soundOff: 'SON [OFF]',
    soundOn: 'SON [ON]',
    heroDesc: "TIDE T'APPREND À TRADER LA CRYPTO SUR DE VRAIS MARCHÉS, AVEC DE L'ARGENT VIRTUEL, AVANT DE RISQUER LE TIEN.",
    seasonLive: 'XRPL MAINNET · LIVE',
    tradersCount: 'DONNÉES DE MARCHÉ RÉELLES',
    join: "Ouvrir l'app",
    heroTag: "[ APPRENDRE · S'ENTRAÎNER · PUIS CONCOURIR ]",
    // Pas d'accent en tête de 2e ligne : `line-height: .84` + `.gl{overflow:hidden}`
    // (l'animation de montée) rognent un « À » qui déborde sur la ligne du dessus.
    heroTitleL1: 'Apprendre',
    heroTitleL2: 'le trading',
    demoWallet: 'Meilleur trader',
    s04Return: 'Rendement S04 · rang #{rank}',
    topTradersLive: 'Top traders — live',
    segSchool: 'École',
    segLeaderboard: 'Classement',
    segCompetitions: 'Compétitions',
    marqPractice: 'Entraînement',
    marqFakeMoney: 'Argent Fictif',
    marqRealSkill: 'Vraie Compétence',
    manifestoLabel: 'Le manifeste',
    manifestoP1: 'Personne ne naît en sachant lire un graphique. ',
    manifestoHighlight: "Alors on te l'apprend d'abord, et on te laisse t'entraîner gratuitement.",
    manifestoP2: " Seize leçons, un tutoriel guidé, et un compte paper de $10 000 sur de vrais marchés crypto. Pas de dépôt, pas de KYC, et aucun argent réel pendant que tu apprends.",
    stepsHeadL1: 'Trois étapes',
    stepsHeadL2: 'en partant de zéro',
    stepsLead: "Tu commences par comprendre, pas par déposer. Le tutoriel t'accompagne clic par clic sur ton premier trade, et tu peux le passer quand tu veux.",
    step1Title: 'Comprendre les bases',
    step1Body: "Seize leçons bilingues : graphiques, types d'ordres, perpétuels, levier, risque. Écrites pour quelqu'un qui n'a jamais passé un ordre.",
    step2Title: "S'entraîner en argent fictif",
    step2Body: "Un bac à sable guidé branché sur les données de marché en direct. Ouvre une position, pose un stop, regarde ce que ça donne. Aucun argent réel n'entre en jeu.",
    step3Title: 'Puis concourir',
    step3Body: 'Quand le déclic est là, emmène ton compte paper en compétition et fais régler les résultats sur XRPL.',
    learnLabel: 'Tide School',
    learnHeadL1: 'Quatre pistes.',
    learnHeadL2: 'Seize leçons.',
    learnLead: "Un parcours qui part de « c'est quoi un marché » et va jusqu'à tenir une stratégie sous pression. Chaque leçon est gratuite, bilingue, et se termine par un exercice à faire tout de suite dans le terminal.",
    learnCta: 'Commencer à apprendre →',
    learnTrackLessons: '{n} leçons',
    learnTotal: '{n} leçons · 4 pistes · EN & FR',
    learnSideLabel: 'Tutoriel guidé',
    learnSideBody: 'Ton premier trade, expliqué clic par clic. Passable à tout moment.',
    featureLabel: 'Explorer Tide',
    featureTitle: "Tout ce qu'il te faut, au même endroit.",
    featureLearn: 'Apprendre',
    featureLearnBody: "Seize leçons sur les graphiques, les ordres, les perps, le levier et le risque.",
    featureTrading: 'Trading',
    featureTradingBody: 'Spot et perp Paper basés sur de vraies données de marché.',
    featurePortfolio: 'Portefeuille',
    featurePortfolioBody: 'Soldes persistés, positions ouvertes et PnL réel.',
    featureLeaderboard: 'Classement',
    featureLeaderboardBody: 'Rangs calculés depuis les performances persistées du backend.',
    featureCompetitions: 'Compétitions',
    featureCompetitionsBody: 'Pools de tickets XRP vérifiés et paiements on-chain.',
    featureArena: 'Arène IA',
    featureArenaBody: "Stratégies d'agents sous contraintes identiques. Ouvre quand une vraie compétition tourne.",
    ctaHeadL1: 'Commence par',
    ctaHeadL2: 'la première leçon',
    ctaP: "Gratuit, bilingue, et sans wallet. Tu en connectes un plus tard, seulement quand tu veux agir on-chain.",
    ctaBtn: 'Ouvrir Tide School →',
    ctaBtn2: 'Créer un compte gratuit',
    footerTagline: "Apprends à trader la crypto sur de vrais marchés avec de l'argent virtuel. Puis prouve-le on-chain.",
    colProduct: 'Produit',
    colResources: 'Ressources',
    linkTerminal: 'Terminal',
    linkLeaderboard: 'Classement',
    linkCompetitions: 'Compétitions',
    linkSchool: 'Tide School',
    linkDocumentation: 'Première leçon',
    linkGiveaway: 'Tombola AirPods Max',
    copyright: '© 2026 TIDE LABS — CONSTRUIT ON-CHAIN',
    disclaimer: "LE PAPER TRADING N'IMPLIQUE AUCUN CAPITAL RÉEL",
  },
})

const emit = defineEmits<{ navigate: [path: string] }>()
const walletEntry = useWalletEntry()
function goDashboard(): void {
  emit('navigate', '/dashboard')
}

// Le CTA de la landing ouvre le même choix central que le dashboard : créer
// un wallet Paper ou connecter Xaman/GemWallet.
function connectWallet(): void {
  walletEntry.show()
}

// Bascule du son (pas d'audio embarqué : reflète juste l'état dans le bandeau).
const soundOn = ref<boolean>(false)
function toggleSound(): void {
  soundOn.value = !soundOn.value
}

// État de chargement : déclenche l'animation de montée du hero (.gl>span).
const loaded = ref<boolean>(false)

// Horloges live (Paris / New York), rafraîchies toutes les 10 s.
const t1 = ref<string>('--:--')
const t2 = ref<string>('--:--')

// Contrôle segmenté (École / Classement / Compétitions).
const active = ref<number>(0)
const segButtons = ref<Array<HTMLButtonElement | null>>([null, null, null])
const indicator = ref<HTMLSpanElement | null>(null)
const segLabels = computed(
  () => [t('segSchool'), t('segLeaderboard'), t('segCompetitions')] as const,
)
// Chaque onglet renvoie vers sa page réelle (sinon le contrôle ne ferait rien).
const SEG_ROUTES = ['/learn', '/leaderboard', '/competitions'] as const
// L'apprentissage passe en tête : c'est la promesse d'entrée du produit.
const featureLinks = computed(() => [
  { path: '/learn', title: t('featureLearn'), body: t('featureLearnBody') },
  { path: '/dashboard', title: t('featureTrading'), body: t('featureTradingBody') },
  { path: '/portfolio', title: t('featurePortfolio'), body: t('featurePortfolioBody') },
  { path: '/leaderboard', title: t('featureLeaderboard'), body: t('featureLeaderboardBody') },
  { path: '/competitions', title: t('featureCompetitions'), body: t('featureCompetitionsBody') },
  { path: '/arena', title: t('featureArena'), body: t('featureArenaBody') },
])

// Les quatre pistes du cursus, dérivées du contenu réel (aucun chiffre en dur,
// aucun appel réseau) : la section École affiche ce que `data/learn` contient.
const learnTracks = computed(() =>
  articlesByCategory(locale.value).map((group) => ({
    id: group.id,
    label: group.label,
    count: group.articles.length,
  })),
)
const learnLessonCount = computed(() =>
  learnTracks.value.reduce((total, track) => total + track.count, 0),
)

// ---- Vitrine live : top traders + leader de saison (vraies données API) ----
const START_EQUITY = 10_000

interface LandRow {
  rank: number
  name: string
  ret: string
  me: boolean
}

function toReturn(equity: number): string {
  const r = ((equity - START_EQUITY) / START_EQUITY) * 100
  return (r >= 0 ? '+' : '') + r.toFixed(1) + '%'
}

const board = ref<LandRow[]>([])
const leader = ref<{ name: string; equity: string; ret: string; rank: number } | null>(null)

async function loadBoard(): Promise<void> {
  try {
    const entries = await props.client.leaderboard()
    board.value = entries.slice(0, 4).map((e) => ({
      rank: e.rank,
      name: e.userId,
      ret: toReturn(e.equity),
      me: false,
    }))
    const top = entries[0]
    leader.value =
      top !== undefined
        ? {
            name: top.userId,
            equity: '$' + Math.round(top.equity).toLocaleString('en-US'),
            ret: toReturn(top.equity),
            rank: top.rank,
          }
        : null
    if (connected.value) {
      const mine = entries.find((e) => e.userId === userId.value)
      if (mine !== undefined) {
        board.value = [
          ...board.value,
          { rank: mine.rank, name: userId.value, ret: toReturn(mine.equity), me: true },
        ]
      }
    }
  } catch {
    // API indisponible : la vitrine reste vide (dégradation propre).
  }
}

let clockTimer: ReturnType<typeof setInterval> | undefined
let loadFallback: ReturnType<typeof setTimeout> | undefined

// Met à jour la position/largeur de l'indicateur glissant sur le bouton actif.
function moveIndicator(): void {
  const btn = segButtons.value[active.value]
  const ind = indicator.value
  if (!btn || !ind) return
  ind.style.width = `${btn.offsetWidth}px`
  ind.style.transform = `translateX(${btn.offsetLeft - 5}px)`
}

function selectSeg(i: number): void {
  active.value = i
  moveIndicator()
  emit('navigate', SEG_ROUTES[i] ?? '/dashboard')
}

// Met à jour les deux horloges via Intl.DateTimeFormat (fr-FR).
function updateClocks(): void {
  try {
    const fmt = (tz: string): string =>
      new Intl.DateTimeFormat(intlLocale.value, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz,
      }).format(new Date())
    t1.value = fmt('Europe/Paris')
    t2.value = fmt('America/New_York')
  } catch {
    /* certains environnements n'exposent pas les fuseaux : on ignore */
  }
}

function onResize(): void {
  moveIndicator()
}

// Rafraîchit les horloges quand la langue change (le format Intl dépend de la locale).
watch(locale, updateClocks)

onMounted(() => {
  loaded.value = true
  loadFallback = setTimeout(() => {
    loaded.value = true
  }, 350)

  updateClocks()
  clockTimer = setInterval(updateClocks, 10000)
  void loadBoard()

  // Recalcule l'indicateur après le rendu (et avec un léger délai, comme la source).
  void nextTick(() => moveIndicator())
  setTimeout(moveIndicator, 400)

  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  if (clockTimer !== undefined) clearInterval(clockTimer)
  if (loadFallback !== undefined) clearTimeout(loadFallback)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <section class="landing" :class="{ loaded }">
    <!-- TOP BAR -->
    <div class="bar">
      <div class="wrap bar-in">
        <div class="brand">
          <span class="mark"><BrandMark /></span>
          <span class="partner">TIDE</span>
        </div>
        <div class="bar-grp">
          <button type="button" class="snd lab" :class="{ on: soundOn }" @click="toggleSound"><span class="dots"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span> {{ soundOn ? t('soundOn') : t('soundOff') }}</button>
          <div class="desc lab soft">{{ t('heroDesc') }}</div>
          <div class="loc lab">
            <div><span class="pin"></span> {{ t('seasonLive') }} <span class="t">{{ t1 }}</span></div>
            <div><span class="pin dim"></span> <span class="soft">{{ t('tradersCount') }}</span> <span class="t soft">{{ t2 }}</span></div>
          </div>
        </div>
        <div class="bar-cta">
          <LangToggle variant="dark" />
          <a href="#" class="pill-cta" @click.prevent="goDashboard">{{ t('join') }}</a>
        </div>
      </div>
    </div>

    <!-- HERO -->
    <header class="hero">
      <div class="wrap">
        <div class="h-tag lab soft rv" v-reveal>{{ t('heroTag') }}</div>
        <h1 class="giant">
          <span class="gl"><span>{{ t('heroTitleL1') }}</span></span>
          <span class="gl"><span>{{ t('heroTitleL2') }}</span></span>
        </h1>
        <!-- DARK SCREEN -->
        <div class="screen rv" v-reveal>
          <div class="scr-grid">
            <div>
              <div class="scr-head">
                <div class="acct">{{ t('demoWallet') }}<b>{{ leader ? leader.name : '—' }}</b></div>
                <div class="scr-live"><i></i> LIVE</div>
              </div>
              <div class="scr-balrow"><div class="scr-bal">{{ leader ? leader.equity : '—' }}</div><div class="scr-chip">{{ leader ? leader.ret : '' }}</div></div>
              <div class="lab soft">{{ t('s04Return', { rank: leader ? leader.rank : '—' }) }}</div>
              <div class="chart">
                <svg viewBox="0 0 420 170" preserveAspectRatio="none">
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BFF6CE" stop-opacity=".26" /><stop offset="100%" stop-color="#BFF6CE" stop-opacity="0" /></linearGradient></defs>
                  <path class="fp" fill="url(#g)" d="M0,132 L30,124 L60,134 L90,104 L120,112 L150,82 L180,92 L210,62 L240,70 L270,40 L300,50 L330,24 L360,32 L390,12 L420,6 L420,170 L0,170 Z" />
                  <path class="ln" d="M0,132 L30,124 L60,134 L90,104 L120,112 L150,82 L180,92 L210,62 L240,70 L270,40 L300,50 L330,24 L360,32 L390,12 L420,6" />
                </svg>
              </div>
            </div>
            <div class="scr-board">
              <div class="blab">{{ t('topTradersLive') }}</div>
              <div
                v-for="(r, i) in board"
                :key="r.name"
                class="brow"
                :class="{ t1: i === 0 && !r.me, me: r.me }"
              >
                <div class="rk">{{ r.rank }}</div>
                <div class="nm">{{ r.name }}<span></span></div>
                <div class="pl">{{ r.ret }}</div>
              </div>
            </div>
          </div>
          <div class="seg">
            <span ref="indicator" class="ind"></span>
            <button
              v-for="(label, i) in segLabels"
              :key="label"
              :ref="(el) => { segButtons[i] = el as HTMLButtonElement | null }"
              :class="{ act: active === i }"
              @click="selectSeg(i)"
            >{{ label }}</button>
          </div>
        </div>
      </div>
    </header>

    <!-- MARQUEE -->
    <div class="marq">
      <div class="marq-tr">
        <span>Tide School</span><i>✕</i><span class="out">{{ t('marqPractice') }}</span><i>✕</i><span>On-chain</span><i>✕</i><span class="out">{{ t('marqFakeMoney') }}</span><i>✕</i><span>{{ t('marqRealSkill') }}</span><i>✕</i>
        <span>Tide School</span><i>✕</i><span class="out">{{ t('marqPractice') }}</span><i>✕</i><span>On-chain</span><i>✕</i><span class="out">{{ t('marqFakeMoney') }}</span><i>✕</i><span>{{ t('marqRealSkill') }}</span><i>✕</i>
      </div>
    </div>

    <!-- MANIFESTO -->
    <section class="mani" id="manifeste">
      <div class="wrap">
        <span class="lab rv" v-reveal>{{ t('manifestoLabel') }}</span>
        <h2 class="rv" v-reveal>{{ t('manifestoP1') }}<span class="d">{{ t('manifestoHighlight') }}</span>{{ t('manifestoP2') }}</h2>
      </div>
    </section>

    <!-- STEPS -->
    <section class="steps" id="fonctionnement">
      <div class="wrap">
        <div class="s-head rv" v-reveal>
          <h2>{{ t('stepsHeadL1') }}<br />{{ t('stepsHeadL2') }}</h2>
          <p>{{ t('stepsLead') }}</p>
        </div>
        <div class="step rv" v-reveal><div class="n">/ 01</div><h3>{{ t('step1Title') }}</h3><p>{{ t('step1Body') }}</p></div>
        <div class="step rv" v-reveal><div class="n">/ 02</div><h3>{{ t('step2Title') }}</h3><p>{{ t('step2Body') }}</p></div>
        <div class="step rv" v-reveal><div class="n">/ 03</div><h3>{{ t('step3Title') }}</h3><p>{{ t('step3Body') }}</p></div>
      </div>
    </section>

    <!-- TIDE SCHOOL — la section pleine largeur du produit : c'est la promesse
         d'entrée. Les pistes et le nombre de leçons sont dérivés de data/learn,
         donc aucun chiffre en dur ne peut mentir sur le contenu réel. -->
    <section class="ai-sec" id="school">
      <div class="wrap">
        <div class="ai rv" v-reveal>
          <div class="ai-glow"></div>
          <div class="ai-main">
            <span class="lab">{{ t('learnLabel') }}</span>
            <h2>{{ t('learnHeadL1') }}<br /><span class="d">{{ t('learnHeadL2') }}</span></h2>
            <p>{{ t('learnLead') }}</p>
            <a href="#/learn" class="big-pill" @click.prevent="emit('navigate', '/learn')">{{ t('learnCta') }}</a>
            <div class="ai-specs">
              <span v-for="track in learnTracks" :key="track.id" class="ai-chip mono">
                {{ track.label }} · {{ t('learnTrackLessons', { n: track.count }) }}
              </span>
            </div>
          </div>
          <div class="ai-side">
            <a class="ai-product" href="#/tutorial" @click.prevent="emit('navigate', '/tutorial')">
              <span class="lab">{{ t('learnSideLabel') }}</span>
              <strong>{{ t('learnSideBody') }}</strong>
              <i>→</i>
            </a>
            <p class="ai-total mono">{{ t('learnTotal', { n: learnLessonCount }) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- PRODUCT FEATURES -->
    <section class="features-sec" id="features">
      <div class="wrap">
        <div class="feature-head rv" v-reveal>
          <span class="lab soft">{{ t('featureLabel') }}</span>
          <h2>{{ t('featureTitle') }}</h2>
        </div>
        <div class="feature-grid rv" v-reveal>
          <a
            v-for="feature in featureLinks"
            :key="feature.path"
            class="feature-card"
            :href="`#${feature.path}`"
            @click.prevent="emit('navigate', feature.path)"
          >
            <span class="lab">{{ feature.title }}</span>
            <strong>{{ feature.body }}</strong>
            <i>→</i>
          </a>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta" id="saison">
      <div class="wrap">
        <h2 class="rv" v-reveal>{{ t('ctaHeadL1') }}<br />{{ t('ctaHeadL2') }}</h2>
        <p class="rv" v-reveal>{{ t('ctaP') }}</p>
        <!-- Le bouton secondaire garde `walletEntry.show()` : c'est le seul point
             d'entrée du funnel wallet Paper sur la landing, il ne doit pas
             disparaître avec le repositionnement. -->
        <div class="cta-actions rv" v-reveal>
          <a href="#/learn" class="big-pill" @click.prevent="emit('navigate', '/learn')">{{ t('ctaBtn') }}</a>
          <a href="#" class="big-pill ghost" @click.prevent="connectWallet">{{ t('ctaBtn2') }}</a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer>
      <div class="wrap">
        <div class="f-top">
          <div class="f-brand">
            <div class="brand"><span class="mark"><BrandMark /></span><span class="partner">TIDE</span></div>
            <p>{{ t('footerTagline') }}</p>
          </div>
          <div class="f-cols">
            <div class="f-col">
              <h4>{{ t('colProduct') }}</h4>
              <a href="#/dashboard" @click.prevent="emit('navigate', '/dashboard')">{{ t('linkTerminal') }}</a>
              <a href="#/leaderboard" @click.prevent="emit('navigate', '/leaderboard')">{{ t('linkLeaderboard') }}</a>
              <a href="#/competitions" @click.prevent="emit('navigate', '/competitions')">{{ t('linkCompetitions') }}</a>
            </div>
            <div class="f-col">
              <h4>{{ t('colResources') }}</h4>
              <a href="#/learn" @click.prevent="emit('navigate', '/learn')">{{ t('linkSchool') }}</a>
              <a href="#/learn/what-is-trading" @click.prevent="emit('navigate', '/learn/what-is-trading')">{{ t('linkDocumentation') }}</a>
              <a href="#/giveaway" @click.prevent="emit('navigate', '/giveaway')">{{ t('linkGiveaway') }}</a>
            </div>
          </div>
        </div>
        <div class="f-big">TIDE</div>
        <div class="f-bottom">
          <span>{{ t('copyright') }}</span>
          <span>{{ t('disclaimer') }}</span>
        </div>
      </div>
    </footer>
  </section>
</template>

<style scoped>
/* Plus de tokens locaux : la landing hérite de styles/tokens.css, source de
 * vérité unique (cf. docs/BRAND.md). Les anciens alias locaux --ink/--ink2/
 * --white/--hair sont devenus --panel/--panel2/--text/--line3. */
.landing {
  color: var(--text);
  font-family: var(--disp);
  line-height: 1.4;
}

/* NB : pas de `color:inherit` ici — il écraserait .pill-cta/.big-pill (texte
 * blanc invisible sur fond blanc). La règle globale a{color:inherit} de base.css
 * (spécificité plus faible) suffit, et laisse les boutons imposer leur couleur. */
.landing a { text-decoration: none; }

.wrap { max-width: 1500px; margin: 0 auto; padding: 0 40px; }
@media (max-width: 680px) { .wrap { padding: 0 20px; } }
.mono { font-family: var(--mono); }
.soft { color: var(--soft); }

.rv { opacity: 0; transform: translateY(26px); transition: opacity .9s var(--ease), transform .9s var(--ease); }
.rv.in { opacity: 1; transform: none; }

/* ---------- TOP BAR ---------- */
.bar { padding: 16px 0 22px; }
.bar-in { display: flex; align-items: flex-start; justify-content: space-between; gap: 30px; }
.brand { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.mark { width: 42px; height: 42px; border: 2px solid #fff; border-radius: 11px; display: grid; place-items: center; }
.mark img { width: 32px; height: 32px; object-fit: contain; }
.partner { font-weight: 700; font-size: 22px; letter-spacing: -.02em; }
.bar-grp { display: flex; gap: 46px; align-items: flex-start; padding-top: 5px; }
.snd { display: flex; align-items: center; gap: 9px; cursor: pointer; border: none; background: none; font: inherit; color: inherit; padding: 0; }
.snd.on .dots i { background: var(--blue); }
.dots { display: grid; grid-template-columns: repeat(3, 2px); grid-template-rows: repeat(3, 2px); gap: 1.5px; }
.dots i { width: 2px; height: 2px; background: #fff; display: block; }
.desc { max-width: 280px; }
.loc div { display: flex; gap: 14px; align-items: center; }
.loc .pin { width: 7px; height: 7px; border-radius: 50%; background: #fff; flex-shrink: 0; }
.loc .pin.dim { background: var(--soft); }
.loc .t { margin-left: auto; min-width: 96px; text-align: right; }
.bar-cta { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.pill-cta { flex-shrink: 0; background: #fff; color: var(--panel); font-weight: 700; font-size: 15px; border-radius: 100px; padding: 14px 26px; transition: transform .3s var(--ease); }
@media (max-width: 1100px) { .bar-grp { display: none; } }

/* ---------- HERO ---------- */
.hero { padding-top: 30px; }
.h-tag { text-align: center; margin-bottom: 18px; }
.giant { text-align: center; font-weight: 900; text-transform: uppercase; letter-spacing: -.035em; line-height: .86; font-size: clamp(54px, 12.4vw, 210px); }
.gl { overflow: hidden; }
.gl > span { display: block; transform: translateY(110%); transition: transform 1.05s var(--ease); }
.landing.loaded .gl > span { transform: none; }
.gl:nth-child(2) > span { transition-delay: .08s; }

/* ---------- DARK SCREEN ---------- */
.screen { position: relative; background: var(--panel); border-radius: 22px; overflow: hidden; padding: 40px 40px 96px; min-height: 560px; margin-top: 56px; }
.scr-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; }
@media (max-width: 900px) { .scr-grid { grid-template-columns: 1fr; gap: 40px; } .screen { padding: 28px 24px 100px; } }
.scr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
.scr-head .acct { font-size: 14px; color: var(--soft); }
.scr-head .acct b { color: #fff; font-weight: 700; display: block; margin-top: 2px; font-size: 16px; }
.scr-live { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; color: var(--up); }
.scr-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--up); box-shadow: 0 0 10px var(--up); animation: bl 1.5s infinite; }
@keyframes bl { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
.scr-bal { font-family: var(--mono); font-size: clamp(40px, 5vw, 58px); font-weight: 700; letter-spacing: -.03em; line-height: 1; }
.scr-balrow { display: flex; align-items: baseline; gap: 16px; margin: 6px 0 4px; }
.scr-chip { font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--up); }
.chart { margin: 26px -8px 0; height: 170px; }
.chart svg { width: 100%; height: 100%; display: block; overflow: visible; }
.chart .ln { fill: none; stroke: var(--up); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1600; stroke-dashoffset: 1600; transition: stroke-dashoffset 2.6s var(--ease) .3s; }
.screen.in .chart .ln { stroke-dashoffset: 0; }
.chart .fp { opacity: 0; transition: opacity 1.2s ease 1.7s; }
.screen.in .chart .fp { opacity: 1; }

.scr-board .blab { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--soft); margin-bottom: 8px; }
.brow { display: grid; grid-template-columns: 30px 1fr auto; gap: 16px; align-items: center; padding: 15px 0; border-top: 1px solid rgba(255, 255, 255, .1); }
.brow .rk { font-family: var(--mono); font-weight: 700; font-size: 15px; color: var(--soft); }
.brow.t1 .rk { color: var(--up); }
.brow .nm { font-weight: 700; font-size: 15px; }
.brow .nm span { display: block; font-family: var(--mono); font-size: 11px; color: var(--soft); font-weight: 400; margin-top: 2px; }
.brow .pl { font-family: var(--mono); font-weight: 700; font-size: 15px; color: var(--up); text-align: right; }
.brow.me { color: var(--blue); }
.brow.me .nm, .brow.me .pl, .brow.me .rk { color: #9db4ff; }

/* segmented nav */
.seg { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%); display: flex; background: rgba(255, 255, 255, .12); backdrop-filter: blur(10px); border-radius: 100px; padding: 5px; z-index: 3; }
.seg .ind { position: absolute; top: 5px; left: 5px; height: calc(100% - 10px); background: #fff; border-radius: 100px; transition: transform .4s var(--ease), width .4s var(--ease); z-index: 0; }
.seg button { position: relative; z-index: 1; border: none; background: none; font-family: var(--disp); font-weight: 700; font-size: 15px; color: var(--soft); padding: 11px 26px; border-radius: 100px; cursor: pointer; transition: color .3s; white-space: nowrap; }
.seg button.act { color: var(--panel); }

/* ---------- MARQUEE ---------- */
.marq { border-top: 1px solid var(--line3); border-bottom: 1px solid var(--line3); overflow: hidden; white-space: nowrap; padding: 20px 0; margin-top: 70px; }
.marq-tr { display: inline-flex; align-items: center; gap: 34px; animation: scr 30s linear infinite; }
.marq-tr span { font-weight: 900; text-transform: uppercase; font-size: clamp(28px, 4.6vw, 58px); letter-spacing: -.03em; }
.marq-tr span.out { -webkit-text-stroke: 1.5px #fff; color: transparent; }
.marq-tr i { font-style: normal; font-size: .45em; transform: translateY(-.4em); }
@keyframes scr { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ---------- MANIFESTO ---------- */
.mani { padding: 130px 0 120px; }
.mani .lab { color: var(--soft); margin-bottom: 36px; }
.mani h2 { font-size: clamp(28px, 4.2vw, 60px); font-weight: 600; line-height: 1.12; letter-spacing: -.02em; max-width: 1180px; }
.mani h2 .d { color: rgba(255, 255, 255, .5); }

/* ---------- STEPS ---------- */
.steps { padding: 120px 0; }
.s-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; margin-bottom: 64px; }
.s-head h2 { font-weight: 900; text-transform: uppercase; font-size: clamp(40px, 7vw, 96px); letter-spacing: -.04em; line-height: .9; }
.s-head p { max-width: 300px; font-size: 15px; color: var(--soft); text-align: right; }
.step { display: grid; grid-template-columns: 110px 1fr auto; gap: 36px; align-items: baseline; padding: 42px 0; border-top: 1px solid var(--line3); transition: padding-left .4s var(--ease); }
.step:last-child { border-bottom: 1px solid var(--line3); }
.step:hover { padding-left: 18px; }
.step .n { font-family: var(--mono); font-size: 14px; color: #fff; }
.step h3 { font-weight: 800; text-transform: uppercase; font-size: clamp(24px, 3.2vw, 42px); letter-spacing: -.02em; line-height: 1; }
.step p { max-width: 360px; font-size: 15px; color: var(--soft); justify-self: end; line-height: 1.5; }
@media (max-width: 820px) { .step { grid-template-columns: 1fr; gap: 12px; } .step p { justify-self: start; } .s-head p { display: none; } }

/* AI ARENA — bento sombre avec halo bleu, renvoie vers /arena */
.ai-sec { padding: 0 0 96px; }
.ai { position: relative; overflow: hidden; background: linear-gradient(135deg, var(--panel2), var(--panel)); border-radius: 22px; padding: 56px; display: grid; grid-template-columns: 1.35fr 1fr; gap: 56px; align-items: center; }
.ai-glow { position: absolute; top: -32%; right: -8%; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(79, 106, 255, .5), transparent 60%); pointer-events: none; }
.ai-main { position: relative; }
.ai .lab { color: var(--soft); margin-bottom: 18px; display: block; }
.ai h2 { font-weight: 900; text-transform: uppercase; font-size: clamp(30px, 4.4vw, 58px); letter-spacing: -.035em; line-height: .94; }
.ai h2 .d { color: var(--blue); }
.ai p { color: var(--soft); font-size: 16px; line-height: 1.6; max-width: 520px; margin: 20px 0 30px; }
.ai-main .big-pill { font-size: 17px; padding: 18px 34px; }
.ai-specs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 26px; }
.ai-chip { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); border: 1px solid var(--line3); border-radius: 100px; padding: 7px 13px; }
.ai-side { position: relative; display: grid; gap: 12px; }
.ai-product { position: relative; display: grid; gap: 12px; min-height: 145px; padding: 22px; border: 1px solid var(--line3); border-radius: 16px; background: rgba(0, 0, 0, .24); transition: border-color .25s, transform .25s var(--ease); }
.ai-product:hover { border-color: rgba(255, 255, 255, .38); transform: translateY(-2px); }
.ai-product .lab { margin: 0; color: var(--blue); }
.ai-product strong { max-width: 360px; font-size: 18px; line-height: 1.35; }
.ai-product i { position: absolute; right: 20px; bottom: 17px; font-style: normal; font-size: 24px; color: var(--blue); }
.ai-total { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); text-align: center; }
@media (max-width: 820px) { .ai { grid-template-columns: 1fr; gap: 34px; padding: 36px 28px; } }

/* ---------- PRODUCT FEATURES ---------- */
.features-sec { padding: 0 0 130px; }
.feature-head { display: grid; grid-template-columns: 180px 1fr; gap: 28px; align-items: start; margin-bottom: 42px; }
.feature-head h2 { max-width: 900px; font-size: clamp(36px, 5.5vw, 76px); line-height: .96; text-transform: uppercase; letter-spacing: -.04em; }
.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--line3); border-left: 1px solid var(--line3); }
.feature-card { position: relative; display: grid; gap: 18px; min-height: 215px; padding: 28px; border-right: 1px solid var(--line3); border-bottom: 1px solid var(--line3); transition: background .25s, color .25s; }
.feature-card:hover { background: #fff; color: var(--panel); }
/* Au repos la carte est sur le bleu de marque : un titre `--blue` y était
 * invisible. Le bleu ne revient qu'au survol, quand le fond passe au blanc. */
.feature-card .lab { color: var(--text); }
.feature-card:hover .lab, .feature-card:hover i { color: var(--blue); }
.feature-card strong { max-width: 330px; font-size: 20px; line-height: 1.35; }
.feature-card i { position: absolute; right: 26px; bottom: 22px; font-style: normal; font-size: 26px; color: var(--text); }
@media (max-width: 900px) { .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .feature-head { grid-template-columns: 1fr; } .feature-grid { grid-template-columns: 1fr; } }

/* ---------- CTA ---------- */
.cta { text-align: center; padding: 120px 0 130px; }
.cta h2 { font-weight: 900; text-transform: uppercase; font-size: clamp(54px, 13vw, 210px); letter-spacing: -.045em; line-height: .84; }
.cta p { font-size: 18px; color: var(--soft); max-width: 440px; margin: 30px auto 40px; }
.big-pill { display: inline-flex; align-items: center; gap: 12px; background: #fff; color: var(--panel); font-weight: 800; font-size: 20px; border-radius: 100px; padding: 22px 44px; transition: transform .3s var(--ease); }
.cta-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
/* Second CTA : ouvre le funnel wallet sans concurrencer « apprendre d'abord ». */
.big-pill.ghost { background: transparent; color: var(--text); border: 1px solid var(--line3); }
.big-pill.ghost:hover { border-color: var(--text); }

/* ---------- FOOTER ---------- */
footer { padding: 60px 0 40px; }
.f-top { display: flex; justify-content: space-between; gap: 50px; flex-wrap: wrap; }
.f-brand { max-width: 300px; }
.f-brand p { font-size: 14px; color: var(--soft); margin-top: 16px; line-height: 1.6; }
.f-cols { display: flex; gap: 64px; flex-wrap: wrap; }
.f-col h4 { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--soft); margin-bottom: 18px; }
.f-col a { display: block; font-size: 15px; margin-bottom: 11px; opacity: .9; transition: opacity .2s; }
.f-col a:hover { opacity: .6; }
.f-big { font-weight: 900; text-transform: uppercase; font-size: clamp(90px, 26vw, 400px); letter-spacing: -.05em; line-height: .75; margin-top: 50px; }
.f-bottom { display: flex; justify-content: space-between; margin-top: 30px; flex-wrap: wrap; gap: 12px; }
.f-bottom span { font-family: var(--mono); font-size: 11px; letter-spacing: .04em; color: var(--soft); }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
  .rv { opacity: 1; transform: none; }
  .gl > span { transform: none; }
  .chart .ln { stroke-dashoffset: 0; }
}
</style>
