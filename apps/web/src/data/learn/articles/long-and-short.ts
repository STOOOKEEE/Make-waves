import type { RawArticle } from "../types";

/* Perps — direction long/short, maths du PnL. */
export const longAndShort: RawArticle = {
  slug: "long-and-short",
  category: "perps",
  difficulty: "intermediate",
  minutes: 6,
  title: {
    en: "Going long and going short",
    fr: "Aller long et aller short",
  },
  dek: {
    en: "The superpower of perps: you can bet on down, not just up. Master both directions and no market is ever \"boring\".",
    fr: "Le super-pouvoir des perps : parier sur la baisse, pas seulement la hausse. Maîtrise les deux sens et aucun marché n'est jamais « ennuyeux ».",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "With spot you only have one move: buy and hope it rises. Perps give you two. That means you're never stuck waiting for a bull market — you can trade the direction that's actually happening.",
        fr: "Avec le spot tu n'as qu'un coup : acheter et espérer que ça monte. Les perps t'en donnent deux. Tu n'es donc jamais coincé à attendre un marché haussier — tu peux trader la direction qui se produit vraiment.",
      },
    },
    {
      type: "h",
      text: { en: "Long: betting up", fr: "Long : parier à la hausse" },
    },
    {
      type: "p",
      text: {
        en: "You go **long** when you expect the price to rise. You profit as it climbs above your entry and lose as it falls below. Same intuition as buying spot — just expressed through the contract.",
        fr: "Tu vas **long** quand tu attends une hausse. Tu gagnes à mesure que le prix grimpe au-dessus de ton entrée, et tu perds s'il descend en dessous. Même intuition que l'achat spot — juste exprimée via le contrat.",
      },
    },
    {
      type: "h",
      text: { en: "Short: betting down", fr: "Short : parier à la baisse" },
    },
    {
      type: "p",
      text: {
        en: "You go **short** when you expect the price to fall. The mechanics feel backwards at first: you profit when the price drops below your entry, and lose when it rises. You're effectively selling high with a plan to \"buy back\" lower.",
        fr: "Tu vas **short** quand tu attends une baisse. La mécanique semble inversée au début : tu gagnes quand le prix passe sous ton entrée, et tu perds quand il monte. Tu vends haut avec le plan de « racheter » plus bas.",
      },
    },
    {
      type: "h",
      text: { en: "The one formula", fr: "La seule formule" },
    },
    {
      type: "p",
      text: {
        en: "Both directions collapse into a single rule. With `direction = +1` for long and `−1` for short:",
        fr: "Les deux directions se résument à une seule règle. Avec `direction = +1` pour long et `−1` pour short :",
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
      type: "example",
      title: { en: "Same market, opposite bets", fr: "Même marché, paris opposés" },
      rows: [
        { k: { en: "Entry", fr: "Entrée" }, v: { en: "SOL at $150", fr: "SOL à 150 $" } },
        { k: { en: "Price falls to", fr: "Le prix tombe à" }, v: { en: "$135 (−10%)", fr: "135 $ (−10 %)" } },
        { k: { en: "Long P&L", fr: "P&L long" }, v: { en: "−10%", fr: "−10 %" } },
        { k: { en: "Short P&L", fr: "P&L short" }, v: { en: "+10%", fr: "+10 %" } },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Try it on Tide", fr: "Essaie sur Tide" },
      text: {
        en: "In the Paper terminal, switch a market to Perp and open a small **short**. Watching your P&L go *green as the chart goes red* is the moment shorting finally clicks. Do it once and you'll never see a downtrend the same way.",
        fr: "Dans le terminal Paper, passe un marché en Perp et ouvre un petit **short**. Voir ton P&L virer au *vert quand le graphique vire au rouge*, c'est le moment où le short fait tilt. Fais-le une fois et tu ne verras plus jamais une baisse de la même façon.",
      },
    },
  ],
  related: ["what-is-a-perpetual", "leverage-and-margin", "trend-following"],
};
