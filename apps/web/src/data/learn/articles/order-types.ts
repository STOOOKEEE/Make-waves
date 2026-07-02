import type { RawArticle } from "../types";

/* Basics — market / limit / TP / SL, ancré sur le terminal Tide (déclencheurs
 * TP/SL/limit côté client, cf. règles d'exactitude). */
export const orderTypes: RawArticle = {
  slug: "order-types",
  category: "basics",
  difficulty: "beginner",
  minutes: 7,
  icon: "🎛️",
  title: {
    en: "Order types: market, limit, TP & SL",
    fr: "Types d'ordres : market, limit, TP & SL",
  },
  dek: {
    en: "Four buttons decide how you get in and out. Pick the wrong one and a good idea becomes a bad trade.",
    fr: "Quatre boutons décident comment tu entres et sors. Le mauvais choix, et une bonne idée devient un mauvais trade.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "An order is an instruction: buy or sell, how much, and **on what terms**. The terms are the order type. On the Tide terminal you'll use four.",
        fr: "Un ordre, c'est une instruction : acheter ou vendre, combien, et **à quelles conditions**. Les conditions, c'est le type d'ordre. Sur le terminal Tide tu en utilises quatre.",
      },
    },
    {
      type: "h",
      text: { en: "Market order — speed over price", fr: "Ordre market — la vitesse avant le prix" },
    },
    {
      type: "p",
      text: {
        en: "A **market order** executes right now, at the best price available. You get filled instantly, but you accept whatever the market gives you. Perfect when getting in matters more than a few cents of price.",
        fr: "Un **ordre market** s'exécute tout de suite, au meilleur prix disponible. Tu es rempli instantanément, mais tu acceptes ce que le marché te donne. Parfait quand entrer compte plus que quelques centimes de prix.",
      },
    },
    {
      type: "h",
      text: { en: "Limit order — price over speed", fr: "Ordre limit — le prix avant la vitesse" },
    },
    {
      type: "p",
      text: {
        en: "A **limit order** sets your price in advance: \"buy only at $59,800 or better.\" It waits until the market reaches your level. You control the price, but there's no guarantee it fills — the market may never come to you.",
        fr: "Un **ordre limit** fixe ton prix à l'avance : « acheter seulement à 59 800 $ ou mieux ». Il attend que le marché atteigne ton niveau. Tu contrôles le prix, mais rien ne garantit l'exécution — le marché peut ne jamais venir à toi.",
      },
    },
    {
      type: "h",
      text: { en: "Take-profit & stop-loss — your exits", fr: "Take-profit & stop-loss — tes sorties" },
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
      ],
    },
    {
      type: "example",
      title: { en: "A planned trade", fr: "Un trade planifié" },
      rows: [
        { k: { en: "Entry (limit)", fr: "Entrée (limit)" }, v: { en: "Buy at $60,000", fr: "Achat à 60 000 $" } },
        { k: { en: "Take-profit", fr: "Take-profit" }, v: { en: "$66,000 (+10%)", fr: "66 000 $ (+10 %)" } },
        { k: { en: "Stop-loss", fr: "Stop-loss" }, v: { en: "$57,000 (−5%)", fr: "57 000 $ (−5 %)" } },
        { k: { en: "Risk / reward", fr: "Risque / gain" }, v: { en: "1 : 2", fr: "1 : 2" } },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How TP/SL & limits work on Tide", fr: "Comment TP/SL & limits marchent sur Tide" },
      text: {
        en: "In Paper mode, limit orders and TP/SL are **triggers watched in your browser** — the terminal tab has to stay open for them to fire, and there's no server-side auto-liquidation. Treat them as a discipline tool for learning, not a fire-and-forget safety net.",
        fr: "En mode Paper, les ordres limit et TP/SL sont des **déclencheurs surveillés dans ton navigateur** — l'onglet du terminal doit rester ouvert pour qu'ils se déclenchent, et il n'y a pas de liquidation auto côté serveur. Vois-les comme un outil de discipline pour apprendre, pas un filet de sécurité qu'on pose et qu'on oublie.",
      },
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
