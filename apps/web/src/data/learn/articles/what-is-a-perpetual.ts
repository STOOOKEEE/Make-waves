import type { RawArticle } from "../types";

/* Perps — perp vs spot, pas d'expiration, funding. Exactitude : sur Tide le
 * perp est simulé en Paper (pas de levier réel). */
export const whatIsAPerpetual: RawArticle = {
  slug: "what-is-a-perpetual",
  category: "perps",
  difficulty: "intermediate",
  minutes: 7,
  featured: false,
  icon: "♾️",
  title: {
    en: "What is a perpetual future?",
    fr: "C'est quoi un future perpétuel ?",
  },
  dek: {
    en: "The most traded product in crypto. No expiry, tracks the spot price, and lets you go long or short with leverage.",
    fr: "Le produit le plus tradé en crypto. Sans expiration, colle au prix spot, et te laisse aller long ou short avec levier.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "A **perpetual future** (\"perp\") is a contract that tracks an asset's price without you ever owning the asset. Unlike traditional futures, it never expires — you can hold it as long as you like. It's the dominant instrument in crypto trading, and understanding it is the gateway to leverage.",
        fr: "Un **future perpétuel** (« perp ») est un contrat qui suit le prix d'un actif sans que tu possèdes jamais l'actif. Contrairement aux futures classiques, il n'expire jamais — tu le gardes aussi longtemps que tu veux. C'est l'instrument dominant du trading crypto, et le comprendre ouvre la porte au levier.",
      },
    },
    {
      type: "h",
      text: { en: "Perp vs spot", fr: "Perp vs spot" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Spot** — you buy the actual asset. Own 1 ETH, it's yours; you can only profit if it goes up.",
          fr: "**Spot** — tu achètes l'actif réel. Détiens 1 ETH, il est à toi ; tu ne gagnes que s'il monte.",
        },
        {
          en: "**Perp** — you trade a contract on the price. You never hold the coin, you can go long *or* short, and you can use leverage to control a bigger position than your cash.",
          fr: "**Perp** — tu trades un contrat sur le prix. Tu ne détiens jamais la pièce, tu peux aller long *ou* short, et tu peux utiliser le levier pour piloter une position plus grosse que ton cash.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "How it tracks the price: funding", fr: "Comment il colle au prix : le funding" },
    },
    {
      type: "p",
      text: {
        en: "Since a perp has no expiry to anchor it, a mechanism called the **funding rate** keeps it glued to the real (spot) price. Periodically, one side pays the other: when perp trades above spot, longs pay shorts; when below, shorts pay longs. It's a small, recurring nudge that pulls the contract back toward reality — and a real cost to factor in when you hold a position for a long time.",
        fr: "Comme un perp n'a pas d'échéance pour l'ancrer, un mécanisme appelé **taux de funding** le maintient collé au prix réel (spot). Périodiquement, un camp paie l'autre : quand le perp trade au-dessus du spot, les longs paient les shorts ; en dessous, les shorts paient les longs. C'est une petite poussée récurrente qui ramène le contrat vers la réalité — et un vrai coût à intégrer quand tu gardes une position longtemps.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "Perps on Tide are a simulation", fr: "Les perps sur Tide sont une simulation" },
      text: {
        en: "Tide lets you trade perps **in Paper only, with no real leverage and no borrowed money**. The point is to learn how leverage, longs, shorts and liquidation *behave* — safely — before deciding whether real leveraged trading is for you. Your simulated P&L feeds the leaderboard, but nothing is ever borrowed or liquidated on-chain.",
        fr: "Tide te laisse trader des perps **en Paper uniquement, sans levier réel et sans argent emprunté**. Le but est d'apprendre comment le levier, les longs, les shorts et la liquidation *se comportent* — en sécurité — avant de décider si le trading à levier réel est fait pour toi. Ton P&L simulé alimente le classement, mais rien n'est jamais emprunté ni liquidé on-chain.",
      },
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
