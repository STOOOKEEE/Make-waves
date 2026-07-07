import type { RawArticle } from "../types";

/* Perps — TP/SL comme protection. Exactitude Tide : déclencheurs côté client,
 * pas de liquidation auto serveur, plancher -marge à la fermeture. */
export const takeProfitStopLoss: RawArticle = {
  slug: "take-profit-stop-loss",
  category: "perps",
  difficulty: "intermediate",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "take profit stop loss",
    "stop loss order",
    "how to set a stop loss",
    "risk reward ratio",
    "take profit strategy",
    "trailing stop",
    "crypto risk management",
  ],
  title: {
    en: "Take-profit & stop-loss: protecting a position",
    fr: "Take-profit & stop-loss : protéger une position",
  },
  seoTitle: {
    en: "Take-Profit & Stop-Loss: How to Set Exits That Work",
    fr: "Take-profit & stop-loss : régler des sorties qui tiennent",
  },
  seoDescription: {
    en: "Take-profit and stop-loss explained: where to place your exits, how to size risk vs reward, trailing stops, and how to drill the discipline risk-free on Tide.",
    fr: "Take-profit et stop-loss expliqués : où placer tes sorties, comment doser risque et gain, stops suiveurs, et comment répéter la discipline sans risque sur Tide.",
  },
  dek: {
    en: "The trade you don't babysit is the trade with a stop. Set your exits before emotion gets a vote.",
    fr: "Le trade que tu ne surveilles pas, c'est celui qui a un stop. Fixe tes sorties avant que l'émotion n'ait voix au chapitre.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Entering a trade is the easy part. The hard part — the part that separates survivors from the rest — is deciding *in advance* where you'll get out, whether you're right or wrong. A **take-profit** and a **stop-loss** are the two exits you attach to every position: one to bank the win, one to cap the loss. Get them right and you can be wrong half the time and still come out ahead.",
        fr: "Entrer dans un trade, c'est la partie facile. La partie dure — celle qui sépare les survivants du reste — c'est de décider *à l'avance* où tu sortiras, que tu aies raison ou tort. Un **take-profit** et un **stop-loss**, ce sont les deux sorties que tu attaches à chaque position : l'une pour encaisser le gain, l'autre pour plafonner la perte. Bien réglées, tu peux te tromper une fois sur deux et rester gagnant.",
      },
    },
    {
      type: "h",
      text: { en: "Take-profit and stop-loss, defined", fr: "Take-profit et stop-loss, définis" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Take-profit (TP)** — closes the position at your target to bank the win. It stops greed from turning a good trade into a round trip back to breakeven.",
          fr: "**Take-profit (TP)** — ferme la position à ta cible pour encaisser le gain. Il empêche l'avidité de transformer un bon trade en aller-retour jusqu'au point mort.",
        },
        {
          en: "**Stop-loss (SL)** — closes the position at your max acceptable loss. It stops hope from turning a small loss into an account-ending one.",
          fr: "**Stop-loss (SL)** — ferme la position à ta perte maximale acceptable. Il empêche l'espoir de transformer une petite perte en perte fatale.",
        },
        {
          en: "**Together** they define the trade completely: entry, downside, upside. Before you click buy, all three numbers should already exist.",
          fr: "**Ensemble** ils définissent le trade en entier : entrée, risque, gain. Avant de cliquer sur acheter, les trois chiffres doivent déjà exister.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Set them at entry, not in panic", fr: "Fixe-les à l'entrée, pas en panique" },
    },
    {
      type: "p",
      text: {
        en: "The right moment to choose your stop-loss is *before* you're in the trade, when you're calm and objective. Once you're in and the candle is moving, your brain will invent reasons to move the stop \"just a little.\" Pre-committing removes that conversation — the decision is already made by the version of you that had no money on the line.",
        fr: "Le bon moment pour choisir ton stop-loss, c'est *avant* d'être dans le trade, quand tu es calme et objectif. Une fois dedans, la bougie qui bouge, ton cerveau inventera des raisons de décaler le stop « juste un peu ». Pré-décider supprime cette discussion — le choix est déjà fait par la version de toi qui n'avait pas d'argent en jeu.",
      },
    },
    {
      type: "h",
      text: { en: "Where do you actually place them?", fr: "Où les place-t-on, concrètement ?" },
    },
    {
      type: "p",
      text: {
        en: "A stop-loss belongs at a price that says *my idea was wrong* — not at a round number, and not at the exact figure that makes your loss feel comfortable. Put it just beyond a level the market would have to break to invalidate your trade: below a support for a long, above a resistance for a short. The take-profit goes at the next level where price is likely to stall — a prior high, a round number a crowd is watching, the edge of a range.",
        fr: "Un stop-loss se place à un prix qui dit *mon idée était fausse* — pas sur un chiffre rond, ni sur le niveau qui rend ta perte confortable. Mets-le juste au-delà d'un niveau que le marché devrait casser pour invalider ton trade : sous un support pour un long, au-dessus d'une résistance pour un short. Le take-profit va au prochain niveau où le prix risque de caler — un plus-haut précédent, un chiffre rond que la foule surveille, le bord d'un range.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Size the position from the stop", fr: "Dimensionne la position depuis le stop" },
      text: {
        en: "Never pick your size first and the stop second. Decide how many dollars you're willing to lose (say 1% of your capital), decide where the stop goes, and let those two numbers *compute* your position size. The stop distance drives the size — not the other way around.",
        fr: "Ne choisis jamais la taille d'abord et le stop ensuite. Décide combien de dollars tu es prêt à perdre (disons 1 % de ton capital), décide où va le stop, et laisse ces deux chiffres *calculer* ta taille de position. C'est la distance au stop qui pilote la taille — pas l'inverse.",
      },
    },
    {
      type: "h",
      text: { en: "Risk vs reward: the ratio that matters", fr: "Risque vs gain : le ratio qui compte" },
    },
    {
      type: "p",
      text: {
        en: "The distance from entry to stop is your **risk**; the distance from entry to target is your **reward**. Their ratio is the whole edge. A **2:1** reward-to-risk means you make twice what you risk when you're right — so you only need to win a third of the time to break even. Chase trades with 1:3 in the wrong direction and even a good win rate bleeds out.",
        fr: "La distance de l'entrée au stop, c'est ton **risque** ; la distance de l'entrée à la cible, c'est ton **gain**. Leur ratio, c'est tout l'edge. Un **2:1** gain/risque veut dire que tu gagnes deux fois ta mise quand tu as raison — il te suffit donc de gagner un tiers du temps pour être à l'équilibre. Prends des trades à 1:3 dans le mauvais sens, et même un bon taux de réussite finit par saigner.",
      },
    },
    {
      type: "example",
      title: { en: "A protected long", fr: "Un long protégé" },
      rows: [
        { k: { en: "Entry", fr: "Entrée" }, v: { en: "$2,000", fr: "2 000 $" } },
        { k: { en: "Stop-loss", fr: "Stop-loss" }, v: { en: "$1,900 (risk 5%)", fr: "1 900 $ (risque 5 %)" } },
        { k: { en: "Take-profit", fr: "Take-profit" }, v: { en: "$2,200 (reward 10%)", fr: "2 200 $ (gain 10 %)" } },
        { k: { en: "Reward : risk", fr: "Gain : risque" }, v: { en: "2 : 1", fr: "2 : 1" } },
        { k: { en: "Breakeven win rate", fr: "Taux de réussite d'équilibre" }, v: { en: "~34%", fr: "~34 %" } },
      ],
    },
    {
      type: "h",
      text: { en: "The trailing stop: locking in a runner", fr: "Le stop suiveur : verrouiller un trade gagnant" },
    },
    {
      type: "p",
      text: {
        en: "A fixed take-profit caps your upside. When a trade is running hard in your favour, a **trailing stop** lets you keep riding while protecting the gains you've already banked: you move the stop up behind price as it climbs, never down. If price keeps going, you keep winning; the moment it reverses into your trailing stop, you're out — green, not gutted.",
        fr: "Un take-profit fixe plafonne ton potentiel. Quand un trade file fort en ta faveur, un **stop suiveur** te laisse continuer à rouler tout en protégeant les gains déjà acquis : tu remontes le stop derrière le prix quand il grimpe, jamais vers le bas. Si le prix continue, tu continues de gagner ; dès qu'il se retourne dans ton stop suiveur, tu sors — dans le vert, pas dévasté.",
      },
    },
    {
      type: "h",
      text: { en: "Mistakes that turn stops into traps", fr: "Les erreurs qui transforment le stop en piège" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Stop too tight** — placed inside normal noise, it gets tagged for no reason and you eat a loss on a trade that was fine.",
          fr: "**Stop trop serré** — placé dans le bruit normal, il se fait toucher pour rien et tu manges une perte sur un trade qui allait bien.",
        },
        {
          en: "**Moving the stop wider** — the cardinal sin. Widening a stop to avoid a loss is how a small loss becomes a catastrophe.",
          fr: "**Élargir le stop** — le péché capital. Repousser un stop pour éviter la perte, c'est comme ça qu'une petite perte devient une catastrophe.",
        },
        {
          en: "**Obvious round-number stops** — everyone clusters at $2,000 or the prior low; price often wicks through to grab them, then reverses.",
          fr: "**Stops sur chiffres ronds évidents** — tout le monde s'entasse à 2 000 $ ou sur le dernier plus-bas ; le prix va souvent chercher ces stops d'une mèche, puis se retourne.",
        },
        {
          en: "**No take-profit** — you nail the entry, then give it all back because you never decided where \"enough\" was.",
          fr: "**Pas de take-profit** — tu réussis l'entrée parfaite, puis tu rends tout parce que tu n'as jamais décidé où était le « assez ».",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "Perp trading on Tide is **simulated in Paper** — no real leverage, no borrowed money. Your TP and SL (and limit orders) are **triggers evaluated in your browser tab**: if you close the tab, they won't fire, and only the execution is reported to the backend. There's **no server-side auto-liquidation** — the -margin floor on isolated positions only applies when you actually close. So use TP/SL to drill the *discipline* of always defining your exits, but don't treat them as an unattended safety net the way a live exchange stop would work.",
        fr: "Le trading de perp sur Tide est **simulé en Paper** — pas de levier réel, pas d'argent emprunté. Ton TP et ton SL (et les ordres limit) sont des **déclencheurs évalués dans l'onglet de ton navigateur** : si tu fermes l'onglet, ils ne se déclenchent pas, et seule l'exécution remonte au backend. Il n'y a **pas de liquidation auto côté serveur** — le plancher -marge sur les positions isolées ne s'applique qu'au moment où tu fermes vraiment. Sers-toi du TP/SL pour répéter la *discipline* de toujours définir tes sorties, mais ne les traite pas comme un filet de sécurité sans surveillance, à la manière d'un stop sur un exchange réel.",
      },
    },
    {
      type: "h",
      text: { en: "Fees, leverage and the floor", fr: "Frais, levier et le plancher" },
    },
    {
      type: "p",
      text: {
        en: "Every open costs a fee — **0.02% maker, 0.06% taker** — so factor it into thin targets. Leverage on a Paper perp goes up to **100x** on isolated margin, which amplifies both directions: at 100x a 1% move against you is your whole margin. And remember the floor — realized PnL is capped at **−margin** when you close, so a simulated position can't cost you more than the margin you put up. On Tide's monetization side, there's **no fee on swaps**; the house earns from poker-style tournament rake, not from your exits.",
        fr: "Chaque ouverture coûte un frais — **0,02 % maker, 0,06 % taker** — intègre-le dans les cibles serrées. Le levier sur un perp Paper monte jusqu'à **100x** en marge isolée, ce qui amplifie dans les deux sens : à 100x, un mouvement de 1 % contre toi, c'est toute ta marge. Et souviens-toi du plancher — le PnL réalisé est plafonné à **−marge** à la fermeture, donc une position simulée ne peut pas te coûter plus que la marge engagée. Côté monétisation, Tide ne prend **aucun frais sur les swaps** ; la maison se rémunère au rake de tournoi façon poker, pas sur tes sorties.",
      },
    },
    {
      type: "h",
      text: { en: "Drill it on Tide", fr: "Répète-le sur Tide" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Open a Paper position and, before confirming, set both a TP and an SL — never one without the other.",
          fr: "Ouvre une position Paper et, avant de valider, règle à la fois un TP et un SL — jamais l'un sans l'autre.",
        },
        {
          en: "Check the reward-to-risk: if the target isn't at least twice the stop distance, tighten the entry or skip the trade.",
          fr: "Vérifie le gain/risque : si la cible ne vaut pas au moins deux fois la distance au stop, resserre l'entrée ou passe ton tour.",
        },
        {
          en: "Keep the tab open until the trade resolves, then log whether the exit fired where you planned — and whether you were tempted to move it.",
          fr: "Garde l'onglet ouvert jusqu'à la résolution du trade, puis note si la sortie s'est déclenchée où prévu — et si tu as été tenté de la bouger.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "A stop-loss is not an admission you'll be wrong. It's the price of staying in the game long enough to be right.",
        fr: "Un stop-loss n'avoue pas que tu auras tort. C'est le prix pour rester dans le jeu assez longtemps pour avoir raison.",
      },
    },
  ],
  related: ["order-types", "risk-management-101", "trading-psychology"],
};
