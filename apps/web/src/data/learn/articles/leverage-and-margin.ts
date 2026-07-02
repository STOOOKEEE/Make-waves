import type { RawArticle } from "../types";

/* Perps — levier, marge isolée, notional, liquidation, funding. Exactitude Tide :
 * perp SIMULÉ en Paper, cap 100x, marge isolée, PnL planchonné à -marge à la
 * fermeture, pas d'auto-liq serveur, fees maker 0.02% / taker 0.06%, TP/SL
 * déclencheurs côté client. GOLD STANDARD de profondeur (cf. what-is-trading). */
export const leverageAndMargin: RawArticle = {
  slug: "leverage-and-margin",
  category: "perps",
  difficulty: "advanced",
  minutes: 9,
  popular: true,
  updated: "2026-07-02",
  keywords: [
    "leverage and margin",
    "what is leverage in trading",
    "isolated margin",
    "liquidation price",
    "notional value",
    "crypto perpetuals",
    "margin trading",
    "paper trading",
  ],
  title: {
    en: "Leverage & margin, explained",
    fr: "Levier & marge, expliqués",
  },
  seoTitle: {
    en: "Leverage & Margin Explained: How Leverage Trading Works",
    fr: "Levier & marge expliqués : comment fonctionne le levier",
  },
  seoDescription: {
    en: "Leverage and margin explained for traders: notional, isolated margin, liquidation and funding — with a worked example and how to practice risk-free on Tide.",
    fr: "Levier et marge expliqués aux traders : notional, marge isolée, liquidation et funding — avec un exemple chiffré et comment t'entraîner sans risque sur Tide.",
  },
  dek: {
    en: "Leverage multiplies your size — and your risk. Here's exactly how margin, notional, liquidation and funding fit together.",
    fr: "Le levier multiplie ta taille — et ton risque. Voici précisément comment marge, notional, liquidation et funding s'emboîtent.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "**Leverage** lets you control a position larger than your cash. At **10x**, $1,000 controls a $10,000 position. Your gains and losses are calculated on the big number, not the small one — which is the whole point, and the whole danger. Margin is the deposit that makes it possible. Get these two words right and the rest of perp trading — notional, liquidation, funding — falls into place fast.",
        fr: "Le **levier** te permet de piloter une position plus grosse que ton cash. À **10x**, 1 000 $ pilotent une position de 10 000 $. Tes gains et pertes se calculent sur le gros chiffre, pas le petit — c'est tout l'intérêt, et tout le danger. La marge est le dépôt qui rend ça possible. Comprends bien ces deux mots et le reste du trading perp — notional, liquidation, funding — s'emboîte très vite.",
      },
    },
    {
      type: "h",
      text: { en: "What leverage actually is", fr: "Ce qu'est vraiment le levier" },
    },
    {
      type: "p",
      text: {
        en: "Leverage is borrowed size. Instead of buying $1,000 of an asset outright, you post $1,000 as collateral and the exchange lets you open a position worth several times that. Nothing about the market changes — the price still moves the same percentage. What changes is *your exposure* to each percent. A 1% move on a $10,000 position is $100 whether you funded it with $10,000 or $1,000; leverage just decides how big that $100 is relative to your own money.",
        fr: "Le levier, c'est de la taille empruntée. Au lieu d'acheter 1 000 $ d'un actif comptant, tu déposes 1 000 $ en garantie et l'exchange te laisse ouvrir une position valant plusieurs fois ça. Rien ne change côté marché — le prix bouge toujours du même pourcentage. Ce qui change, c'est *ton exposition* à chaque pourcent. Un mouvement de 1 % sur une position de 10 000 $ fait 100 $, que tu l'aies financée avec 10 000 $ ou 1 000 $ ; le levier décide juste de la taille de ces 100 $ par rapport à ton propre argent.",
      },
    },
    {
      type: "h",
      text: { en: "The three words that matter", fr: "Les trois mots qui comptent" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Notional** — the full size of your position ($10,000 in the example). This is what P&L is measured against.",
          fr: "**Notional** — la taille totale de ta position (10 000 $ dans l'exemple). C'est là-dessus que se mesure le P&L.",
        },
        {
          en: "**Margin** — the cash you put up to open it (`notional ÷ leverage`). It's reserved, not spent — set aside as collateral until you close.",
          fr: "**Marge** — le cash que tu mets pour l'ouvrir (`notional ÷ levier`). Il est réservé, pas dépensé — mis de côté en garantie jusqu'à la fermeture.",
        },
        {
          en: "**Liquidation** — if the trade moves against you enough to wipe out your margin, the position is force-closed. On high leverage, \"enough\" is a very small move.",
          fr: "**Liquidation** — si le trade bouge assez contre toi pour effacer ta marge, la position est fermée de force. À fort levier, « assez » est un tout petit mouvement.",
        },
      ],
    },
    {
      type: "p",
      text: {
        en: "The relationship is just one line of arithmetic: `notional = margin × leverage`. Pick any two and the third is fixed. Traders who blow up usually stared at leverage and ignored notional — the number that actually decides how much each tick costs them.",
        fr: "La relation tient en une ligne d'arithmétique : `notional = marge × levier`. Fixe-en deux et le troisième est déterminé. Les traders qui sautent ont d'habitude fixé le levier en ignorant le notional — le chiffre qui décide vraiment de ce que chaque tick leur coûte.",
      },
    },
    {
      type: "example",
      title: { en: "10x long on $1,000 margin", fr: "Long 10x sur 1 000 $ de marge" },
      rows: [
        { k: { en: "Leverage", fr: "Levier" }, v: { en: "10x", fr: "10x" } },
        { k: { en: "Margin (your cash)", fr: "Marge (ton cash)" }, v: { en: "$1,000", fr: "1 000 $" } },
        { k: { en: "Notional (position size)", fr: "Notional (taille)" }, v: { en: "$10,000", fr: "10 000 $" } },
        { k: { en: "Price +5% → P&L", fr: "Prix +5 % → P&L" }, v: { en: "+$500 (+50% on margin)", fr: "+500 $ (+50 % sur marge)" } },
        { k: { en: "Price −10% → P&L", fr: "Prix −10 % → P&L" }, v: { en: "−$1,000 → liquidated", fr: "−1 000 $ → liquidé" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "Notice the asymmetry: a 5% move gave you +50%, but a 10% move against you erased everything. Higher leverage doesn't increase your edge — it shrinks the distance between you and zero.",
        fr: "Note l'asymétrie : un mouvement de 5 % t'a donné +50 %, mais 10 % contre toi a tout effacé. Un levier plus haut n'augmente pas ton edge — il réduit la distance entre toi et zéro.",
      },
    },
    {
      type: "h",
      text: { en: "How to find your liquidation distance", fr: "Comment trouver ta distance de liquidation" },
    },
    {
      type: "p",
      text: {
        en: "Here's the shortcut worth memorising: **your margin is wiped out by an adverse move of roughly `1 ÷ leverage`**. At 10x that's a 10% move against you. At 25x it's 4%. At 100x it's just **1%** — one bad candle. This is why chasing maximum leverage is a beginner's tell: you're not betting bigger, you're just standing closer to the trapdoor.",
        fr: "Voici le raccourci à mémoriser : **ta marge est effacée par un mouvement défavorable d'environ `1 ÷ levier`**. À 10x, c'est 10 % contre toi. À 25x, c'est 4 %. À 100x, c'est juste **1 %** — une seule mauvaise bougie. C'est pour ça que courir après le levier maximal trahit le débutant : tu ne paries pas plus gros, tu te tiens juste plus près de la trappe.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**5x** → ~20% cushion before liquidation. Room to be wrong for a while.",
          fr: "**5x** → ~20 % de coussin avant liquidation. De la marge pour avoir tort un moment.",
        },
        {
          en: "**20x** → ~5% cushion. Normal intraday noise can end you.",
          fr: "**20x** → ~5 % de coussin. Le bruit intraday normal peut te finir.",
        },
        {
          en: "**100x** → ~1% cushion. Effectively a coin flip on the next tick.",
          fr: "**100x** → ~1 % de coussin. Quasiment un pile ou face sur le prochain tick.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Isolated margin", fr: "Marge isolée" },
    },
    {
      type: "p",
      text: {
        en: "Tide uses **isolated margin**: each position risks only the margin you assigned to it, never your whole balance. One bad trade can cost you its margin — not your account. The opposite mode, *cross margin*, backs every position with your full balance, which can chain one blow-up into a total wipeout. Isolated is the safer default and the one worth building habits around.",
        fr: "Tide utilise la **marge isolée** : chaque position ne risque que la marge que tu lui as attribuée, jamais tout ton solde. Un mauvais trade peut te coûter sa marge — pas ton compte. Le mode inverse, la *marge croisée* (cross), adosse chaque position à tout ton solde, ce qui peut enchaîner un blow-up en wipeout total. La marge isolée est le réglage le plus sûr, et celui autour duquel prendre tes habitudes.",
      },
    },
    {
      type: "h",
      text: { en: "Funding: the cost of holding", fr: "Le funding : le coût de conserver" },
    },
    {
      type: "p",
      text: {
        en: "Perpetuals never expire, so a small periodic payment called **funding** keeps their price tethered to spot. When longs are crowded, longs pay shorts; when shorts are crowded, shorts pay longs. It's usually tiny per period, but on high leverage and over many hours it eats into a winning trade and deepens a losing one. Funding is why a perp position can bleed even when price sits still — the clock is a cost.",
        fr: "Les perpétuels n'expirent jamais, donc un petit paiement périodique appelé **funding** garde leur prix arrimé au spot. Quand les longs sont trop nombreux, les longs paient les shorts ; quand les shorts sont trop nombreux, les shorts paient les longs. C'est en général minuscule par période, mais à fort levier et sur de nombreuses heures, ça grignote un trade gagnant et creuse un trade perdant. Le funding, c'est pourquoi une position perp peut saigner même à prix immobile — l'horloge est un coût.",
      },
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Maker vs taker fees", fr: "Frais maker vs taker" },
      text: {
        en: "You also pay a fee to open. A **maker** order (a resting limit order that adds liquidity) costs **0.02%** of notional; a **taker** order (a market order that fills instantly) costs **0.06%**. On a $10,000 notional that's $2 vs $6 — small alone, but at high leverage and high turnover it compounds. Trading the limit book, not the market button, is a cheap edge.",
        fr: "Tu paies aussi un frais à l'ouverture. Un ordre **maker** (un ordre limite posé qui ajoute de la liquidité) coûte **0,02 %** du notional ; un ordre **taker** (un ordre au marché qui s'exécute instantanément) coûte **0,06 %**. Sur un notional de 10 000 $, c'est 2 $ contre 6 $ — peu seul, mais à fort levier et fort turnover, ça s'accumule. Trader le carnet limite plutôt que le bouton marché est un edge pas cher.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "Perps on Tide are **simulated in Paper** — no borrowed money, no real leverage, virtual capital only. You can push up to **100x** so you *feel* how brutal high leverage is, safely. There's **no real-time server liquidation engine**: instead, a losing position's P&L is **floored at −margin when you close it**, so you can never lose more than you put up (the floor applies at close, not tick by tick). Your **TP/SL and limit orders are client-side triggers** — the browser tab has to stay open to fire them; only the execution is reported to the backend. Great for the mechanics; not a model of a real exchange's instant liquidation.",
        fr: "Les perps sur Tide sont **simulés en Paper** — pas d'argent emprunté, pas de vrai levier, uniquement du capital virtuel. Tu peux pousser jusqu'à **100x** pour *ressentir* à quel point le fort levier est brutal, en sécurité. Il n'y a **pas de moteur de liquidation serveur en temps réel** : à la place, le P&L d'une position perdante est **planchonné à −marge quand tu la fermes**, donc tu ne peux jamais perdre plus que ta mise (le plancher s'applique à la fermeture, pas tick par tick). Tes **ordres TP/SL et limites sont des déclencheurs côté client** — l'onglet du navigateur doit rester ouvert pour qu'ils se déclenchent ; seule l'exécution remonte au backend. Idéal pour la mécanique ; ce n'est pas un modèle de la liquidation instantanée d'un vrai exchange.",
      },
    },
    {
      type: "h",
      text: { en: "Live mode is different", fr: "Le mode Live, c'est différent" },
    },
    {
      type: "p",
      text: {
        en: "Everything above is about Paper perps. **Live mode is spot only** — a real, non-custodial swap of XRP against RLUSD signed in your own wallet (Xaman or GemWallet). There's **no leverage and no margin in Live**: you trade what you actually hold. Use Paper to master leverage risk-free; use Live when you want a real position with real settlement.",
        fr: "Tout ce qui précède concerne les perps Paper. **Le mode Live est spot uniquement** — un vrai swap non-custodial de XRP contre RLUSD, signé dans ton propre wallet (Xaman ou GemWallet). Il n'y a **ni levier ni marge en Live** : tu trades ce que tu détiens réellement. Sers-toi du Paper pour maîtriser le risque du levier sans danger ; passe en Live quand tu veux une vraie position avec un vrai règlement.",
      },
    },
    {
      type: "h",
      text: { en: "Sizing leverage like a pro", fr: "Dimensionner le levier comme un pro" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Decide the **cash you're willing to lose** on this trade first — that's your margin, not an afterthought.",
          fr: "Décide d'abord le **cash que tu acceptes de perdre** sur ce trade — c'est ta marge, pas un détail.",
        },
        {
          en: "Find where your idea is **invalidated** on the chart, and put your stop there.",
          fr: "Trouve où ton idée est **invalidée** sur le graphique, et place ton stop là.",
        },
        {
          en: "Pick the leverage that keeps your **liquidation beyond that stop** — the stop should trigger long before liquidation ever could.",
          fr: "Choisis le levier qui garde ta **liquidation au-delà de ce stop** — le stop doit se déclencher bien avant que la liquidation ne le puisse.",
        },
        {
          en: "Open the position, then let TP/SL do the work instead of watching every candle.",
          fr: "Ouvre la position, puis laisse les TP/SL faire le travail au lieu de surveiller chaque bougie.",
        },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Test the extremes for free", fr: "Teste les extrêmes gratuitement" },
      text: {
        en: "Open a 100x position in Paper just once and watch how fast a 1% wiggle threatens your margin. It's the cheapest lesson in leverage you'll ever get — it costs you rank, not rent. Then drop to a leverage you can actually hold through noise, and let the leaderboard measure the difference.",
        fr: "Ouvre une position 100x en Paper une seule fois et regarde à quelle vitesse un frémissement de 1 % menace ta marge. C'est la leçon de levier la moins chère que tu auras jamais — ça te coûte du classement, pas ton loyer. Ensuite, redescends à un levier que tu peux vraiment tenir dans le bruit, et laisse le classement mesurer la différence.",
      },
    },
    {
      type: "quote",
      text: {
        en: "New traders ask what leverage to use. Experienced traders ask how much they can afford to lose, then work backwards.",
        fr: "Les débutants demandent quel levier utiliser. Les traders expérimentés demandent combien ils peuvent perdre, puis remontent le calcul.",
      },
    },
  ],
  related: ["what-is-a-perpetual", "risk-management-101", "take-profit-stop-loss"],
};
