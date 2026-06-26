/* ===== TIDE — données d'affichage des compétitions (mock) =====
 * Porté depuis design_site/comps.js. Sert l'UI (liste + détail). Distinct du
 * type `Competition` de @tide/core utilisé par le backend (create/join).
 */

export type CompetitionStatus = "live" | "soon" | "ended";

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

export const COMPETITIONS: CompetitionMock[] = [
  {
    id: "season-04",
    featured: true,
    ico: "🏁",
    name: "Saison 04 — Grand Championnat",
    status: "live",
    desc: "La compétition phare de TIDE. 6 semaines, le meilleur rendement rafle la cagnotte.",
    long: "Le Grand Championnat est la saison reine de TIDE. Pendant six semaines, chaque trader part avec le même capital virtuel et un seul objectif : le plus haut rendement net. Pas de frais d'entrée, pas de KYC, juste ta lecture du marché contre celle de 12 480 concurrents. Les 50 meilleurs se partagent la cagnotte, versée on-chain à la clôture.",
    pot: "$50,000",
    fee: "Gratuit",
    players: "12 480",
    cap: "",
    pct: 0,
    daysLeft: 4,
    format: "Rendement net (%)",
    capital: "$100,000",
    leverage: "jusqu'à 20×",
    markets: "200+ paires spot & perp",
    duration: "6 semaines",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$15,000" },
      { pos: "2ᵉ place", amt: "$8,000" },
      { pos: "3ᵉ place", amt: "$4,000" },
      { pos: "Top 4 — 50", amt: "$23,000" },
    ],
    leaders: [
      { r: 1, n: "quant_viper", ret: "+142.8%" },
      { r: 2, n: "degen_maxi", ret: "+118.3%" },
      { r: 3, n: "satoshi_heir", ret: "+97.6%" },
      { r: 4, n: "liquid_zen", ret: "+84.1%" },
      { r: 5, n: "night_fader", ret: "+71.9%" },
    ],
    timeline: [
      { l: "Ouverture des inscriptions", d: "02 juin", done: true },
      { l: "Coup d'envoi · capital crédité", d: "09 juin", done: true },
      { l: "Mi-saison · snapshot classement", d: "23 juin", done: true },
      { l: "Clôture & distribution on-chain", d: "30 juin", done: false },
    ],
  },
  {
    id: "friday-sprint",
    ico: "⚡",
    name: "Sprint du Vendredi",
    status: "live",
    desc: "Tournoi éclair de 24h. Plus haut rendement intraday. Capital $25 000.",
    long: "Un format nerveux pour les scalpeurs : 24 heures, capital réduit, et seul le rendement de la journée compte. Idéal pour tester une stratégie agressive sans engager une saison entière.",
    pot: "$5,000",
    fee: "Gratuit",
    players: "3 204",
    cap: "5 000",
    pct: 64,
    daysLeft: 0,
    format: "Rendement intraday (%)",
    capital: "$25,000",
    leverage: "jusqu'à 10×",
    markets: "Majors uniquement",
    duration: "24 heures",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$2,000" },
      { pos: "2ᵉ place", amt: "$1,200" },
      { pos: "3ᵉ place", amt: "$800" },
      { pos: "Top 4 — 20", amt: "$1,000" },
    ],
    leaders: [
      { r: 1, n: "tape_reader", ret: "+38.2%" },
      { r: 2, n: "frosty_bid", ret: "+31.7%" },
      { r: 3, n: "sigma_quant", ret: "+27.4%" },
      { r: 4, n: "pump_sensei", ret: "+22.9%" },
      { r: 5, n: "risk_off", ret: "+19.1%" },
    ],
    timeline: [
      { l: "Ouverture", d: "Aujourd'hui 00:00", done: true },
      { l: "En cours", d: "maintenant", done: true },
      { l: "Clôture", d: "Aujourd'hui 23:59", done: false },
    ],
  },
  {
    id: "whale-league",
    ico: "🐋",
    name: "Whale League",
    status: "live",
    desc: "Réservé au top 500 all-time. Capital $500 000, levier max 5×.",
    long: "L'arène des poids lourds. Seuls les 500 meilleurs traders de l'historique TIDE y accèdent. Gros capital, faible levier : ici, c'est la gestion du risque qui sépare les champions.",
    pot: "$20,000",
    fee: "Sur invitation",
    players: "487",
    cap: "500",
    pct: 97,
    daysLeft: 9,
    format: "Rendement net (%)",
    capital: "$500,000",
    leverage: "jusqu'à 5×",
    markets: "200+ paires",
    duration: "2 semaines",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$8,000" },
      { pos: "2ᵉ place", amt: "$5,000" },
      { pos: "3ᵉ place", amt: "$3,000" },
      { pos: "Top 4 — 25", amt: "$4,000" },
    ],
    leaders: [
      { r: 1, n: "cold_storage", ret: "+41.3%" },
      { r: 2, n: "delta_one", ret: "+36.8%" },
      { r: 3, n: "yield_hawk", ret: "+29.5%" },
      { r: 4, n: "alpha_djinn", ret: "+24.0%" },
      { r: 5, n: "veld_trades", ret: "+21.6%" },
    ],
    timeline: [
      { l: "Invitations envoyées", d: "18 juin", done: true },
      { l: "Coup d'envoi", d: "21 juin", done: true },
      { l: "Clôture", d: "05 juil.", done: false },
    ],
  },
  {
    id: "defi-only",
    ico: "🎯",
    name: "Defi Only",
    status: "live",
    desc: "Uniquement paires DeFi & L2. Le terrain des dégens stratèges.",
    long: "Un univers restreint aux tokens DeFi et aux écosystèmes Layer-2. Volatilité élevée, narratifs rapides : la compétition pour ceux qui vivent on-chain.",
    pot: "$8,000",
    fee: "Gratuit",
    players: "1 905",
    cap: "4 000",
    pct: 48,
    daysLeft: 6,
    format: "Rendement net (%)",
    capital: "$100,000",
    leverage: "jusqu'à 10×",
    markets: "DeFi & L2 uniquement",
    duration: "3 semaines",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$3,500" },
      { pos: "2ᵉ place", amt: "$1,800" },
      { pos: "3ᵉ place", amt: "$1,000" },
      { pos: "Top 4 — 30", amt: "$1,700" },
    ],
    leaders: [
      { r: 1, n: "onchain_oni", ret: "+88.4%" },
      { r: 2, n: "gigachadx", ret: "+72.1%" },
      { r: 3, n: "moon_archer", ret: "+61.9%" },
      { r: 4, n: "lambo_soon", ret: "+54.3%" },
      { r: 5, n: "apex_owl", ret: "+47.2%" },
    ],
    timeline: [
      { l: "Ouverture", d: "16 juin", done: true },
      { l: "En cours", d: "maintenant", done: true },
      { l: "Clôture", d: "07 juil.", done: false },
    ],
  },
  {
    id: "season-05",
    ico: "🏆",
    name: "Saison 05 — Championnat",
    status: "soon",
    desc: "La prochaine grande saison. Inscriptions ouvertes, départ dans 4 jours.",
    long: "La saison suivante du Grand Championnat, encore plus grosse. Cagnotte record de $75 000 et un capital de départ identique pour tous. Pré-inscris-toi pour réserver ta place sur la grille de départ.",
    pot: "$75,000",
    fee: "Gratuit",
    players: "6 120 pré-inscrits",
    cap: "",
    pct: 0,
    daysLeft: 4,
    startsIn: true,
    format: "Rendement net (%)",
    capital: "$100,000",
    leverage: "jusqu'à 20×",
    markets: "200+ paires spot & perp",
    duration: "6 semaines",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$22,000" },
      { pos: "2ᵉ place", amt: "$12,000" },
      { pos: "3ᵉ place", amt: "$6,000" },
      { pos: "Top 4 — 50", amt: "$35,000" },
    ],
    leaders: [],
    timeline: [
      { l: "Pré-inscriptions ouvertes", d: "24 juin", done: true },
      { l: "Coup d'envoi", d: "30 juin", done: false },
      { l: "Clôture", d: "11 août", done: false },
    ],
  },
  {
    id: "night-owls",
    ico: "🌙",
    name: "Night Owls",
    status: "soon",
    desc: "Compétition nocturne (22h–06h CET). Pour les traders du monde entier.",
    long: "Une compétition pensée pour les fuseaux horaires asiatiques et américains : seules les sessions nocturnes CET sont prises en compte. Le classement ne bouge que la nuit.",
    pot: "$3,000",
    fee: "Gratuit",
    players: "842 pré-inscrits",
    cap: "",
    pct: 0,
    daysLeft: 6,
    startsIn: true,
    format: "Rendement sessions nuit (%)",
    capital: "$50,000",
    leverage: "jusqu'à 10×",
    markets: "Majors & L1",
    duration: "10 nuits",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$1,200" },
      { pos: "2ᵉ place", amt: "$800" },
      { pos: "3ᵉ place", amt: "$500" },
      { pos: "Top 4 — 15", amt: "$500" },
    ],
    leaders: [],
    timeline: [
      { l: "Pré-inscriptions", d: "22 juin", done: true },
      { l: "1ʳᵉ nuit", d: "02 juil.", done: false },
      { l: "Clôture", d: "12 juil.", done: false },
    ],
  },
  {
    id: "solana-summer",
    ico: "◎",
    name: "Solana Summer · sponsorisé",
    status: "soon",
    desc: "Défi sponsorisé Solana. Récompenses en SOL + NFT exclusifs.",
    long: "Compétition sponsorisée par l'écosystème Solana. Trade les paires SOL et gagne tes récompenses directement en SOL, plus une collection de NFT exclusifs réservés aux 100 premiers.",
    pot: "$30,000",
    fee: "Gratuit",
    players: "2 410 pré-inscrits",
    cap: "",
    pct: 0,
    daysLeft: 12,
    startsIn: true,
    format: "Rendement net (%)",
    capital: "$100,000",
    leverage: "jusqu'à 15×",
    markets: "Écosystème Solana",
    duration: "4 semaines",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$10,000" },
      { pos: "2ᵉ place", amt: "$6,000" },
      { pos: "3ᵉ place", amt: "$3,500" },
      { pos: "Top 4 — 100", amt: "$10,500 + NFT" },
    ],
    leaders: [],
    timeline: [
      { l: "Pré-inscriptions", d: "20 juin", done: true },
      { l: "Coup d'envoi", d: "08 juil.", done: false },
      { l: "Clôture", d: "05 août", done: false },
    ],
  },
  {
    id: "season-03",
    ico: "🥇",
    name: "Saison 03 — Championnat",
    status: "ended",
    desc: "Remportée par quant_viper avec +212.4%. Archives & replay disponibles.",
    long: "La troisième édition du Grand Championnat, déjà entrée dans la légende. quant_viper a écrasé la concurrence avec un rendement de +212.4 %. Consulte le classement final et rejoue les meilleurs trades.",
    pot: "$50,000",
    fee: "Terminée",
    players: "10 044",
    cap: "",
    pct: 100,
    daysLeft: -1,
    format: "Rendement net (%)",
    capital: "$100,000",
    leverage: "jusqu'à 20×",
    markets: "200+ paires",
    duration: "6 semaines",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$15,000" },
      { pos: "2ᵉ place", amt: "$8,000" },
      { pos: "3ᵉ place", amt: "$4,000" },
      { pos: "Top 4 — 50", amt: "$23,000" },
    ],
    leaders: [
      { r: 1, n: "quant_viper", ret: "+212.4%" },
      { r: 2, n: "cold_storage", ret: "+167.8%" },
      { r: 3, n: "delta_one", ret: "+141.0%" },
      { r: 4, n: "yield_hawk", ret: "+122.5%" },
      { r: 5, n: "degen_maxi", ret: "+109.7%" },
    ],
    timeline: [
      { l: "Ouverture", d: "14 avril", done: true },
      { l: "Coup d'envoi", d: "21 avril", done: true },
      { l: "Clôture & distribution", d: "02 juin", done: true },
    ],
  },
  {
    id: "flash-crash",
    ico: "💥",
    name: "Flash Crash Cup",
    status: "ended",
    desc: "Tournoi de gestion du risque pendant la volatilité. Édition spéciale.",
    long: "Une édition spéciale déclenchée lors d'un épisode de forte volatilité. Le classement récompensait la meilleure préservation du capital plutôt que le rendement brut.",
    pot: "$6,000",
    fee: "Terminée",
    players: "4 870",
    cap: "",
    pct: 100,
    daysLeft: -1,
    format: "Drawdown minimal",
    capital: "$100,000",
    leverage: "jusqu'à 5×",
    markets: "Majors",
    duration: "72 heures",
    prizes: [
      { pos: "1ʳᵉ place", amt: "$2,500" },
      { pos: "2ᵉ place", amt: "$1,500" },
      { pos: "3ᵉ place", amt: "$900" },
      { pos: "Top 4 — 20", amt: "$1,100" },
    ],
    leaders: [
      { r: 1, n: "risk_off", ret: "−1.2%" },
      { r: 2, n: "cold_storage", ret: "−2.0%" },
      { r: 3, n: "frosty_bid", ret: "−2.8%" },
      { r: 4, n: "delta_one", ret: "−3.4%" },
      { r: 5, n: "sigma_quant", ret: "−4.1%" },
    ],
    timeline: [
      { l: "Annonce surprise", d: "10 mai", done: true },
      { l: "Coup d'envoi", d: "10 mai", done: true },
      { l: "Clôture", d: "13 mai", done: true },
    ],
  },
];

/** Renvoie la compétition par id, ou la première (vedette) par défaut. */
export function getComp(id?: string): CompetitionMock {
  const comp = COMPETITIONS.find((c) => c.id === id) ?? COMPETITIONS[0];
  if (!comp) {
    throw new Error("COMPETITIONS ne doit jamais être vide");
  }
  return comp;
}
