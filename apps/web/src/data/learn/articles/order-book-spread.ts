import type { RawArticle } from "../types";

/* Basics — carnet d'ordres, bid/ask/spread, maker vs taker (fees Tide). */
export const orderBookSpread: RawArticle = {
  slug: "order-book-spread",
  category: "basics",
  difficulty: "intermediate",
  minutes: 6,
  icon: "📖",
  title: {
    en: "Bid, ask, spread & the order book",
    fr: "Bid, ask, spread & le carnet d'ordres",
  },
  dek: {
    en: "Where does the price actually come from? Peek inside the order book — the market's beating heart.",
    fr: "D'où vient vraiment le prix ? Regarde dans le carnet d'ordres — le cœur battant du marché.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "The single \"price\" you see is a summary. Underneath sits the **order book**: a live list of everyone waiting to buy or sell, and at what price. Tide shows real order books from venues like the XRPL DEX and Binance — this is the real thing, not a simulation.",
        fr: "Le « prix » unique que tu vois est un résumé. En dessous se trouve le **carnet d'ordres** : la liste vivante de tous ceux qui attendent d'acheter ou de vendre, et à quel prix. Tide affiche de vrais carnets issus de places comme le DEX XRPL et Binance — du réel, pas une simulation.",
      },
    },
    {
      type: "h",
      text: { en: "Bid, ask, spread", fr: "Bid, ask, spread" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Bid** — the highest price a buyer is currently willing to pay.",
          fr: "**Bid** — le prix le plus haut qu'un acheteur est prêt à payer maintenant.",
        },
        {
          en: "**Ask** — the lowest price a seller is willing to accept.",
          fr: "**Ask** — le prix le plus bas qu'un vendeur accepte.",
        },
        {
          en: "**Spread** — the gap between them. A tight spread means a liquid, healthy market; a wide spread means it's thin and costlier to trade.",
          fr: "**Spread** — l'écart entre les deux. Un spread serré = marché liquide et sain ; un spread large = marché mince et plus cher à trader.",
        },
      ],
    },
    {
      type: "p",
      text: {
        en: "When you place a market buy, you pay the ask. When you market sell, you hit the bid. That spread is a real, if invisible, cost on every round trip.",
        fr: "Quand tu passes un achat market, tu paies l'ask. Quand tu vends market, tu tapes le bid. Ce spread est un coût réel, quoique invisible, sur chaque aller-retour.",
      },
    },
    {
      type: "h",
      text: { en: "Maker vs taker", fr: "Maker vs taker" },
    },
    {
      type: "p",
      text: {
        en: "There are two ways to trade against the book:",
        fr: "Il y a deux façons de trader contre le carnet :",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Taker** — you cross the spread and take liquidity that's already there (a market order). Instant, but you pay the higher fee.",
          fr: "**Taker** — tu franchis le spread et prends la liquidité déjà présente (un ordre market). Instantané, mais tu paies le frais le plus élevé.",
        },
        {
          en: "**Maker** — you post a limit order and wait, *adding* liquidity to the book. You might not get filled, but you pay a lower fee for your patience.",
          fr: "**Maker** — tu poses un ordre limit et attends, en *ajoutant* de la liquidité au carnet. Tu n'es pas sûr d'être rempli, mais ta patience paie un frais plus bas.",
        },
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Fees on Tide", fr: "Les frais sur Tide" },
      text: {
        en: "Tide's paper terminal models this honestly: a **maker fee of 0.02%** and a **taker fee of 0.06%**, charged when a position opens. Small numbers — but over hundreds of trades, taking liquidity every time adds up.",
        fr: "Le terminal paper de Tide modélise ça honnêtement : un **frais maker de 0,02 %** et un **frais taker de 0,06 %**, prélevés à l'ouverture d'une position. Des petits chiffres — mais sur des centaines de trades, prendre la liquidité à chaque fois, ça s'accumule.",
      },
    },
  ],
  related: ["order-types", "reading-a-chart", "how-tide-works"],
};
