import type { RawArticle } from "../types";

/* Perps — perp vs spot, pas d'expiration, funding, levier, liquidation.
 * Exactitude Tide : le perp est SIMULÉ en Paper (pas de levier réel, pas
 * d'emprunt), levier max 100x, marge isolée, PnL plancher à -marge à la
 * fermeture, pas de liquidation auto serveur, TP/SL déclencheurs client. */
export const whatIsAPerpetual: RawArticle = {
  slug: "what-is-a-perpetual",
  category: "perps",
  difficulty: "intermediate",
  minutes: 9,
  featured: false,
  popular: true,
  updated: "2026-07-02",
  keywords: [
    "what is a perpetual future",
    "perpetual futures",
    "perp trading",
    "funding rate",
    "crypto leverage",
    "long vs short",
    "liquidation",
    "paper trading perps",
  ],
  title: {
    en: "What is a perpetual future?",
    fr: "C'est quoi un future perpétuel ?",
  },
  seoTitle: {
    en: "What Is a Perpetual Future? Perps, Funding & Leverage",
    fr: "C'est quoi un future perpétuel ? Perps, funding et levier",
  },
  seoDescription: {
    en: "Perpetual futures explained: how a perp tracks spot price, funding rates, leverage, long vs short and liquidation — plus how to practise perps risk-free on Tide.",
    fr: "Le future perpétuel expliqué : comment un perp colle au spot, le funding, le levier, long vs short et la liquidation — et comment t'entraîner sans risque sur Tide.",
  },
  dek: {
    en: "The most traded product in crypto. No expiry, tracks the spot price, and lets you go long or short with leverage.",
    fr: "Le produit le plus tradé en crypto. Sans expiration, colle au prix spot, et te laisse aller long ou short avec levier.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "A **perpetual future** — a \"perp\" — is the single most traded product in crypto, and it's the reason most traders eventually stop buying coins outright. A perpetual future is a contract that tracks an asset's price without you ever owning the asset. Unlike a traditional future, it never expires: you can hold it for five minutes or five months. This guide breaks down how a perp works, why the price stays glued to spot, and how leverage turns it into the sharpest tool on the terminal.",
        fr: "Un **future perpétuel** — un « perp » — est le produit le plus tradé en crypto, et c'est la raison pour laquelle la plupart des traders finissent par arrêter d'acheter les pièces en direct. Un future perpétuel est un contrat qui suit le prix d'un actif sans que tu possèdes jamais l'actif. Contrairement à un future classique, il n'expire jamais : tu le gardes cinq minutes ou cinq mois. Ce guide décortique comment marche un perp, pourquoi le prix reste collé au spot, et comment le levier en fait l'outil le plus tranchant du terminal.",
      },
    },
    {
      type: "h",
      text: { en: "A perpetual future in one sentence", fr: "Le future perpétuel en une phrase" },
    },
    {
      type: "p",
      text: {
        en: "A perp is a **bet on the price of an asset, not the asset itself**. You put up some cash as *margin*, pick a direction, and your profit or loss moves with the price — without you ever touching the underlying coin. Because nothing physical changes hands, you can just as easily bet the price falls as bet it rises. That's the whole appeal: one instrument, two directions, no expiry.",
        fr: "Un perp est un **pari sur le prix d'un actif, pas sur l'actif lui-même**. Tu déposes du cash en *marge*, tu choisis une direction, et ton gain ou ta perte bouge avec le prix — sans jamais toucher la pièce sous-jacente. Comme rien de physique ne change de mains, tu peux aussi bien parier sur la baisse que sur la hausse. Tout l'intérêt est là : un seul instrument, deux directions, pas d'expiration.",
      },
    },
    {
      type: "h",
      text: { en: "Perp vs spot: the core difference", fr: "Perp vs spot : la différence de base" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Spot** — you buy the actual asset. Own 1 ETH and it's yours; you only profit if it goes up, and you can't lose more than you paid.",
          fr: "**Spot** — tu achètes l'actif réel. Détiens 1 ETH et il est à toi ; tu ne gagnes que s'il monte, et tu ne peux pas perdre plus que ce que tu as payé.",
        },
        {
          en: "**Perp** — you trade a contract on the price. You never hold the coin, you can go long *or* short, and leverage lets you control a position bigger than your cash.",
          fr: "**Perp** — tu trades un contrat sur le prix. Tu ne détiens jamais la pièce, tu peux aller long *ou* short, et le levier te laisse piloter une position plus grosse que ton cash.",
        },
        {
          en: "**Spot is for owning; perp is for trading.** Spot suits a long-term hold; a perp is built for fast, two-way, short-term moves.",
          fr: "**Le spot sert à posséder ; le perp sert à trader.** Le spot convient à une détention longue ; un perp est fait pour des mouvements rapides, courts et bidirectionnels.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Long and short: two ways to be right", fr: "Long et short : deux façons d'avoir raison" },
    },
    {
      type: "p",
      text: {
        en: "With a perp you pick a side before you enter. Go **long** and you profit when the price rises. Go **short** and you profit when it falls — the perp *sells* the contract first and buys it back cheaper. This is what a perpetual future unlocks over plain spot: you can make money in a red market instead of just waiting it out.",
        fr: "Avec un perp, tu choisis un camp avant d'entrer. Va **long** et tu gagnes quand le prix monte. Va **short** et tu gagnes quand il baisse — le perp *vend* le contrat d'abord et le rachète moins cher. C'est ce qu'un future perpétuel débloque par rapport au spot pur : tu peux gagner sur un marché rouge au lieu de juste l'attendre.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Long** — betting up. Profit = (exit − entry) × size. A green candle is your friend.",
          fr: "**Long** — pari à la hausse. Gain = (sortie − entrée) × taille. Une bougie verte est ton amie.",
        },
        {
          en: "**Short** — betting down. Profit = (entry − exit) × size. You win when everyone else is panicking.",
          fr: "**Short** — pari à la baisse. Gain = (entrée − sortie) × taille. Tu gagnes quand tout le monde panique.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Leverage: doing more with less", fr: "Le levier : faire plus avec moins" },
    },
    {
      type: "p",
      text: {
        en: "Leverage lets a small amount of margin control a large position. At **10x**, $100 of margin drives a $1,000 position — so a 1% move in the price becomes a 10% move on your money. It cuts both ways with brutal symmetry: leverage multiplies gains *and* losses by the same factor. The higher the leverage, the smaller the move needed to double your margin — or to wipe it out.",
        fr: "Le levier laisse une petite marge piloter une grosse position. À **10x**, 100 $ de marge pilotent une position de 1 000 $ — donc un mouvement de 1 % du prix devient 10 % sur ton argent. Ça coupe dans les deux sens avec une symétrie brutale : le levier multiplie les gains *et* les pertes par le même facteur. Plus le levier est élevé, plus le mouvement nécessaire pour doubler ta marge — ou l'effacer — est petit.",
      },
    },
    {
      type: "example",
      title: { en: "A 10x long, step by step", fr: "Un long 10x, pas à pas" },
      rows: [
        { k: { en: "Margin posted", fr: "Marge déposée" }, v: { en: "$100", fr: "100 $" } },
        { k: { en: "Leverage", fr: "Levier" }, v: { en: "10x", fr: "10x" } },
        { k: { en: "Position size", fr: "Taille de position" }, v: { en: "$1,000", fr: "1 000 $" } },
        { k: { en: "Price move", fr: "Mouvement du prix" }, v: { en: "+5%", fr: "+5 %" } },
        { k: { en: "Profit", fr: "Gain" }, v: { en: "+$50 (+50% on margin)", fr: "+50 $ (+50 % sur la marge)" } },
      ],
    },
    {
      type: "h",
      text: { en: "How a perp stays glued to spot: funding", fr: "Comment un perp reste collé au spot : le funding" },
    },
    {
      type: "p",
      text: {
        en: "Since a perpetual future has no expiry to anchor it, a mechanism called the **funding rate** keeps it tied to the real (spot) price. Periodically, one side pays the other: when the perp trades above spot, longs pay shorts; when it trades below, shorts pay longs. It's a small, recurring nudge that drags the contract back toward reality — and a real cost to factor in whenever you hold a position for a long time.",
        fr: "Comme un future perpétuel n'a pas d'échéance pour l'ancrer, un mécanisme appelé **taux de funding** le maintient collé au prix réel (spot). Périodiquement, un camp paie l'autre : quand le perp trade au-dessus du spot, les longs paient les shorts ; en dessous, les shorts paient les longs. C'est une petite poussée récurrente qui ramène le contrat vers la réalité — et un vrai coût à intégrer dès que tu gardes une position longtemps.",
      },
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Funding in plain words", fr: "Le funding en clair" },
      text: {
        en: "Think of funding as a rent that the crowded side of the trade pays to the other side. When everyone is long and greedy, longs pay — the market taxes consensus. It rarely decides a scalp, but over days it quietly eats or feeds your P&L.",
        fr: "Vois le funding comme un loyer que le camp bondé du trade paie à l'autre camp. Quand tout le monde est long et avide, les longs paient — le marché taxe le consensus. Ça décide rarement d'un scalp, mais sur plusieurs jours ça grignote ou nourrit ton P&L en silence.",
      },
    },
    {
      type: "h",
      text: { en: "Margin and liquidation: the risk that bites", fr: "Marge et liquidation : le risque qui mord" },
    },
    {
      type: "p",
      text: {
        en: "Your margin is the collateral backing the position. If the price moves against you far enough that the loss approaches your margin, the position is **liquidated** — closed to stop you owing more than you put up. The higher your leverage, the closer that liquidation price sits to your entry. This is the number one way beginners blow up: max leverage plus a normal wiggle equals a wiped account. Respect it and leverage is a tool; ignore it and it's a trap.",
        fr: "Ta marge est le collatéral qui soutient la position. Si le prix va contre toi assez loin pour que la perte s'approche de ta marge, la position est **liquidée** — fermée pour t'empêcher de devoir plus que ce que tu as déposé. Plus ton levier est élevé, plus ce prix de liquidation est proche de ton entrée. C'est la première façon dont les débutants explosent : levier max plus un simple soubresaut égale compte effacé. Respecte-le et le levier est un outil ; ignore-le et c'est un piège.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How perps work on Tide", fr: "Comment marchent les perps sur Tide" },
      text: {
        en: "Perps on Tide are **simulated in Paper only — no real leverage, no borrowed money, nothing liquidated on-chain**. You can size up to **100x on isolated margin**, and the goal is to learn how longs, shorts, leverage and liquidation *behave* safely. Two things to know: there is **no server-side auto-liquidation** — your realized loss is simply **floored at your margin when you close**, so a runaway position can't drain more than the margin you committed. And your **TP/SL and limit orders are client-side triggers**: they only fire while your browser tab stays open, and only the execution is reported to the backend. Your simulated P&L still feeds the leaderboard.",
        fr: "Les perps sur Tide sont **simulés en Paper uniquement — pas de levier réel, pas d'argent emprunté, rien de liquidé on-chain**. Tu peux monter jusqu'à **100x en marge isolée**, et le but est d'apprendre comment longs, shorts, levier et liquidation *se comportent* en sécurité. Deux choses à savoir : il n'y a **pas de liquidation auto côté serveur** — ta perte réalisée est simplement **plafonnée à ta marge à la fermeture**, donc une position qui dérape ne peut pas te coûter plus que la marge engagée. Et tes **ordres TP/SL et limit sont des déclencheurs côté client** : ils ne se déclenchent que tant que ton onglet reste ouvert, et seule l'exécution remonte au backend. Ton P&L simulé alimente quand même le classement.",
      },
    },
    {
      type: "h",
      text: { en: "The cost of entering: fees", fr: "Le coût d'entrée : les frais" },
    },
    {
      type: "p",
      text: {
        en: "Every perp position on Tide charges a small fee at open, deducted from virtual capital: **0.02% maker** or **0.06% taker**. Tide does not charge a fee on **Live** spot swaps, and the current winner-takes-all competitions take no rake from their XRP ticket pool.",
        fr: "Chaque position perp sur Tide prélève un petit frais à l'ouverture sur le capital virtuel : **0,02 % maker** ou **0,06 % taker**. Tide ne prélève pas de frais sur les swaps spot **Live**, et les compétitions winner-takes-all actuelles ne prélèvent aucun rake sur leur pool de tickets XRP.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Learn leverage before it learns you", fr: "Apprends le levier avant qu'il ne t'apprenne" },
      text: {
        en: "Real perps liquidate accounts in seconds. On Tide you get the exact same mechanics — long, short, leverage, funding, margin — with virtual capital, so a blow-up costs you rank, not rent. Push the leverage slider on purpose, watch a position get wiped, and build the reflexes here before a single dollar is at stake.",
        fr: "Les vrais perps liquident des comptes en quelques secondes. Sur Tide tu as exactement la même mécanique — long, short, levier, funding, marge — avec un capital virtuel, donc une explosion te coûte du classement, pas ton loyer. Pousse le curseur de levier exprès, regarde une position se faire effacer, et acquiers les réflexes ici avant qu'un seul dollar ne soit en jeu.",
      },
    },
    {
      type: "h",
      text: { en: "Perps vs Live spot on Tide", fr: "Perps vs spot Live sur Tide" },
    },
    {
      type: "p",
      text: {
        en: "Keep the two modes clear in your head. **Perps are Paper only** — leverage, shorts and liquidation, all simulated to train on the top 250 crypto markets. **Live mode is real spot only**: a genuine, non-custodial XRP-vs-RLUSD swap signed with Xaman or GemWallet and tagged with a SourceTag. There is no real leverage anywhere on Tide, and Live is never a perp. Learn the sharp stuff in Paper; take proven habits into Live.",
        fr: "Garde les deux modes bien distincts en tête. **Les perps sont en Paper uniquement** — levier, shorts et liquidation, tout simulé pour t'entraîner sur les 250 plus gros marchés crypto. **Le mode Live est du spot réel uniquement** : un vrai swap non-custodial XRP contre RLUSD signé avec Xaman ou GemWallet et taggé d'un SourceTag. Il n'y a de levier réel nulle part sur Tide, et le Live n'est jamais un perp. Apprends les trucs tranchants en Paper ; emporte des habitudes prouvées en Live.",
      },
    },
    {
      type: "h",
      text: { en: "Trade your first perp", fr: "Trade ton premier perp" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Open the terminal in Paper mode, switch the ticket to **perp**, and pick a market you follow.",
          fr: "Ouvre le terminal en mode Paper, bascule le ticket en **perp**, et choisis un marché que tu suis.",
        },
        {
          en: "Choose a direction — long or short — and start with **low leverage** (2x–5x) while you learn the feel.",
          fr: "Choisis une direction — long ou short — et démarre en **levier faible** (2x–5x) le temps de prendre le pli.",
        },
        {
          en: "Set your TP and SL *before* you enter, and remember they only fire while the tab is open.",
          fr: "Fixe ton TP et ton SL *avant* d'entrer, et souviens-toi qu'ils ne se déclenchent que tant que l'onglet est ouvert.",
        },
        {
          en: "Close the position, read the realized P&L, and note what the leverage did to the swing.",
          fr: "Ferme la position, lis le P&L réalisé, et note ce que le levier a fait à l'amplitude.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "Leverage doesn't make you a better trader. It makes you a faster one — in both directions.",
        fr: "Le levier ne fait pas de toi un meilleur trader. Il te rend plus rapide — dans les deux sens.",
      },
    },
  ],
  related: ["leverage-and-margin", "long-and-short", "how-tide-works"],
};
