import type { RawArticle } from "../types";

/* Basics — le produit : Paper vs Live, capital virtuel, compétitions, track
 * record on-chain. Exactitude : Live = spot XRP non-custodial taggé SourceTag,
 * capital virtuel formulé de façon neutre. */
export const howTideWorks: RawArticle = {
  slug: "how-tide-works",
  category: "basics",
  difficulty: "beginner",
  minutes: 6,
  icon: "🛟",
  title: {
    en: "How Tide works: Paper vs Live",
    fr: "Comment marche Tide : Paper vs Live",
  },
  dek: {
    en: "One product, two modes. Learn risk-free, prove your edge, then trade for real — same UI, same markets.",
    fr: "Un produit, deux modes. Apprends sans risque, prouve ton edge, puis trade pour de vrai — même UI, mêmes marchés.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Tide is a trading trainer built on the XRP Ledger. It exists because the same instinct — \"I want to trade\" — usually collides with the same fear: \"I don't want to get rekt learning.\" Tide splits those apart into two modes that share one terminal, one price feed and one leaderboard.",
        fr: "Tide est un terrain d'entraînement au trading bâti sur le XRP Ledger. Il existe parce que le même instinct — « je veux trader » — se heurte d'habitude à la même peur : « je ne veux pas me faire rekt en apprenant ». Tide sépare les deux en deux modes qui partagent un terminal, un flux de prix et un classement.",
      },
    },
    {
      type: "h",
      text: { en: "Paper mode — learn for free", fr: "Mode Paper — apprends gratuitement" },
    },
    {
      type: "p",
      text: {
        en: "In **Paper** you get virtual capital and trade real markets — the top 250 by market cap — on live prices. Every order, every P&L, every rank is computed off-chain against genuine market data. No deposit, no KYC, no real money at risk. It's a flight simulator: real cockpit, real weather, zero consequences if you crash.",
        fr: "En **Paper** tu reçois du capital virtuel et tu trades de vrais marchés — le top 250 en capitalisation — sur des prix live. Chaque ordre, chaque P&L, chaque rang est calculé off-chain contre de vraies données de marché. Pas de dépôt, pas de KYC, pas d'argent réel en jeu. C'est un simulateur de vol : vrai cockpit, vraie météo, zéro conséquence si tu te crashes.",
      },
    },
    {
      type: "h",
      text: { en: "Live mode — trade for real", fr: "Mode Live — trade pour de vrai" },
    },
    {
      type: "p",
      text: {
        en: "When you're ready, **Live** executes a real spot swap on the XRPL's native DEX, signed in your own wallet (Xaman or GemWallet). It's **non-custodial** — Tide never holds your funds, you sign every transaction yourself. The terminal turns amber to remind you real money is on the line.",
        fr: "Quand tu es prêt, **Live** exécute un vrai swap spot sur le DEX natif du XRPL, signé dans ton propre wallet (Xaman ou GemWallet). C'est **non-custodial** — Tide ne détient jamais tes fonds, tu signes chaque transaction toi-même. Le terminal vire à l'ambre pour te rappeler que de l'argent réel est en jeu.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "What Live is — and isn't", fr: "Ce qu'est le Live — et ce qu'il n'est pas" },
      text: {
        en: "Live today is **spot only** (real XRP against RLUSD), not leverage. Leverage and perps live in Paper as a simulation — no borrowed money, no real liquidation. So you can learn how leverage behaves without a margin call ever touching your wallet.",
        fr: "Le Live aujourd'hui est **spot uniquement** (vrai XRP contre RLUSD), pas du levier. Le levier et les perps vivent en Paper, en simulation — pas d'argent emprunté, pas de vraie liquidation. Tu apprends donc comment le levier se comporte sans qu'un appel de marge ne touche jamais ton wallet.",
      },
    },
    {
      type: "h",
      text: { en: "Competitions & your track record", fr: "Compétitions & ton track record" },
    },
    {
      type: "p",
      text: {
        en: "Paper isn't practice in a vacuum — you compete. Seasons and flash tournaments rank everyone on the same virtual capital, and top finishers share a prize pool. Over time you build a **verifiable track record**: proof of your edge you can carry with you before you ever risk real capital.",
        fr: "Le Paper n'est pas de l'entraînement dans le vide — tu es en compétition. Saisons et tournois éclair classent tout le monde sur le même capital virtuel, et les meilleurs se partagent une cagnotte. Avec le temps tu construis un **track record vérifiable** : la preuve de ton edge, que tu emportes avec toi avant même de risquer du capital réel.",
      },
    },
    {
      type: "steps",
      items: [
        {
          en: "Open the terminal in Paper and place your first trade on a real market.",
          fr: "Ouvre le terminal en Paper et place ton premier trade sur un vrai marché.",
        },
        {
          en: "Join a competition and climb the leaderboard against real people.",
          fr: "Rejoins une compétition et grimpe au classement contre de vraies personnes.",
        },
        {
          en: "When your edge is proven, connect a wallet and go Live on your own terms.",
          fr: "Quand ton edge est prouvé, connecte un wallet et passe en Live à tes conditions.",
        },
      ],
    },
  ],
  related: ["what-is-trading", "winning-competitions", "on-chain-track-record"],
};
