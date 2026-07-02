import type { RawArticle } from "../types";

/* Perps — direction long/short, maths du PnL. Expanded to gold-standard depth. */
export const longAndShort: RawArticle = {
  slug: "long-and-short",
  category: "perps",
  difficulty: "intermediate",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "long and short",
    "long vs short",
    "shorting crypto",
    "perps trading",
    "how shorting works",
    "pnl formula",
    "paper trading",
    "long short positions",
  ],
  title: {
    en: "Going long and going short",
    fr: "Aller long et aller short",
  },
  seoTitle: {
    en: "Long and Short Explained: Trade Both Directions in Crypto",
    fr: "Long et short expliqués : trader la hausse et la baisse",
  },
  seoDescription: {
    en: "Long and short explained for beginners: profit when price rises or falls, the one P&L formula, real examples, and how to practice shorting risk-free on Tide.",
    fr: "Long et short expliqués aux débutants : gagner à la hausse comme à la baisse, la formule de P&L, des exemples chiffrés, et comment t'entraîner au short sans risque sur Tide.",
  },
  dek: {
    en: "The superpower of perps: you can bet on down, not just up. Master long and short and no market is ever \"boring\".",
    fr: "Le super-pouvoir des perps : parier sur la baisse, pas seulement la hausse. Maîtrise le long et le short et aucun marché n'est jamais « ennuyeux ».",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "**Long and short** are the two directions every trade can take, and learning both is the moment the market doubles in size for you. With spot you only have one move: buy and hope it rises. Perps give you two — you can profit when price goes up *and* when it goes down. That means you're never stuck waiting for a bull market. You trade the direction that's actually happening.",
        fr: "**Long et short**, ce sont les deux directions que peut prendre un trade, et maîtriser les deux, c'est le moment où le marché double de taille pour toi. Avec le spot tu n'as qu'un coup : acheter et espérer que ça monte. Les perps t'en donnent deux — tu peux gagner quand le prix monte *et* quand il baisse. Tu n'es donc jamais coincé à attendre un marché haussier. Tu trades la direction qui se produit vraiment.",
      },
    },
    {
      type: "h",
      text: { en: "Long: betting the price goes up", fr: "Long : parier à la hausse" },
    },
    {
      type: "p",
      text: {
        en: "You go **long** when you expect the price to rise. You profit as it climbs above your entry and you lose as it falls below. It's the same intuition as buying spot — buy low, sell high — just expressed through the contract. Most traders start here because it matches how we naturally think about owning something.",
        fr: "Tu vas **long** quand tu attends une hausse. Tu gagnes à mesure que le prix grimpe au-dessus de ton entrée, et tu perds s'il descend en dessous. Même intuition que l'achat spot — acheter bas, revendre haut — juste exprimée via le contrat. La plupart des traders commencent ici parce que ça colle à la façon naturelle de penser la possession.",
      },
    },
    {
      type: "h",
      text: { en: "Short: betting the price goes down", fr: "Short : parier à la baisse" },
    },
    {
      type: "p",
      text: {
        en: "You go **short** when you expect the price to fall. The mechanics feel backwards the first time: you profit when the price drops below your entry, and you lose when it rises. You're effectively selling high with a plan to \"buy back\" lower and pocket the gap. This is the half of trading most beginners never touch — and it's exactly why they sit on their hands through every downtrend.",
        fr: "Tu vas **short** quand tu attends une baisse. La mécanique semble inversée la première fois : tu gagnes quand le prix passe sous ton entrée, et tu perds quand il monte. Tu vends haut avec le plan de « racheter » plus bas et d'empocher l'écart. C'est la moitié du trading que la plupart des débutants n'exploitent jamais — et c'est exactement pour ça qu'ils restent les bras croisés pendant chaque baisse.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Long** — profit when price ↑, lose when price ↓. Your intuition already gets this one.",
          fr: "**Long** — gagne quand le prix ↑, perd quand le prix ↓. Ton intuition capte déjà celui-là.",
        },
        {
          en: "**Short** — profit when price ↓, lose when price ↑. Sell high first, buy back lower.",
          fr: "**Short** — gagne quand le prix ↓, perd quand le prix ↑. Vends haut d'abord, rachète plus bas.",
        },
        {
          en: "**Both** are just a bet on *distance and direction* from your entry — nothing more mystical than that.",
          fr: "**Les deux** ne sont qu'un pari sur la *distance et la direction* depuis ton entrée — rien de plus mystique que ça.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "The one formula behind long and short", fr: "La seule formule derrière long et short" },
    },
    {
      type: "p",
      text: {
        en: "Both directions collapse into a single rule. Set `direction = +1` for a long and `−1` for a short, and every position obeys the same line of maths:",
        fr: "Les deux directions se résument à une seule règle. Pose `direction = +1` pour un long et `−1` pour un short, et chaque position obéit à la même ligne de maths :",
      },
    },
    {
      type: "quote",
      text: {
        en: "P&L = (current price − entry price) × quantity × direction",
        fr: "P&L = (prix actuel − prix d'entrée) × quantité × direction",
      },
    },
    {
      type: "p",
      text: {
        en: "Read it slowly. When you're long, `direction = +1`, so a higher price than your entry is a profit. When you're short, `direction = −1`, so that same higher price becomes a loss — and a *lower* price flips to profit. One equation, two mirror-image outcomes. Memorise this and you never have to guess who's winning.",
        fr: "Lis-la lentement. Quand tu es long, `direction = +1`, donc un prix supérieur à ton entrée est un gain. Quand tu es short, `direction = −1`, donc ce même prix supérieur devient une perte — et un prix *inférieur* bascule en gain. Une équation, deux résultats en miroir. Retiens ça et tu n'as plus jamais à deviner qui gagne.",
      },
    },
    {
      type: "example",
      title: { en: "Same market, opposite bets", fr: "Même marché, paris opposés" },
      rows: [
        { k: { en: "Entry", fr: "Entrée" }, v: { en: "SOL at $150", fr: "SOL à 150 $" } },
        { k: { en: "Quantity", fr: "Quantité" }, v: { en: "10 SOL", fr: "10 SOL" } },
        { k: { en: "Price falls to", fr: "Le prix tombe à" }, v: { en: "$135 (−10%)", fr: "135 $ (−10 %)" } },
        { k: { en: "Long P&L", fr: "P&L long" }, v: { en: "−$150 (−10%)", fr: "−150 $ (−10 %)" } },
        { k: { en: "Short P&L", fr: "P&L short" }, v: { en: "+$150 (+10%)", fr: "+150 $ (+10 %)" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "Notice the symmetry: on a 15-dollar drop, `(135 − 150) × 10 × (+1) = −150` for the long, and `× (−1) = +150` for the short. The same move that hurts one side feeds the other. That's the whole point of having both tools on your belt.",
        fr: "Remarque la symétrie : sur une baisse de 15 dollars, `(135 − 150) × 10 × (+1) = −150` pour le long, et `× (−1) = +150` pour le short. Le même mouvement qui blesse un camp nourrit l'autre. C'est tout l'intérêt d'avoir les deux outils à la ceinture.",
      },
    },
    {
      type: "h",
      text: { en: "When do you use each direction?", fr: "Quand utiliser chaque direction ?" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Go long** in an uptrend, on a bounce off support, or when a strong narrative is pulling buyers in.",
          fr: "**Va long** dans une tendance haussière, sur un rebond au support, ou quand un narratif fort attire les acheteurs.",
        },
        {
          en: "**Go short** in a downtrend, on a rejection at resistance, or when a story breaks and sellers pile out.",
          fr: "**Va short** dans une tendance baissière, sur un rejet à la résistance, ou quand une histoire casse et que les vendeurs se ruent dehors.",
        },
        {
          en: "**Stay flat** when you can't clearly read direction. No position is a position — the market pays for patience.",
          fr: "**Reste à plat** quand tu ne lis pas clairement la direction. Ne rien avoir en cours est une décision — le marché paie la patience.",
        },
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Long and short aren't symmetric in risk", fr: "Long et short ne sont pas symétriques en risque" },
      text: {
        en: "A long can only fall to zero — your downside is capped at your entry. A short, in theory, faces unbounded loss because a price can keep climbing with no ceiling. In a *simulated* environment you're shielded from the worst of it, but the instinct matters: respect your upside risk when you're short and size accordingly.",
        fr: "Un long ne peut tomber qu'à zéro — ton risque à la baisse est plafonné à ton entrée. Un short, en théorie, fait face à une perte non bornée car un prix peut grimper sans plafond. Dans un environnement *simulé* tu es protégé du pire, mais l'instinct compte : respecte ton risque à la hausse quand tu es short et dimensionne en conséquence.",
      },
    },
    {
      type: "h",
      text: { en: "How long and short work on Tide", fr: "Comment le long et le short marchent sur Tide" },
    },
    {
      type: "p",
      text: {
        en: "On Tide, perp positions — long and short alike — are **simulated in Paper mode**. You get the full feel of directional trading on live top-250 crypto prices, but there's no borrowed money and no real leverage moving under the hood. It's the reflexes without the rent.",
        fr: "Sur Tide, les positions perp — long comme short — sont **simulées en mode Paper**. Tu obtiens tout le ressenti du trading directionnel sur des prix crypto live du top 250, mais sans argent emprunté et sans vrai levier qui tourne sous le capot. Ce sont les réflexes sans le loyer.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "Perp is Paper-only and simulated — no real leverage, no borrowing. Leverage caps at **100x**, margin is **isolated**, and realized P&L is **floored at −margin when you close** (there's no server-side auto-liquidation). Your **TP/SL and limit orders are client-side triggers**: the browser tab has to stay open for them to fire. Fees at open are **0.02% maker / 0.06% taker**. **Live mode is different** — it's a real non-custodial *spot* swap, XRP vs RLUSD only, with no leverage and no shorting.",
        fr: "Le perp est Paper-only et simulé — pas de vrai levier, pas d'emprunt. Le levier plafonne à **100x**, la marge est **isolée**, et le P&L réalisé est **plafonné à −marge à la fermeture** (pas d'auto-liquidation côté serveur). Tes **ordres TP/SL et limit sont des déclencheurs côté client** : l'onglet du navigateur doit rester ouvert pour qu'ils partent. Les frais à l'ouverture sont de **0,02% maker / 0,06% taker**. **Le mode Live est différent** — c'est un vrai swap *spot* non-custodial, XRP contre RLUSD uniquement, sans levier et sans short.",
      },
    },
    {
      type: "h",
      text: { en: "Common beginner mistakes with direction", fr: "Erreurs de débutant sur la direction" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Only ever going long** — you cut half your opportunities and grind through every bear phase doing nothing.",
          fr: "**Ne jamais aller que long** — tu coupes la moitié de tes opportunités et tu traverses chaque phase baissière à ne rien faire.",
        },
        {
          en: "**Shorting a strong uptrend** to \"catch the top\" — fighting momentum is how accounts bleed. Trade the trend, not your ego.",
          fr: "**Shorter une forte tendance haussière** pour « attraper le top » — combattre le momentum, c'est comme ça qu'un compte saigne. Trade la tendance, pas ton ego.",
        },
        {
          en: "**Forgetting a short's risk is uncapped** — a runaway rally against a short hurts more than a dip against a long.",
          fr: "**Oublier que le risque d'un short est non plafonné** — un rallye incontrôlé contre un short fait plus mal qu'une baisse contre un long.",
        },
        {
          en: "**Flipping direction on every candle** — revenge-flipping long↔short churns fees and never gives an edge time to play out.",
          fr: "**Inverser la direction à chaque bougie** — flipper long↔short par vengeance brûle des frais et ne laisse jamais un edge se dérouler.",
        },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Try it on Tide", fr: "Essaie sur Tide" },
      text: {
        en: "In the Paper terminal, switch a market to Perp and open a small **short** with virtual capital. Watching your P&L go *green as the chart goes red* is the moment shorting finally clicks. Do it once and you'll never look at a downtrend the same way again.",
        fr: "Dans le terminal Paper, passe un marché en Perp et ouvre un petit **short** avec du capital virtuel. Voir ton P&L virer au *vert quand le graphique vire au rouge*, c'est le moment où le short fait tilt. Fais-le une fois et tu ne verras plus jamais une baisse de la même façon.",
      },
    },
    {
      type: "h",
      text: { en: "Put it into practice", fr: "Mets-le en pratique" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Pick a market with a clear direction and decide, *before entering*, whether the setup is a long or a short.",
          fr: "Choisis un marché à direction claire et décide, *avant d'entrer*, si le setup est un long ou un short.",
        },
        {
          en: "Open a small Paper perp position in that direction and set where you'll take profit and where you'll cut the loss.",
          fr: "Ouvre une petite position perp Paper dans cette direction et fixe où tu prends le profit et où tu coupes la perte.",
        },
        {
          en: "Note *why* you chose that side, then let the result — win or lose — refine your read for next time.",
          fr: "Note *pourquoi* tu as choisi ce sens, puis laisse le résultat — gain ou perte — affiner ta lecture pour la prochaine fois.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "A trader who can only go long is playing half the game. Learn both directions and every market becomes an opportunity.",
        fr: "Un trader qui ne sait qu'aller long joue à moitié. Maîtrise les deux directions et chaque marché devient une opportunité.",
      },
    },
  ],
  related: ["what-is-a-perpetual", "leverage-and-margin", "trend-following"],
};
