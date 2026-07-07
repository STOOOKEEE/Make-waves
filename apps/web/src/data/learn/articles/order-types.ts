import type { RawArticle } from "../types";

/* Basics — order types (market / limit / TP / SL), ancré sur le terminal Tide
 * (déclencheurs TP/SL/limit côté client, cf. règles d'exactitude produit).
 * Aligné sur le GOLD STANDARD what-is-trading : ~20+ blocs, sections H2 riches,
 * exemples chiffrés, SEO complet, ton « tu ». */
export const orderTypes: RawArticle = {
  slug: "order-types",
  category: "basics",
  difficulty: "beginner",
  minutes: 9,
  popular: true,
  updated: "2026-07-02",
  keywords: [
    "order types",
    "market order",
    "limit order",
    "take profit stop loss",
    "how to place an order",
    "maker vs taker",
    "trading order types",
    "tp sl",
  ],
  title: {
    en: "Order types: market, limit, TP & SL",
    fr: "Types d'ordres : market, limit, TP & SL",
  },
  seoTitle: {
    en: "Order Types Explained: Market, Limit, Take-Profit & Stop-Loss",
    fr: "Types d'ordres expliqués : market, limit, take-profit & stop-loss",
  },
  seoDescription: {
    en: "Order types explained for beginners: market vs limit, take-profit and stop-loss, maker/taker fees, and how to place a planned trade risk-free on Tide.",
    fr: "Les types d'ordres expliqués aux débutants : market vs limit, take-profit et stop-loss, frais maker/taker, et comment placer un trade planifié sans risque sur Tide.",
  },
  dek: {
    en: "Four buttons decide how you get in and out. Pick the wrong one and a good idea becomes a bad trade.",
    fr: "Quatre boutons décident comment tu entres et sors. Le mauvais choix, et une bonne idée devient un mauvais trade.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Learning the **order types** is the difference between clicking hopefully and trading on purpose. An order is just an instruction to the market: buy or sell, how much, and **on what terms**. Those terms are the order type — and on the Tide terminal you'll lean on four of them. Get comfortable with market, limit, take-profit and stop-loss, and you can turn any idea into a plan with a defined entry and a defined exit before you risk a cent.",
        fr: "Maîtriser les **types d'ordres**, c'est la différence entre cliquer en espérant et trader avec intention. Un ordre, c'est juste une instruction donnée au marché : acheter ou vendre, combien, et **à quelles conditions**. Ces conditions, c'est le type d'ordre — et sur le terminal Tide tu t'appuies sur quatre d'entre eux. Sois à l'aise avec market, limit, take-profit et stop-loss, et tu transformes n'importe quelle idée en plan avec une entrée définie et une sortie définie avant de risquer le moindre centime.",
      },
    },
    {
      type: "h",
      text: { en: "The two questions every order answers", fr: "Les deux questions auxquelles tout ordre répond" },
    },
    {
      type: "p",
      text: {
        en: "Behind every order type sits one trade-off: **speed versus price**. Do you want to be filled *right now* whatever the cost, or do you want *your* price even if it means waiting — or never getting filled at all? Market orders pick speed. Limit orders pick price. TP and SL are just limit-style exits that fire automatically. That's the whole map.",
        fr: "Derrière chaque type d'ordre se cache un seul arbitrage : **la vitesse contre le prix**. Tu veux être rempli *maintenant* quel que soit le coût, ou tu veux *ton* prix quitte à attendre — voire à ne jamais être rempli ? Les ordres market choisissent la vitesse. Les ordres limit choisissent le prix. TP et SL ne sont que des sorties style limit qui se déclenchent toutes seules. C'est toute la carte.",
      },
    },
    {
      type: "h",
      text: { en: "Market order — speed over price", fr: "Ordre market — la vitesse avant le prix" },
    },
    {
      type: "p",
      text: {
        en: "A **market order** executes right now, at the best price currently available in the book. You're filled instantly, but you accept whatever the market gives you — and in a fast or thin market that price can slip a little from what you saw a second ago. Use it when *being in the trade* matters more than shaving a few cents off the entry: a breakout firing, news dropping, or an exit you need *now*.",
        fr: "Un **ordre market** s'exécute tout de suite, au meilleur prix disponible dans le carnet à cet instant. Tu es rempli instantanément, mais tu acceptes ce que le marché te donne — et sur un marché rapide ou peu liquide, ce prix peut glisser un peu par rapport à ce que tu voyais une seconde avant. Sers-t'en quand *être dans le trade* compte plus que grappiller quelques centimes à l'entrée : un breakout qui part, une news qui tombe, ou une sortie qu'il te faut *maintenant*.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Pro** — near-certain fill. If there's liquidity, you're in.",
          fr: "**Avantage** — remplissage quasi certain. S'il y a de la liquidité, tu es dedans.",
        },
        {
          en: "**Con** — you pay the spread and any slippage; the price you get isn't the price you clicked.",
          fr: "**Inconvénient** — tu paies le spread et le slippage éventuel ; le prix obtenu n'est pas le prix cliqué.",
        },
        {
          en: "A market order is almost always a **taker** order — it removes liquidity from the book.",
          fr: "Un ordre market est presque toujours un ordre **taker** — il retire de la liquidité du carnet.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Limit order — price over speed", fr: "Ordre limit — le prix avant la vitesse" },
    },
    {
      type: "p",
      text: {
        en: "A **limit order** sets your price in advance: \"buy only at $59,800 or better.\" It rests in the book and waits until the market reaches your level. You control the exact price you pay, but there's no guarantee it fills — the market may spike away and never come back to you. Limit orders are how patient traders get a better entry and often pay lower **maker** fees for adding liquidity instead of taking it.",
        fr: "Un **ordre limit** fixe ton prix à l'avance : « acheter seulement à 59 800 $ ou mieux ». Il se pose dans le carnet et attend que le marché atteigne ton niveau. Tu contrôles le prix exact que tu paies, mais rien ne garantit l'exécution — le marché peut s'envoler et ne jamais revenir vers toi. Les ordres limit, c'est comme ça que les traders patients obtiennent une meilleure entrée et paient souvent des frais **maker** plus faibles, parce qu'ils ajoutent de la liquidité au lieu de la prendre.",
      },
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Maker vs taker, in one line", fr: "Maker vs taker, en une ligne" },
      text: {
        en: "A **maker** adds an order to the book and waits (often a limit). A **taker** hits an existing order and fills immediately (usually a market). Makers are the patient side of the book; takers are the impatient side — and impatience usually costs a touch more.",
        fr: "Un **maker** ajoute un ordre au carnet et attend (souvent un limit). Un **taker** frappe un ordre existant et se remplit immédiatement (souvent un market). Les makers sont le côté patient du carnet ; les takers le côté pressé — et l'impatience coûte en général un poil plus cher.",
      },
    },
    {
      type: "h",
      text: { en: "Take-profit & stop-loss — your two exits", fr: "Take-profit & stop-loss — tes deux sorties" },
    },
    {
      type: "p",
      text: {
        en: "Entering is the easy half. **Take-profit** and **stop-loss** are the exits that decide whether a trade is actually a plan or just a hope. Both are conditional orders that fire automatically when price hits a level you set in advance — so the decision is made by *calm you*, not by *panicking you* watching a candle nuke your position.",
        fr: "Entrer, c'est la moitié facile. **Take-profit** et **stop-loss** sont les sorties qui décident si un trade est vraiment un plan ou juste un espoir. Les deux sont des ordres conditionnels qui se déclenchent automatiquement quand le prix touche un niveau fixé à l'avance — la décision est donc prise par *toi au calme*, pas par *toi en panique* devant une bougie qui pulvérise ta position.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Take-profit (TP)** — an automatic exit above your entry (for a long) that locks in a gain when price hits your target.",
          fr: "**Take-profit (TP)** — une sortie automatique au-dessus de ton entrée (pour un long) qui verrouille un gain quand le prix touche ta cible.",
        },
        {
          en: "**Stop-loss (SL)** — an automatic exit below your entry that caps your loss if the trade goes against you. This is the single most important habit in trading.",
          fr: "**Stop-loss (SL)** — une sortie automatique sous ton entrée qui plafonne ta perte si le trade tourne mal. C'est l'habitude la plus importante du trading.",
        },
        {
          en: "For a **short**, flip them: TP sits below your entry, SL sits above.",
          fr: "Pour un **short**, inverse : le TP est sous ton entrée, le SL au-dessus.",
        },
      ],
    },
    {
      type: "example",
      title: { en: "A planned trade, start to finish", fr: "Un trade planifié, du début à la fin" },
      rows: [
        { k: { en: "Entry (limit)", fr: "Entrée (limit)" }, v: { en: "Buy 0.5 BTC at $60,000", fr: "Achat 0,5 BTC à 60 000 $" } },
        { k: { en: "Take-profit", fr: "Take-profit" }, v: { en: "$66,000 (+10%)", fr: "66 000 $ (+10 %)" } },
        { k: { en: "Stop-loss", fr: "Stop-loss" }, v: { en: "$57,000 (−5%)", fr: "57 000 $ (−5 %)" } },
        { k: { en: "Risk on the trade", fr: "Risque sur le trade" }, v: { en: "−$1,500", fr: "−1 500 $" } },
        { k: { en: "Reward if TP hits", fr: "Gain si TP touché" }, v: { en: "+$3,000", fr: "+3 000 $" } },
        { k: { en: "Risk / reward", fr: "Risque / gain" }, v: { en: "1 : 2", fr: "1 : 2" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "Notice what this gives you: the whole trade is defined *before* you enter. You know your worst case (−$1,500), your target (+$3,000), and the ratio between them (1:2). With a plan like this you can lose more often than you win and still come out ahead — that's the expectancy math from the basics track, made concrete by two exit orders.",
        fr: "Regarde ce que ça te donne : tout le trade est défini *avant* d'entrer. Tu connais ton pire cas (−1 500 $), ta cible (+3 000 $), et le ratio entre les deux (1:2). Avec un plan pareil, tu peux perdre plus souvent que tu ne gagnes et rester gagnant au final — c'est l'espérance de la piste basics, rendue concrète par deux ordres de sortie.",
      },
    },
    {
      type: "h",
      text: { en: "How order types work on Tide", fr: "Comment les types d'ordres marchent sur Tide" },
    },
    {
      type: "p",
      text: {
        en: "On the Tide terminal you place these orders in **Paper mode** with virtual capital, on the top 250 crypto markets priced on live data. Same order tickets, same charts, same adrenaline — but a bad fill costs you rank, not rent. There's a small fee model on opens so your practice PnL stays honest: **maker 0.02%, taker 0.06%**. There is no fee on the real **Live** spot swap.",
        fr: "Sur le terminal Tide, tu places ces ordres en **mode Paper** avec du capital virtuel, sur les 250 plus gros marchés crypto cotés sur des données live. Mêmes tickets d'ordre, mêmes graphiques, même adrénaline — mais un mauvais fill te coûte du classement, pas ton loyer. Un petit modèle de frais s'applique à l'ouverture pour que ton PnL d'entraînement reste honnête : **maker 0,02 %, taker 0,06 %**. Il n'y a aucun frais sur le swap spot réel en **Live**.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How TP/SL & limits work on Tide", fr: "Comment TP/SL & limits marchent sur Tide" },
      text: {
        en: "In Paper mode, limit orders and TP/SL are **triggers watched in your browser** — the terminal tab has to stay open for them to fire, and only the execution is reported to the backend. There is **no server-side auto-liquidation**. On simulated perps, realized PnL is floored at −margin only when you close. Treat these orders as a discipline tool for learning, not a fire-and-forget safety net you can walk away from.",
        fr: "En mode Paper, les ordres limit et TP/SL sont des **déclencheurs surveillés dans ton navigateur** — l'onglet du terminal doit rester ouvert pour qu'ils se déclenchent, et seule l'exécution remonte au backend. Il n'y a **pas de liquidation auto côté serveur**. Sur les perps simulés, le PnL réalisé est plafonné à −marge seulement au moment où tu fermes. Vois ces ordres comme un outil de discipline pour apprendre, pas un filet de sécurité qu'on pose et qu'on oublie.",
      },
    },
    {
      type: "h",
      text: { en: "Choosing the right order", fr: "Choisir le bon ordre" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Need in or out now?** Market. Accept the spread, get the fill.",
          fr: "**Besoin d'entrer ou sortir maintenant ?** Market. Accepte le spread, prends le fill.",
        },
        {
          en: "**Have a price in mind and time to wait?** Limit. Set the level and let the market come to you.",
          fr: "**Un prix en tête et le temps d'attendre ?** Limit. Fixe le niveau et laisse le marché venir à toi.",
        },
        {
          en: "**Opening a position?** Always pair it with a **stop-loss**, and set a **take-profit** while you're calm.",
          fr: "**Tu ouvres une position ?** Accompagne-la toujours d'un **stop-loss**, et pose un **take-profit** tant que tu es au calme.",
        },
        {
          en: "**Volatile, thin market?** Prefer limit to avoid nasty slippage on a market fill.",
          fr: "**Marché volatil et peu liquide ?** Préfère le limit pour éviter un slippage brutal sur un fill market.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Common beginner mistakes", fr: "Les erreurs classiques du débutant" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Market-buying everything** — you bleed the spread on every entry and exit. Learn to rest a limit.",
          fr: "**Tout acheter au market** — tu saignes le spread à chaque entrée et sortie. Apprends à poser un limit.",
        },
        {
          en: "**Entering with no stop** — the fastest way to turn a −5% trade into a −40% disaster.",
          fr: "**Entrer sans stop** — le moyen le plus rapide de transformer un trade à −5 % en désastre à −40 %.",
        },
        {
          en: "**Moving your stop-loss wider** to \"give it room\" — that's not room, that's a bigger loss.",
          fr: "**Élargir ton stop-loss** pour « lui laisser de l'air » — ce n'est pas de l'air, c'est une perte plus grosse.",
        },
        {
          en: "**Closing the tab** and expecting your triggers to fire — on Tide they won't. Keep it open.",
          fr: "**Fermer l'onglet** en croyant que tes déclencheurs partiront — sur Tide, non. Garde-le ouvert.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Place your first planned trade", fr: "Place ton premier trade planifié" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Pick a market you recognise and decide your direction — long or short.",
          fr: "Choisis un marché que tu connais et décide ta direction — long ou short.",
        },
        {
          en: "Set a **limit** entry at a price you'd actually be happy to get, not the current tape.",
          fr: "Pose une entrée **limit** à un prix qui te conviendrait vraiment, pas le prix affiché à l'instant.",
        },
        {
          en: "Before confirming, attach a **stop-loss** and a **take-profit** — no exit, no trade.",
          fr: "Avant de valider, attache un **stop-loss** et un **take-profit** — pas de sortie, pas de trade.",
        },
        {
          en: "Keep the terminal open, let it play out, then review whether your levels made sense.",
          fr: "Garde le terminal ouvert, laisse le trade se dérouler, puis vérifie si tes niveaux tenaient la route.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "Amateurs think about how much they can make. Professionals decide their stop-loss before they enter.",
        fr: "Les amateurs pensent à combien ils peuvent gagner. Les pros décident leur stop-loss avant même d'entrer.",
      },
    },
  ],
  related: ["order-book-spread", "take-profit-stop-loss", "risk-management-101"],
};
