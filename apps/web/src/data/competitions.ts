/* ===== TIDE — données d'affichage des compétitions (mock) =====
 * Porté depuis design_site/comps.js. Sert l'UI (liste + détail). Distinct du
 * type `Competition` de @tide/core utilisé par le backend (create/join).
 *
 * Bilingue : les champs textuels sont stockés en `Localized` ({ en, fr }) dans
 * `COMPETITIONS_RAW`, puis résolus pour une langue via `localizeComp`. Les vues
 * consomment la forme résolue `CompetitionMock` (tout en `string`) — inchangée.
 */
import type { Locale } from "../i18n/locale";

export type CompetitionStatus = "live" | "soon" | "ended";

/** Chaîne traduite (une entrée par langue supportée). */
export type Localized = Record<Locale, string>;

export interface CompetitionPrize {
  pos: string;
  amt: string;
}
export interface CompetitionLeader {
  r: number;
  n: string;
  ret: string;
}
export interface CompetitionTimelineItem {
  l: string;
  d: string;
  done: boolean;
}

/** Forme résolue (mono-langue) consommée par l'UI. */
export interface CompetitionMock {
  id: string;
  featured?: boolean;
  ico: string;
  name: string;
  status: CompetitionStatus;
  desc: string;
  long: string;
  pot: string;
  fee: string;
  players: string;
  cap: string;
  pct: number;
  daysLeft: number;
  startsIn?: boolean;
  format: string;
  capital: string;
  leverage: string;
  markets: string;
  duration: string;
  prizes: CompetitionPrize[];
  leaders: CompetitionLeader[];
  timeline: CompetitionTimelineItem[];
}

interface RawPrize {
  pos: Localized;
  amt: string;
}
interface RawTimelineItem {
  l: Localized;
  d: Localized;
  done: boolean;
}

/** Forme brute bilingue : champs textuels en `Localized`. */
interface RawCompetition {
  id: string;
  featured?: boolean;
  ico: string;
  name: Localized;
  status: CompetitionStatus;
  desc: Localized;
  long: Localized;
  pot: string;
  fee: Localized;
  players: Localized;
  cap: string;
  pct: number;
  daysLeft: number;
  startsIn?: boolean;
  format: Localized;
  capital: string;
  leverage: Localized;
  markets: Localized;
  duration: Localized;
  prizes: RawPrize[];
  leaders: CompetitionLeader[];
  timeline: RawTimelineItem[];
}

const COMPETITIONS_RAW: RawCompetition[] = [
  {
    id: "season-04",
    featured: true,
    ico: "🏁",
    name: { en: "Season 04 — Grand Championship", fr: "Saison 04 — Grand Championnat" },
    status: "live",
    desc: {
      en: "TIDE's flagship competition. 6 weeks, the best return takes the pot.",
      fr: "La compétition phare de TIDE. 6 semaines, le meilleur rendement rafle la cagnotte.",
    },
    long: {
      en: "The Grand Championship is TIDE's marquee season. For six weeks, every trader starts with the same virtual capital and a single goal: the highest net return. No entry fee, no KYC — just your read of the market against the current season field. The top 50 share the pot, paid on-chain at the close when rewards are enabled.",
      fr: "Le Grand Championnat est la saison reine de TIDE. Pendant six semaines, chaque trader part avec le même capital virtuel et un seul objectif : le plus haut rendement net. Pas de frais d'entrée, pas de KYC, juste ta lecture du marché contre le plateau de la saison. Les 50 meilleurs se partagent la cagnotte, versée on-chain à la clôture quand les récompenses sont activées.",
    },
    pot: "$50,000",
    fee: { en: "Free", fr: "Gratuit" },
    players: { en: "Loading", fr: "Chargement" },
    cap: "",
    pct: 0,
    daysLeft: 4,
    format: { en: "Net return (%)", fr: "Rendement net (%)" },
    capital: "$100,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Top 250 spot markets", fr: "Top 250 marchés spot" },
    duration: { en: "6 weeks", fr: "6 semaines" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$15,000" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$8,000" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$4,000" },
      { pos: { en: "Top 4 — 50", fr: "Top 4 — 50" }, amt: "$23,000" },
    ],
    leaders: [
      { r: 1, n: "quant_viper", ret: "+142.8%" },
      { r: 2, n: "degen_maxi", ret: "+118.3%" },
      { r: 3, n: "satoshi_heir", ret: "+97.6%" },
      { r: 4, n: "liquid_zen", ret: "+84.1%" },
      { r: 5, n: "night_fader", ret: "+71.9%" },
    ],
    timeline: [
      { l: { en: "Registration opens", fr: "Ouverture des inscriptions" }, d: { en: "Jun 02", fr: "02 juin" }, done: true },
      { l: { en: "Kickoff · capital credited", fr: "Coup d'envoi · capital crédité" }, d: { en: "Jun 09", fr: "09 juin" }, done: true },
      { l: { en: "Mid-season · leaderboard snapshot", fr: "Mi-saison · snapshot classement" }, d: { en: "Jun 23", fr: "23 juin" }, done: true },
      { l: { en: "Close & on-chain payout", fr: "Clôture & distribution on-chain" }, d: { en: "Jun 30", fr: "30 juin" }, done: false },
    ],
  },
  {
    id: "friday-sprint",
    ico: "⚡",
    name: { en: "Friday Sprint", fr: "Sprint du Vendredi" },
    status: "live",
    desc: {
      en: "24h flash tournament. Highest intraday return. $25,000 capital.",
      fr: "Tournoi éclair de 24h. Plus haut rendement intraday. Capital $25 000.",
    },
    long: {
      en: "A high-strung format for scalpers: 24 hours, reduced capital, and only the day's return counts. Perfect for testing an aggressive strategy without committing to a full season.",
      fr: "Un format nerveux pour les scalpeurs : 24 heures, capital réduit, et seul le rendement de la journée compte. Idéal pour tester une stratégie agressive sans engager une saison entière.",
    },
    pot: "$5,000",
    fee: { en: "Free", fr: "Gratuit" },
    players: { en: "3,204", fr: "3 204" },
    cap: "5 000",
    pct: 64,
    daysLeft: 0,
    format: { en: "Intraday return (%)", fr: "Rendement intraday (%)" },
    capital: "$25,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Majors only", fr: "Majors uniquement" },
    duration: { en: "24 hours", fr: "24 heures" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$2,000" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$1,200" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$800" },
      { pos: { en: "Top 4 — 20", fr: "Top 4 — 20" }, amt: "$1,000" },
    ],
    leaders: [
      { r: 1, n: "tape_reader", ret: "+38.2%" },
      { r: 2, n: "frosty_bid", ret: "+31.7%" },
      { r: 3, n: "sigma_quant", ret: "+27.4%" },
      { r: 4, n: "pump_sensei", ret: "+22.9%" },
      { r: 5, n: "risk_off", ret: "+19.1%" },
    ],
    timeline: [
      { l: { en: "Open", fr: "Ouverture" }, d: { en: "Today 00:00", fr: "Aujourd'hui 00:00" }, done: true },
      { l: { en: "Live", fr: "En cours" }, d: { en: "now", fr: "maintenant" }, done: true },
      { l: { en: "Close", fr: "Clôture" }, d: { en: "Today 23:59", fr: "Aujourd'hui 23:59" }, done: false },
    ],
  },
  {
    id: "whale-league",
    ico: "🐋",
    name: { en: "Whale League", fr: "Whale League" },
    status: "live",
    desc: {
      en: "Top 500 all-time only. $500,000 capital, risk-adjusted scoring.",
      fr: "Réservé au top 500 all-time. Capital $500 000, scoring ajusté au risque.",
    },
    long: {
      en: "The heavyweights' arena. Only TIDE's 500 best all-time traders get in. Big capital, spot-only rules: here, risk management is what separates the champions.",
      fr: "L'arène des poids lourds. Seuls les 500 meilleurs traders de l'historique TIDE y accèdent. Gros capital, règles spot-only : ici, c'est la gestion du risque qui sépare les champions.",
    },
    pot: "$20,000",
    fee: { en: "Invite-only", fr: "Sur invitation" },
    players: { en: "487", fr: "487" },
    cap: "500",
    pct: 97,
    daysLeft: 9,
    format: { en: "Net return (%)", fr: "Rendement net (%)" },
    capital: "$500,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Top 250 spot markets", fr: "Top 250 marchés spot" },
    duration: { en: "2 weeks", fr: "2 semaines" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$8,000" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$5,000" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$3,000" },
      { pos: { en: "Top 4 — 25", fr: "Top 4 — 25" }, amt: "$4,000" },
    ],
    leaders: [
      { r: 1, n: "cold_storage", ret: "+41.3%" },
      { r: 2, n: "delta_one", ret: "+36.8%" },
      { r: 3, n: "yield_hawk", ret: "+29.5%" },
      { r: 4, n: "alpha_djinn", ret: "+24.0%" },
      { r: 5, n: "veld_trades", ret: "+21.6%" },
    ],
    timeline: [
      { l: { en: "Invites sent", fr: "Invitations envoyées" }, d: { en: "Jun 18", fr: "18 juin" }, done: true },
      { l: { en: "Kickoff", fr: "Coup d'envoi" }, d: { en: "Jun 21", fr: "21 juin" }, done: true },
      { l: { en: "Close", fr: "Clôture" }, d: { en: "Jul 05", fr: "05 juil." }, done: false },
    ],
  },
  {
    id: "defi-only",
    ico: "🎯",
    name: { en: "DeFi Only", fr: "Defi Only" },
    status: "live",
    desc: {
      en: "DeFi & L2 pairs only. The strategic degens' playground.",
      fr: "Uniquement paires DeFi & L2. Le terrain des dégens stratèges.",
    },
    long: {
      en: "A universe restricted to DeFi tokens and Layer-2 ecosystems. High volatility, fast narratives: the competition for those who live on-chain.",
      fr: "Un univers restreint aux tokens DeFi et aux écosystèmes Layer-2. Volatilité élevée, narratifs rapides : la compétition pour ceux qui vivent on-chain.",
    },
    pot: "$8,000",
    fee: { en: "Free", fr: "Gratuit" },
    players: { en: "1,905", fr: "1 905" },
    cap: "4 000",
    pct: 48,
    daysLeft: 6,
    format: { en: "Net return (%)", fr: "Rendement net (%)" },
    capital: "$100,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "DeFi & L2 only", fr: "DeFi & L2 uniquement" },
    duration: { en: "3 weeks", fr: "3 semaines" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$3,500" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$1,800" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$1,000" },
      { pos: { en: "Top 4 — 30", fr: "Top 4 — 30" }, amt: "$1,700" },
    ],
    leaders: [
      { r: 1, n: "onchain_oni", ret: "+88.4%" },
      { r: 2, n: "gigachadx", ret: "+72.1%" },
      { r: 3, n: "moon_archer", ret: "+61.9%" },
      { r: 4, n: "lambo_soon", ret: "+54.3%" },
      { r: 5, n: "apex_owl", ret: "+47.2%" },
    ],
    timeline: [
      { l: { en: "Open", fr: "Ouverture" }, d: { en: "Jun 16", fr: "16 juin" }, done: true },
      { l: { en: "Live", fr: "En cours" }, d: { en: "now", fr: "maintenant" }, done: true },
      { l: { en: "Close", fr: "Clôture" }, d: { en: "Jul 07", fr: "07 juil." }, done: false },
    ],
  },
  {
    id: "season-05",
    ico: "🏆",
    name: { en: "Season 05 — Championship", fr: "Saison 05 — Championnat" },
    status: "soon",
    desc: {
      en: "The next big season. Registration open, starts in 4 days.",
      fr: "La prochaine grande saison. Inscriptions ouvertes, départ dans 4 jours.",
    },
    long: {
      en: "The next Grand Championship season, even bigger. A record $75,000 pot and the same starting capital for everyone. Pre-register to lock in your spot on the starting grid.",
      fr: "La saison suivante du Grand Championnat, encore plus grosse. Cagnotte record de $75 000 et un capital de départ identique pour tous. Pré-inscris-toi pour réserver ta place sur la grille de départ.",
    },
    pot: "$75,000",
    fee: { en: "Free", fr: "Gratuit" },
    players: { en: "6,120 pre-registered", fr: "6 120 pré-inscrits" },
    cap: "",
    pct: 0,
    daysLeft: 4,
    startsIn: true,
    format: { en: "Net return (%)", fr: "Rendement net (%)" },
    capital: "$100,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Top 250 spot markets", fr: "Top 250 marchés spot" },
    duration: { en: "6 weeks", fr: "6 semaines" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$22,000" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$12,000" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$6,000" },
      { pos: { en: "Top 4 — 50", fr: "Top 4 — 50" }, amt: "$35,000" },
    ],
    leaders: [],
    timeline: [
      { l: { en: "Pre-registration open", fr: "Pré-inscriptions ouvertes" }, d: { en: "Jun 24", fr: "24 juin" }, done: true },
      { l: { en: "Kickoff", fr: "Coup d'envoi" }, d: { en: "Jun 30", fr: "30 juin" }, done: false },
      { l: { en: "Close", fr: "Clôture" }, d: { en: "Aug 11", fr: "11 août" }, done: false },
    ],
  },
  {
    id: "night-owls",
    ico: "🌙",
    name: { en: "Night Owls", fr: "Night Owls" },
    status: "soon",
    desc: {
      en: "Nighttime competition (22:00–06:00 CET). For traders worldwide.",
      fr: "Compétition nocturne (22h–06h CET). Pour les traders du monde entier.",
    },
    long: {
      en: "A competition built for Asian and American time zones: only nighttime CET sessions count. The leaderboard only moves after dark.",
      fr: "Une compétition pensée pour les fuseaux horaires asiatiques et américains : seules les sessions nocturnes CET sont prises en compte. Le classement ne bouge que la nuit.",
    },
    pot: "$3,000",
    fee: { en: "Free", fr: "Gratuit" },
    players: { en: "842 pre-registered", fr: "842 pré-inscrits" },
    cap: "",
    pct: 0,
    daysLeft: 6,
    startsIn: true,
    format: { en: "Night-session return (%)", fr: "Rendement sessions nuit (%)" },
    capital: "$50,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Majors & L1", fr: "Majors & L1" },
    duration: { en: "10 nights", fr: "10 nuits" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$1,200" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$800" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$500" },
      { pos: { en: "Top 4 — 15", fr: "Top 4 — 15" }, amt: "$500" },
    ],
    leaders: [],
    timeline: [
      { l: { en: "Pre-registration", fr: "Pré-inscriptions" }, d: { en: "Jun 22", fr: "22 juin" }, done: true },
      { l: { en: "First night", fr: "1ʳᵉ nuit" }, d: { en: "Jul 02", fr: "02 juil." }, done: false },
      { l: { en: "Close", fr: "Clôture" }, d: { en: "Jul 12", fr: "12 juil." }, done: false },
    ],
  },
  {
    id: "solana-summer",
    ico: "◎",
    name: { en: "RLUSD Summer · sponsored", fr: "RLUSD Summer · sponsorisé" },
    status: "soon",
    desc: {
      en: "Stablecoin challenge. Rewards in RLUSD + exclusive NFTs.",
      fr: "Défi stablecoin. Récompenses en RLUSD + NFT exclusifs.",
    },
    long: {
      en: "A competition focused on spot discipline around liquid markets. Trade paper positions and earn rewards in RLUSD, plus exclusive NFTs reserved for the top 100.",
      fr: "Compétition centrée sur la discipline spot autour des marchés liquides. Trade en paper et gagne des récompenses en RLUSD, plus des NFT exclusifs réservés aux 100 premiers.",
    },
    pot: "$30,000",
    fee: { en: "Free", fr: "Gratuit" },
    players: { en: "2,410 pre-registered", fr: "2 410 pré-inscrits" },
    cap: "",
    pct: 0,
    daysLeft: 12,
    startsIn: true,
    format: { en: "Net return (%)", fr: "Rendement net (%)" },
    capital: "$100,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Liquid spot markets", fr: "Marchés spot liquides" },
    duration: { en: "4 weeks", fr: "4 semaines" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$10,000" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$6,000" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$3,500" },
      { pos: { en: "Top 4 — 100", fr: "Top 4 — 100" }, amt: "$10,500 + NFT" },
    ],
    leaders: [],
    timeline: [
      { l: { en: "Pre-registration", fr: "Pré-inscriptions" }, d: { en: "Jun 20", fr: "20 juin" }, done: true },
      { l: { en: "Kickoff", fr: "Coup d'envoi" }, d: { en: "Jul 08", fr: "08 juil." }, done: false },
      { l: { en: "Close", fr: "Clôture" }, d: { en: "Aug 05", fr: "05 août" }, done: false },
    ],
  },
  {
    id: "season-03",
    ico: "🥇",
    name: { en: "Season 03 — Championship", fr: "Saison 03 — Championnat" },
    status: "ended",
    desc: {
      en: "Won by quant_viper with +212.4%. Archives & replay available.",
      fr: "Remportée par quant_viper avec +212.4%. Archives & replay disponibles.",
    },
    long: {
      en: "The third edition of the Grand Championship, already the stuff of legend. quant_viper crushed the field with a +212.4% return. Browse the final standings and replay the best trades.",
      fr: "La troisième édition du Grand Championnat, déjà entrée dans la légende. quant_viper a écrasé la concurrence avec un rendement de +212.4 %. Consulte le classement final et rejoue les meilleurs trades.",
    },
    pot: "$50,000",
    fee: { en: "Ended", fr: "Terminée" },
    players: { en: "10,044", fr: "10 044" },
    cap: "",
    pct: 100,
    daysLeft: -1,
    format: { en: "Net return (%)", fr: "Rendement net (%)" },
    capital: "$100,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Top 250 spot markets", fr: "Top 250 marchés spot" },
    duration: { en: "6 weeks", fr: "6 semaines" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$15,000" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$8,000" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$4,000" },
      { pos: { en: "Top 4 — 50", fr: "Top 4 — 50" }, amt: "$23,000" },
    ],
    leaders: [
      { r: 1, n: "quant_viper", ret: "+212.4%" },
      { r: 2, n: "cold_storage", ret: "+167.8%" },
      { r: 3, n: "delta_one", ret: "+141.0%" },
      { r: 4, n: "yield_hawk", ret: "+122.5%" },
      { r: 5, n: "degen_maxi", ret: "+109.7%" },
    ],
    timeline: [
      { l: { en: "Open", fr: "Ouverture" }, d: { en: "Apr 14", fr: "14 avril" }, done: true },
      { l: { en: "Kickoff", fr: "Coup d'envoi" }, d: { en: "Apr 21", fr: "21 avril" }, done: true },
      { l: { en: "Close & payout", fr: "Clôture & distribution" }, d: { en: "Jun 02", fr: "02 juin" }, done: true },
    ],
  },
  {
    id: "flash-crash",
    ico: "💥",
    name: { en: "Flash Crash Cup", fr: "Flash Crash Cup" },
    status: "ended",
    desc: {
      en: "Risk-management tournament during volatility. Special edition.",
      fr: "Tournoi de gestion du risque pendant la volatilité. Édition spéciale.",
    },
    long: {
      en: "A special edition triggered during a bout of high volatility. The leaderboard rewarded the best capital preservation rather than raw return.",
      fr: "Une édition spéciale déclenchée lors d'un épisode de forte volatilité. Le classement récompensait la meilleure préservation du capital plutôt que le rendement brut.",
    },
    pot: "$6,000",
    fee: { en: "Ended", fr: "Terminée" },
    players: { en: "4,870", fr: "4 870" },
    cap: "",
    pct: 100,
    daysLeft: -1,
    format: { en: "Minimal drawdown", fr: "Drawdown minimal" },
    capital: "$100,000",
    leverage: { en: "Spot only", fr: "Spot uniquement" },
    markets: { en: "Majors", fr: "Majors" },
    duration: { en: "72 hours", fr: "72 heures" },
    prizes: [
      { pos: { en: "1st place", fr: "1ʳᵉ place" }, amt: "$2,500" },
      { pos: { en: "2nd place", fr: "2ᵉ place" }, amt: "$1,500" },
      { pos: { en: "3rd place", fr: "3ᵉ place" }, amt: "$900" },
      { pos: { en: "Top 4 — 20", fr: "Top 4 — 20" }, amt: "$1,100" },
    ],
    leaders: [
      { r: 1, n: "risk_off", ret: "−1.2%" },
      { r: 2, n: "cold_storage", ret: "−2.0%" },
      { r: 3, n: "frosty_bid", ret: "−2.8%" },
      { r: 4, n: "delta_one", ret: "−3.4%" },
      { r: 5, n: "sigma_quant", ret: "−4.1%" },
    ],
    timeline: [
      { l: { en: "Surprise announcement", fr: "Annonce surprise" }, d: { en: "May 10", fr: "10 mai" }, done: true },
      { l: { en: "Kickoff", fr: "Coup d'envoi" }, d: { en: "May 10", fr: "10 mai" }, done: true },
      { l: { en: "Close", fr: "Clôture" }, d: { en: "May 13", fr: "13 mai" }, done: true },
    ],
  },
];

/** Résout une compétition brute dans la langue demandée. */
function localizeComp(raw: RawCompetition, locale: Locale): CompetitionMock {
  return {
    id: raw.id,
    featured: raw.featured,
    ico: raw.ico,
    name: raw.name[locale],
    status: raw.status,
    desc: raw.desc[locale],
    long: raw.long[locale],
    pot: raw.pot,
    fee: raw.fee[locale],
    players: raw.players[locale],
    cap: raw.cap,
    pct: raw.pct,
    daysLeft: raw.daysLeft,
    startsIn: raw.startsIn,
    format: raw.format[locale],
    capital: raw.capital,
    leverage: raw.leverage[locale],
    markets: raw.markets[locale],
    duration: raw.duration[locale],
    prizes: raw.prizes.map((p) => ({ pos: p.pos[locale], amt: p.amt })),
    leaders: raw.leaders,
    timeline: raw.timeline.map((t) => ({ l: t.l[locale], d: t.d[locale], done: t.done })),
  };
}

/** Liste des compétitions résolues dans la langue demandée. */
export function localizedCompetitions(locale: Locale): CompetitionMock[] {
  return COMPETITIONS_RAW.map((raw) => localizeComp(raw, locale));
}

/** Renvoie la compétition par id (résolue), ou la première (vedette) par défaut. */
export function getComp(id: string | undefined, locale: Locale): CompetitionMock {
  const raw = COMPETITIONS_RAW.find((c) => c.id === id) ?? COMPETITIONS_RAW[0];
  if (!raw) {
    throw new Error("COMPETITIONS_RAW ne doit jamais être vide");
  }
  return localizeComp(raw, locale);
}
