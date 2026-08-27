<script setup lang="ts">
// Landing page — page d'accueil SPÉCIALE : elle n'utilise PAS l'app-bar global,
// elle rend sa propre barre supérieure (.bar) et ses propres tokens de couleurs
// (différents des tokens globaux). Le .grain global est déjà rendu par App.vue.
import { onMounted, onUnmounted, ref, nextTick, computed, watch } from 'vue'
import type { TideClient } from '@tide/client'
import { useSession } from '../composables/useSession'
import { useWallet } from '../composables/useWallet'
import { useI18n } from '../i18n/useI18n'
import LangToggle from '../components/LangToggle.vue'
import BrandMark from '../components/BrandMark.vue'
import { useAccountAuth } from '../composables/useAccountAuth'

const props = defineProps<{ client: TideClient }>()
const { userId, connected } = useSession()

const { t, locale, intlLocale } = useI18n({
  en: {
    soundOff: 'SOUND [OFF]',
    soundOn: 'SOUND [ON]',
    heroDesc: 'TIDE IS A WEB3 PAPER-TRADING ARENA WHERE THE BEST TRADERS COMPETE FOR REAL REWARDS.',
    seasonLive: 'XRPL MAINNET · LIVE',
    tradersCount: 'REAL MARKET DATA',
    join: 'Join',
    heroTag: '[ PAPER TRADING · COMPETITIONS · AI AGENTS ]',
    aiLabel: 'AI Arena · Season 01',
    aiHeadL1: 'One model.',
    aiHeadL2: 'A thousand brains.',
    aiLead:
      "Not into trading by hand? Enter the AI Arena. Everyone gets the same frozen model, the same data feed and the same demo capital — the only variable is the strategy you engineer. Autonomous agents compete on-chain for the pot.",
    aiCta: 'Enter the AI Arena →',
    aiSpec1K: 'Model',
    aiSpec1V: 'Frozen · identical',
    aiSpec2K: 'Data',
    aiSpec2V: 'Unified feed',
    aiSpec3K: 'Capital',
    aiSpec3V: 'Demo · equal',
    aiNote: 'identical for every competitor · verified on-chain',
    featureLabel: 'Explore Tide',
    featureTitle: 'Everything in one trading platform.',
    featureTrading: 'Trading',
    featureTradingBody: 'Paper spot and perpetual positions using real market data.',
    featurePortfolio: 'Portfolio',
    featurePortfolioBody: 'Persisted balances, open positions and real PnL.',
    featureLeaderboard: 'Leaderboard',
    featureLeaderboardBody: 'Ranks computed from persisted backend performance.',
    featureCompetitions: 'Competitions',
    featureCompetitionsBody: 'Verified XRP entry pools and on-chain payouts.',
    featureArena: 'AI Arena',
    featureArenaBody: 'Compare agent strategies under the same constraints.',
    featureAgent: 'AI Agent',
    featureAgentBody: 'Let an agent trade through server-enforced mandates.',
    featureLearn: 'Learn',
    featureLearnBody: 'Understand trading, risk, perps and Tide competitions.',
    duelLive: 'Live duel',
    duelATag: 'regime · reflection',
    duelBTag: 'raw execution',
    duelFeed1: 'regime → range detected',
    duelFeed2: 'fading the BTC high',
    duelFeed3: 'throttle on · 1 order / min',
    duelFeed4: 'stop hit · capital preserved',
    duelFeed5: 'sentiment +, opening LONG',
    demoWallet: 'Season leader',
    s04Return: 'S04 return · rank #{rank}',
    topTradersLive: 'Top traders — live',
    meName: 'you — connect',
    meRanks: '↑ 6 ranks today',
    segArena: 'Arena',
    segLeaderboard: 'Leaderboard',
    segRewards: 'Rewards',
    marqCompetition: 'Competition',
    marqZeroRisk: 'Zero Risk',
    marqRealGlory: 'Real Glory',
    manifestoLabel: 'The manifesto',
    manifestoP1: 'You get $10,000 in virtual capital. You trade real crypto markets in real time. ',
    manifestoHighlight: 'No deposit, no painful liquidations, no KYC.',
    manifestoP2: ' Just your read on the market — against the current season leaderboard. The best cash out on-chain when rewards are enabled.',
    statPaidOut: 'paid out this season',
    statWallets: 'wallets created',
    statMarkets: 'markets available',
    statFeeFree: 'fee-free trading',
    stepsHeadL1: 'Start trading',
    stepsHeadL2: 'in 60 seconds',
    stepsLead: 'Connect, get your capital, and the race begins. No endless onboarding.',
    step1Title: 'Create your Tide account',
    step1Body: 'Continue with email or Google. Your Paper portfolio follows you on every device.',
    step2Title: 'Get $10,000',
    step2Body: 'Demo capital credited instantly. Open positions on markets backed by real data feeds.',
    step3Title: 'Climb & cash out',
    step3Body: 'Beat the market and your rivals. At the close, rewards drop automatically on-chain.',
    seasonPot: 'Season pot',
    potCaption: 'RLUSD + season NFT · split across the top 50',
    cdDays: 'Days',
    cdHours: 'Hours',
    cdMin: 'Min',
    cdSec: 'Sec',
    prize1: '1st place',
    prize2: '2nd place',
    prize3: '3rd place',
    prize4: 'Top 4 — 50',
    ctaHeadL1: 'Take',
    ctaHeadL2: 'your spot',
    ctaP: 'Sharpen your edge in paper mode, then connect a wallet only when you need on-chain actions.',
    connectWallet: 'Connect wallet →',
    footerTagline: 'The paper-trading arena where the best crypto pilots go head to head — and cash out on-chain.',
    colProduct: 'Product',
    colResources: 'Resources',
    colCommunity: 'Community',
    linkCompetitions: 'Competitions',
    linkLeaderboard: 'Leaderboard',
    linkRewards: 'Rewards',
    linkMarkets: 'Markets',
    linkSchool: 'Tide School',
    linkDocumentation: 'Documentation',
    linkRules: 'Rules',
    linkApi: 'API',
    linkStatus: 'Status',
    copyright: '© 2026 TIDE LABS — BUILT ON-CHAIN',
    disclaimer: 'PAPER TRADING INVOLVES NO REAL CAPITAL',
  },
  fr: {
    soundOff: 'SON [OFF]',
    soundOn: 'SON [ON]',
    heroDesc: "TIDE EST UNE ARÈNE DE PAPER TRADING WEB3 OÙ LES MEILLEURS TRADERS S'AFFRONTENT POUR DES RÉCOMPENSES RÉELLES.",
    seasonLive: 'XRPL MAINNET · LIVE',
    tradersCount: 'DONNÉES DE MARCHÉ RÉELLES',
    join: 'Rejoindre',
    heroTag: '[ PAPER TRADING · COMPÉTITIONS · AGENTS IA ]',
    aiLabel: 'Arène IA · Saison 01',
    aiHeadL1: 'Un modèle.',
    aiHeadL2: 'Mille cerveaux.',
    aiLead:
      "Pas fan du trading à la main ? Entre dans l'Arène IA. Chacun reçoit le même modèle figé, le même flux de données et le même capital démo — la seule variable, c'est la stratégie que tu conçois. Des agents autonomes s'affrontent on-chain pour la cagnotte.",
    aiCta: "Entrer dans l'Arène IA →",
    aiSpec1K: 'Modèle',
    aiSpec1V: 'Figé · identique',
    aiSpec2K: 'Données',
    aiSpec2V: 'Flux unifié',
    aiSpec3K: 'Capital',
    aiSpec3V: 'Démo · égal',
    aiNote: 'identique pour chaque concurrent · vérifié on-chain',
    featureLabel: 'Explorer Tide',
    featureTitle: 'Toute la plateforme de trading au même endroit.',
    featureTrading: 'Trading',
    featureTradingBody: 'Spot et perp Paper basés sur de vraies données de marché.',
    featurePortfolio: 'Portefeuille',
    featurePortfolioBody: 'Soldes persistés, positions ouvertes et PnL réel.',
    featureLeaderboard: 'Classement',
    featureLeaderboardBody: 'Rangs calculés depuis les performances persistées du backend.',
    featureCompetitions: 'Compétitions',
    featureCompetitionsBody: 'Pools de tickets XRP vérifiés et paiements on-chain.',
    featureArena: 'Arène IA',
    featureArenaBody: 'Comparer des stratégies d’agents sous les mêmes contraintes.',
    featureAgent: 'Agent IA',
    featureAgentBody: 'Laisser un agent trader avec des mandats imposés par le serveur.',
    featureLearn: 'Apprendre',
    featureLearnBody: 'Comprendre le trading, le risque, les perps et les compétitions Tide.',
    duelLive: 'Duel en direct',
    duelATag: 'régime · réflexion',
    duelBTag: 'exécution brute',
    duelFeed1: 'régime → range détecté',
    duelFeed2: 'on fade le haut BTC',
    duelFeed3: 'throttle · 1 ordre / min',
    duelFeed4: 'stop touché · capital préservé',
    duelFeed5: 'sentiment +, ouverture LONG',
    demoWallet: 'Meilleur trader',
    s04Return: 'Rendement S04 · rang #{rank}',
    topTradersLive: 'Top traders — live',
    meName: 'toi — connecté',
    meRanks: "↑ 6 rangs aujourd'hui",
    segArena: 'Arène',
    segLeaderboard: 'Classement',
    segRewards: 'Récompenses',
    marqCompetition: 'Compétition',
    marqZeroRisk: 'Zéro Risque',
    marqRealGlory: 'Gloire Réelle',
    manifestoLabel: 'Le manifeste',
    manifestoP1: 'Tu reçois $10 000 virtuels. Tu trades les vrais marchés crypto en temps réel. ',
    manifestoHighlight: 'Pas de dépôt, pas de liquidation qui fait mal, pas de KYC.',
    manifestoP2: ' Juste ta lecture du marché — opposée au classement de la saison en cours. Les meilleurs encaissent on-chain quand les récompenses sont activées.',
    statPaidOut: 'distribués cette saison',
    statWallets: 'portefeuilles créés',
    statMarkets: 'marchés disponibles',
    statFeeFree: 'trading sans frais',
    stepsHeadL1: 'Commence à trader',
    stepsHeadL2: 'en 60 secondes',
    stepsLead: "Connecte, reçois ton capital, et la course commence. Pas d'onboarding interminable.",
    step1Title: 'Crée ton compte Tide',
    step1Body: 'Continue avec ton email ou Google. Ton portefeuille Paper te suit sur tous tes appareils.',
    step2Title: 'Reçois $10 000',
    step2Body: 'Capital de démo crédité instantanément. Ouvre des positions sur des marchés alimentés par de vraies données.',
    step3Title: 'Grimpe & encaisse',
    step3Body: 'Bats le marché et tes rivaux. À la clôture, les récompenses tombent automatiquement on-chain.',
    seasonPot: 'Cagnotte de la saison',
    potCaption: 'RLUSD + NFT de saison · répartis sur le top 50',
    cdDays: 'Jours',
    cdHours: 'Heures',
    cdMin: 'Min',
    cdSec: 'Sec',
    prize1: '1ère place',
    prize2: '2e place',
    prize3: '3e place',
    prize4: 'Top 4 — 50',
    ctaHeadL1: 'Prends',
    ctaHeadL2: 'ta place',
    ctaP: "Affûte ton edge en paper, puis connecte un wallet seulement quand une action on-chain est nécessaire.",
    connectWallet: 'Connecter le wallet →',
    footerTagline: "L'arène de paper trading où les meilleurs pilotes crypto se mesurent — et encaissent on-chain.",
    colProduct: 'Produit',
    colResources: 'Ressources',
    colCommunity: 'Communauté',
    linkCompetitions: 'Compétitions',
    linkLeaderboard: 'Classement',
    linkRewards: 'Récompenses',
    linkMarkets: 'Marchés',
    linkSchool: 'Tide School',
    linkDocumentation: 'Documentation',
    linkRules: 'Règlement',
    linkApi: 'API',
    linkStatus: 'Statut',
    copyright: '© 2026 TIDE LABS — CONSTRUIT ON-CHAIN',
    disclaimer: "LE PAPER TRADING N'IMPLIQUE AUCUN CAPITAL RÉEL",
  },
})

const emit = defineEmits<{ navigate: [path: string] }>()
const account = useAccountAuth(props.client)
function goDashboard(): void {
  if (account.signedIn.value) emit('navigate', '/dashboard')
  else account.open('/dashboard')
}

// Connexion de wallet réelle (Xaman / GemWallet, mode Live).
const wallet = useWallet(props.client)
function connectWallet(): void {
  void wallet.connect()
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

// Contrôle segmenté (Arène / Classement / Récompenses).
const active = ref<number>(0)
const segButtons = ref<Array<HTMLButtonElement | null>>([null, null, null])
const indicator = ref<HTMLSpanElement | null>(null)
const segLabels = computed(() => [t('segArena'), t('segLeaderboard'), t('segRewards')] as const)
// Chaque onglet renvoie vers sa page réelle (sinon le contrôle ne ferait rien).
const SEG_ROUTES = ['/arena', '/leaderboard', '/competitions'] as const
const featureLinks = computed(() => [
  { path: '/dashboard', title: t('featureTrading'), body: t('featureTradingBody') },
  { path: '/portfolio', title: t('featurePortfolio'), body: t('featurePortfolioBody') },
  { path: '/leaderboard', title: t('featureLeaderboard'), body: t('featureLeaderboardBody') },
  { path: '/competitions', title: t('featureCompetitions'), body: t('featureCompetitionsBody') },
  { path: '/arena', title: t('featureArena'), body: t('featureArenaBody') },
  { path: '/agent', title: t('featureAgent'), body: t('featureAgentBody') },
  { path: '/learn', title: t('featureLearn'), body: t('featureLearnBody') },
])

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
          <span class="gl"><span>Onchain</span></span>
          <span class="gl"><span>Trading</span></span>
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
        <span>Paper Trading</span><i>✕</i><span class="out">{{ t('marqCompetition') }}</span><i>✕</i><span>On-chain</span><i>✕</i><span class="out">{{ t('marqZeroRisk') }}</span><i>✕</i><span>{{ t('marqRealGlory') }}</span><i>✕</i>
        <span>Paper Trading</span><i>✕</i><span class="out">{{ t('marqCompetition') }}</span><i>✕</i><span>On-chain</span><i>✕</i><span class="out">{{ t('marqZeroRisk') }}</span><i>✕</i><span>{{ t('marqRealGlory') }}</span><i>✕</i>
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

    <!-- AI ARENA -->
    <section class="ai-sec" id="ai-arena">
      <div class="wrap">
        <div class="ai rv" v-reveal>
          <div class="ai-glow"></div>
          <div class="ai-main">
            <span class="lab">{{ t('aiLabel') }}</span>
            <h2>{{ t('aiHeadL1') }}<br /><span class="d">{{ t('aiHeadL2') }}</span></h2>
            <p>{{ t('aiLead') }}</p>
            <a href="#/arena" class="big-pill" @click.prevent="emit('navigate', '/arena')">{{ t('aiCta') }}</a>
            <div class="ai-specs">
              <span class="ai-chip mono">{{ t('aiSpec1K') }} · {{ t('aiSpec1V') }}</span>
              <span class="ai-chip mono">{{ t('aiSpec2K') }} · {{ t('aiSpec2V') }}</span>
              <span class="ai-chip mono">{{ t('aiSpec3K') }} · {{ t('aiSpec3V') }}</span>
            </div>
          </div>
          <div class="ai-side">
            <a class="ai-product" href="#/arena" @click.prevent="emit('navigate', '/arena')">
              <span class="lab">{{ t('featureArena') }}</span>
              <strong>{{ t('featureArenaBody') }}</strong>
              <i>→</i>
            </a>
            <a class="ai-product" href="#/agent" @click.prevent="emit('navigate', '/agent')">
              <span class="lab">{{ t('featureAgent') }}</span>
              <strong>{{ t('featureAgentBody') }}</strong>
              <i>→</i>
            </a>
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
        <div class="rv" v-reveal><a href="#" class="big-pill" @click.prevent="connectWallet">{{ t('connectWallet') }}</a></div>
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
              <a href="#/competitions" @click.prevent="emit('navigate', '/competitions')">{{ t('linkCompetitions') }}</a>
              <a href="#/leaderboard" @click.prevent="emit('navigate', '/leaderboard')">{{ t('linkLeaderboard') }}</a>
              <a href="#/competitions" @click.prevent="emit('navigate', '/competitions')">{{ t('linkRewards') }}</a>
              <a href="#/dashboard" @click.prevent="emit('navigate', '/dashboard')">{{ t('linkMarkets') }}</a>
            </div>
            <div class="f-col">
              <h4>{{ t('colResources') }}</h4>
              <a href="#/learn" @click.prevent="emit('navigate', '/learn')">{{ t('linkSchool') }}</a>
              <a href="#/learn/what-is-trading" @click.prevent="emit('navigate', '/learn/what-is-trading')">{{ t('linkDocumentation') }}</a>
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
/* Tokens locaux de la landing (diffèrent des tokens globaux). */
.landing {
  --ink: #161618;
  --ink2: #1E1E22;
  --white: #FFFFFF;
  --soft: rgba(255, 255, 255, .62);
  --hair: rgba(255, 255, 255, .22);
  --up: #BFF6CE;
  --down: #FFB9AC;
  --disp: "Archivo", Helvetica, Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
  --ease: cubic-bezier(.16, 1, .3, 1);
  color: var(--white);
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
.lab { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; line-height: 1.5; }
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
.pill-cta { flex-shrink: 0; background: #fff; color: var(--ink); font-weight: 700; font-size: 15px; border-radius: 100px; padding: 14px 26px; transition: transform .3s var(--ease); }
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
.screen { position: relative; background: var(--ink); border-radius: 22px; overflow: hidden; padding: 40px 40px 96px; min-height: 560px; margin-top: 56px; }
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
.seg button.act { color: var(--ink); }

/* ---------- MARQUEE ---------- */
.marq { border-top: 1px solid var(--hair); border-bottom: 1px solid var(--hair); overflow: hidden; white-space: nowrap; padding: 20px 0; margin-top: 70px; }
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

/* ---------- STATS ---------- */
.stats { border-top: 1px solid var(--hair); border-bottom: 1px solid var(--hair); display: grid; grid-template-columns: repeat(4, 1fr); }
.st { padding: 50px 28px; border-left: 1px solid var(--hair); }
.st:first-child { border-left: none; }
.st .v { font-family: var(--mono); font-weight: 700; font-size: clamp(38px, 5vw, 60px); letter-spacing: -.03em; line-height: 1; }
.st .c { font-size: 14px; color: var(--soft); margin-top: 14px; }
@media (max-width: 820px) { .stats { grid-template-columns: repeat(2, 1fr); } .st:nth-child(3) { border-left: none; } }
@media (max-width: 480px) { .stats { grid-template-columns: 1fr; } .st { border-left: none; border-top: 1px solid var(--hair); } .stats .st:first-child { border-top: none; } }

/* ---------- STEPS ---------- */
.steps { padding: 120px 0; }
.s-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; margin-bottom: 64px; }
.s-head h2 { font-weight: 900; text-transform: uppercase; font-size: clamp(40px, 7vw, 96px); letter-spacing: -.04em; line-height: .9; }
.s-head p { max-width: 300px; font-size: 15px; color: var(--soft); text-align: right; }
.step { display: grid; grid-template-columns: 110px 1fr auto; gap: 36px; align-items: baseline; padding: 42px 0; border-top: 1px solid var(--hair); transition: padding-left .4s var(--ease); }
.step:last-child { border-bottom: 1px solid var(--hair); }
.step:hover { padding-left: 18px; }
.step .n { font-family: var(--mono); font-size: 14px; color: #fff; }
.step h3 { font-weight: 800; text-transform: uppercase; font-size: clamp(24px, 3.2vw, 42px); letter-spacing: -.02em; line-height: 1; }
.step p { max-width: 360px; font-size: 15px; color: var(--soft); justify-self: end; line-height: 1.5; }
@media (max-width: 820px) { .step { grid-template-columns: 1fr; gap: 12px; } .step p { justify-self: start; } .s-head p { display: none; } }

/* AI ARENA — bento sombre avec halo bleu, renvoie vers /arena */
.ai-sec { padding: 0 0 96px; }
.ai { position: relative; overflow: hidden; background: linear-gradient(135deg, var(--ink2), var(--ink)); border-radius: 22px; padding: 56px; display: grid; grid-template-columns: 1.35fr 1fr; gap: 56px; align-items: center; }
.ai-glow { position: absolute; top: -32%; right: -8%; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(79, 106, 255, .5), transparent 60%); pointer-events: none; }
.ai-main { position: relative; }
.ai .lab { color: var(--soft); margin-bottom: 18px; display: block; }
.ai h2 { font-weight: 900; text-transform: uppercase; font-size: clamp(30px, 4.4vw, 58px); letter-spacing: -.035em; line-height: .94; }
.ai h2 .d { color: var(--blue); }
.ai p { color: var(--soft); font-size: 16px; line-height: 1.6; max-width: 520px; margin: 20px 0 30px; }
.ai-main .big-pill { font-size: 17px; padding: 18px 34px; }
.ai-specs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 26px; }
.ai-chip { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); border: 1px solid var(--hair); border-radius: 100px; padding: 7px 13px; }
.ai-side { position: relative; display: grid; gap: 12px; }
.ai-product { position: relative; display: grid; gap: 12px; min-height: 145px; padding: 22px; border: 1px solid var(--hair); border-radius: 16px; background: rgba(0, 0, 0, .24); transition: border-color .25s, transform .25s var(--ease); }
.ai-product:hover { border-color: rgba(255, 255, 255, .38); transform: translateY(-2px); }
.ai-product .lab { margin: 0; color: var(--blue); }
.ai-product strong { max-width: 360px; font-size: 18px; line-height: 1.35; }
.ai-product i { position: absolute; right: 20px; bottom: 17px; font-style: normal; font-size: 24px; color: var(--blue); }
@media (max-width: 820px) { .ai { grid-template-columns: 1fr; gap: 34px; padding: 36px 28px; } }

/* ---------- PRODUCT FEATURES ---------- */
.features-sec { padding: 0 0 130px; }
.feature-head { display: grid; grid-template-columns: 180px 1fr; gap: 28px; align-items: start; margin-bottom: 42px; }
.feature-head h2 { max-width: 900px; font-size: clamp(36px, 5.5vw, 76px); line-height: .96; text-transform: uppercase; letter-spacing: -.04em; }
.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--hair); border-left: 1px solid var(--hair); }
.feature-card { position: relative; display: grid; gap: 18px; min-height: 215px; padding: 28px; border-right: 1px solid var(--hair); border-bottom: 1px solid var(--hair); transition: background .25s, color .25s; }
.feature-card:hover { background: #fff; color: var(--ink); }
.feature-card .lab { color: var(--blue); }
.feature-card strong { max-width: 330px; font-size: 20px; line-height: 1.35; }
.feature-card i { position: absolute; right: 26px; bottom: 22px; font-style: normal; font-size: 26px; color: var(--blue); }
@media (max-width: 900px) { .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .feature-head { grid-template-columns: 1fr; } .feature-grid { grid-template-columns: 1fr; } }

/* ---------- CTA ---------- */
.cta { text-align: center; padding: 120px 0 130px; }
.cta h2 { font-weight: 900; text-transform: uppercase; font-size: clamp(54px, 13vw, 210px); letter-spacing: -.045em; line-height: .84; }
.cta p { font-size: 18px; color: var(--soft); max-width: 440px; margin: 30px auto 40px; }
.big-pill { display: inline-flex; align-items: center; gap: 12px; background: #fff; color: var(--ink); font-weight: 800; font-size: 20px; border-radius: 100px; padding: 22px 44px; transition: transform .3s var(--ease); }

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
