import type { RawArticle } from "../types";

/* Basics — le produit : Paper vs Live, capital virtuel, compétitions, track
 * record on-chain. Exactitude : Live = spot XRP non-custodial taggé SourceTag,
 * capital virtuel formulé de façon neutre, perp simulé en Paper. */
export const howTideWorks: RawArticle = {
  slug: "how-tide-works",
  category: "basics",
  difficulty: "beginner",
  minutes: 9,
  popular: true,
  updated: "2026-07-02",
  keywords: [
    "how tide works",
    "paper trading",
    "paper vs live trading",
    "trading simulator",
    "xrpl dex trading",
    "crypto trading competitions",
    "non-custodial trading",
    "trading track record",
  ],
  title: {
    en: "How Tide works: Paper vs Live",
    fr: "Comment marche Tide : Paper vs Live",
  },
  seoTitle: {
    en: "How Tide Works: Paper vs Live Trading Explained",
    fr: "Comment marche Tide : le trading Paper vs Live expliqué",
  },
  seoDescription: {
    en: "How Tide works: trade the top 250 crypto markets in Paper with virtual capital, compete for prizes, then go Live with real non-custodial spot swaps on the XRPL.",
    fr: "Comment marche Tide : trade le top 250 crypto en Paper avec du capital virtuel, gagne des tournois, puis passe en Live avec de vrais swaps spot non-custodial sur le XRPL.",
  },
  dek: {
    en: "One product, two modes. Learn risk-free, prove your edge, then trade for real — same UI, same markets, same adrenaline.",
    fr: "Un produit, deux modes. Apprends sans risque, prouve ton edge, puis trade pour de vrai — même UI, mêmes marchés, même adrénaline.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "How Tide works is simple to say and powerful in practice: it's a trading trainer built on the XRP Ledger where you learn on real markets before you risk a cent. The same instinct — \"I want to trade\" — usually collides with the same fear: \"I don't want to get rekt learning.\" Tide pulls those apart into two modes that share one terminal, one live price feed and one leaderboard. You practice in **Paper**, prove your edge, and only then flip to **Live** on your own terms.",
        fr: "Comment marche Tide, c'est simple à dire et puissant en pratique : c'est un terrain d'entraînement au trading bâti sur le XRP Ledger où tu apprends sur de vrais marchés avant de risquer un centime. Le même instinct — « je veux trader » — se heurte d'habitude à la même peur : « je ne veux pas me faire rekt en apprenant ». Tide sépare les deux en deux modes qui partagent un terminal, un flux de prix live et un classement. Tu t'entraînes en **Paper**, tu prouves ton edge, et seulement ensuite tu bascules en **Live** à tes conditions.",
      },
    },
    {
      type: "h",
      text: { en: "One terminal, two modes", fr: "Un terminal, deux modes" },
    },
    {
      type: "p",
      text: {
        en: "The whole design of how Tide works rests on a single idea: **the training ground and the real thing should look identical**. Same charts, same order ticket, same markets, same leaderboard. The only thing that changes between Paper and Live is whether real money is on the line. That way, nothing you learn is wasted when you go Live — your reflexes transfer one-to-one.",
        fr: "Tout le design de Tide repose sur une seule idée : **le terrain d'entraînement et le réel doivent être identiques**. Mêmes graphiques, même ticket d'ordre, mêmes marchés, même classement. La seule chose qui change entre Paper et Live, c'est de savoir si de l'argent réel est en jeu. Comme ça, rien de ce que tu apprends n'est perdu au passage en Live — tes réflexes se transfèrent au un pour un.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Paper** — virtual capital, real prices, zero risk. Where you build skill and rank.",
          fr: "**Paper** — capital virtuel, prix réels, zéro risque. Là où tu construis ton skill et ton rang.",
        },
        {
          en: "**Live** — a real spot swap signed in your own wallet. Where you put a proven edge to work.",
          fr: "**Live** — un vrai swap spot signé dans ton propre wallet. Là où tu mets un edge prouvé au travail.",
        },
        {
          en: "**Shared** — the same top-250 markets, the same live feed, the same terminal muscle memory across both.",
          fr: "**Partagé** — les mêmes 250 marchés, le même flux live, la même mémoire musculaire du terminal des deux côtés.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Paper mode — learn for free", fr: "Mode Paper — apprends gratuitement" },
    },
    {
      type: "p",
      text: {
        en: "In **Paper** you get virtual capital and trade real markets — the **top 250 crypto by market cap**, priced on live data. Every order, every P&L, every rank is computed against genuine market conditions. No deposit, no KYC, no real money at risk. Think of it as a flight simulator: real cockpit, real weather, zero consequences if you crash. You can go spot or open a simulated perp, use market or limit orders, and set take-profit / stop-loss — all with fake money and real feedback.",
        fr: "En **Paper** tu reçois du capital virtuel et tu trades de vrais marchés — le **top 250 crypto en capitalisation**, cotés sur des données live. Chaque ordre, chaque P&L, chaque rang est calculé contre de vraies conditions de marché. Pas de dépôt, pas de KYC, pas d'argent réel en jeu. Vois ça comme un simulateur de vol : vrai cockpit, vraie météo, zéro conséquence si tu te crashes. Tu peux faire du spot ou ouvrir un perp simulé, utiliser des ordres market ou limit, et poser des take-profit / stop-loss — le tout en argent fictif avec un retour bien réel.",
      },
    },
    {
      type: "h",
      text: { en: "Perp & leverage — simulated, on purpose", fr: "Perp & levier — simulés, volontairement" },
    },
    {
      type: "p",
      text: {
        en: "Leverage lets a small deposit (your **margin**) control a bigger position, which multiplies both gains and losses. On Tide, perps and leverage live **only in Paper**, as a simulation — there's no borrowed money and no real counterparty. The point is to let you feel how leverage behaves — how fast a 20x position swings — without a margin call ever touching a real wallet.",
        fr: "Le levier permet à un petit dépôt (ta **marge**) de contrôler une position plus grosse, ce qui multiplie gains et pertes. Sur Tide, les perps et le levier vivent **uniquement en Paper**, en simulation — pas d'argent emprunté, pas de vraie contrepartie. L'idée : te faire ressentir comment le levier se comporte — à quelle vitesse une position 20x oscille — sans qu'un appel de marge ne touche jamais un vrai wallet.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How perp works on Tide", fr: "Comment marche le perp sur Tide" },
      text: {
        en: "Leverage caps at **100x** and margin is **isolated** (only what you put on that position is at stake). There's **no server-side auto-liquidation**: your realized P&L is floored at **−margin** only when you close, so a position can't drain more than the margin behind it. TP/SL and limit orders are **client-side triggers** — they fire from your browser, so the tab has to stay open for them to execute. It's a faithful model of leverage, minus the part that empties real accounts.",
        fr: "Le levier plafonne à **100x** et la marge est **isolée** (seul ce que tu poses sur la position est en jeu). Il n'y a **pas de liquidation auto côté serveur** : ton P&L réalisé est plafonné à **−marge** uniquement à la fermeture, donc une position ne peut pas coûter plus que la marge derrière elle. Les TP/SL et ordres limit sont des **déclencheurs côté client** — ils partent de ton navigateur, l'onglet doit donc rester ouvert pour qu'ils s'exécutent. C'est un modèle fidèle du levier, sans la partie qui vide les vrais comptes.",
      },
    },
    {
      type: "example",
      title: { en: "A simulated 10x long, step by step", fr: "Un long 10x simulé, pas à pas" },
      rows: [
        { k: { en: "Margin posted", fr: "Marge posée" }, v: { en: "$500 (isolated)", fr: "500 $ (isolée)" } },
        { k: { en: "Leverage", fr: "Levier" }, v: { en: "10x → $5,000 position", fr: "10x → position 5 000 $" } },
        { k: { en: "Open fee (taker 0.06%)", fr: "Frais d'ouverture (taker 0,06 %)" }, v: { en: "−$3", fr: "−3 $" } },
        { k: { en: "Price rises +4%", fr: "Le prix monte +4 %" }, v: { en: "+$200 on position", fr: "+200 $ sur la position" } },
        { k: { en: "Realized P&L at close", fr: "P&L réalisé à la fermeture" }, v: { en: "+$197 (≈ +39% on margin)", fr: "+197 $ (≈ +39 % sur la marge)" } },
      ],
    },
    {
      type: "h",
      text: { en: "Live mode — trade for real", fr: "Mode Live — trade pour de vrai" },
    },
    {
      type: "p",
      text: {
        en: "When you're ready, **Live** executes a real **spot swap** on the XRPL's native DEX, signed in your own wallet (**Xaman** or **GemWallet**). It's **non-custodial** — Tide never holds your funds; you sign every transaction yourself. The terminal turns amber to remind you real money is on the line, and each Live trade carries a **SourceTag** so the swap is attributable on-chain. Live is deliberately narrow: real spot, no leverage, so the step from Paper to Live is a change of stakes, not a change of game.",
        fr: "Quand tu es prêt, **Live** exécute un vrai **swap spot** sur le DEX natif du XRPL, signé dans ton propre wallet (**Xaman** ou **GemWallet**). C'est **non-custodial** — Tide ne détient jamais tes fonds ; tu signes chaque transaction toi-même. Le terminal vire à l'ambre pour te rappeler que de l'argent réel est en jeu, et chaque trade Live porte un **SourceTag** pour que le swap soit attribuable on-chain. Le Live est volontairement étroit : du vrai spot, pas de levier, pour que le passage de Paper à Live soit un changement d'enjeu, pas un changement de jeu.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "What Live is — and isn't", fr: "Ce qu'est le Live — et ce qu'il n'est pas" },
      text: {
        en: "Live today is **spot only** — real **XRP against RLUSD** — not leverage. Perps and leverage stay in Paper as a simulation. Tide charges **no fee on swaps**; the server just bounds your order with best execution and a slippage cap before you sign. So going Live means owning the asset outright, in your own wallet, with no borrowed money and no liquidation risk.",
        fr: "Le Live aujourd'hui est **spot uniquement** — du vrai **XRP contre RLUSD** — pas du levier. Les perps et le levier restent en Paper, en simulation. Tide ne prend **aucun frais sur les swaps** ; le serveur borne juste ton ordre avec best execution et un plafond de slippage avant que tu signes. Passer en Live, c'est donc posséder l'actif pour de vrai, dans ton propre wallet, sans argent emprunté ni risque de liquidation.",
      },
    },
    {
      type: "h",
      text: { en: "Competitions & the prize pool", fr: "Compétitions & cagnotte" },
    },
    {
      type: "p",
      text: {
        en: "Paper isn't practice in a vacuum — you **compete**. A paid competition uses a server-built XRP entry ticket. Validated entries form the prize pool, and rank #1 receives **100% of it**: no rake, no fictional sponsor amount and no split payout. The Paper score is the real percentage return from your persisted equity snapshot at entry.",
        fr: "Le Paper n'est pas de l'entraînement dans le vide — tu es en **compétition**. Une compétition payante utilise un ticket XRP construit côté serveur. Les entrées validées forment la cagnotte, et le rang #1 en reçoit **100 %** : aucun rake, aucun montant sponsor fictif et aucun partage. Le score Paper est le vrai rendement depuis ton snapshot d'equity persisté à l'inscription.",
      },
    },
    {
      type: "h",
      text: { en: "Your track record", fr: "Ton track record" },
    },
    {
      type: "p",
      text: {
        en: "Over time you build a **verifiable track record**: proof of your edge, measured on the same virtual capital as everyone else. It's the point of the whole loop — a leaderboard history you can point to before you ever risk real money, and the honest signal that tells you when you're actually ready to go Live.",
        fr: "Avec le temps tu construis un **track record vérifiable** : la preuve de ton edge, mesurée sur le même capital virtuel que tout le monde. C'est le but de toute la boucle — un historique de classement que tu peux montrer avant même de risquer de l'argent réel, et le signal honnête qui te dit quand tu es vraiment prêt à passer en Live.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Learn the reflexes first", fr: "Acquiers d'abord les réflexes" },
      text: {
        en: "Do your losing here. Blow up a leveraged position, mistime a stop, chase a pump — all of it costs you rank, not rent. Every mistake in Paper is a lesson you didn't pay for in cash, and every good habit you drill transfers straight into Live.",
        fr: "Fais tes pertes ici. Fais exploser une position à levier, rate un stop, cours après un pump — tout ça te coûte du classement, pas ton loyer. Chaque erreur en Paper est une leçon que tu n'as pas payée en cash, et chaque bonne habitude que tu ancres se transfère directement en Live.",
      },
    },
    {
      type: "h",
      text: { en: "The loop, start to finish", fr: "La boucle, du début à la fin" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Open the terminal in Paper and place your first trade on a real market — spot or a simulated perp.",
          fr: "Ouvre le terminal en Paper et place ton premier trade sur un vrai marché — spot ou perp simulé.",
        },
        {
          en: "Join a competition and climb the leaderboard against real people on the same virtual capital.",
          fr: "Rejoins une compétition et grimpe au classement contre de vraies personnes, à capital virtuel égal.",
        },
        {
          en: "Build a track record — enough of a sample that your edge is real, not luck.",
          fr: "Construis un track record — un échantillon assez large pour que ton edge soit réel, pas de la chance.",
        },
        {
          en: "When it's proven, connect Xaman or GemWallet and go Live on a real spot swap, on your own terms.",
          fr: "Quand il est prouvé, connecte Xaman ou GemWallet et passe en Live sur un vrai swap spot, à tes conditions.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "Learn where mistakes cost rank, not rent. Go Live only once the leaderboard says you're ready.",
        fr: "Apprends là où les erreurs coûtent du classement, pas ton loyer. Passe en Live seulement quand le classement dit que tu es prêt.",
      },
    },
  ],
  related: ["what-is-trading", "winning-competitions", "on-chain-track-record"],
};
