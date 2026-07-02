import type { RawArticle } from "../types";

/* Perps — TP/SL comme protection. Exactitude Tide : déclencheurs côté client. */
export const takeProfitStopLoss: RawArticle = {
  slug: "take-profit-stop-loss",
  category: "perps",
  difficulty: "intermediate",
  minutes: 6,
  title: {
    en: "Take-profit & stop-loss: protecting a position",
    fr: "Take-profit & stop-loss : protéger une position",
  },
  dek: {
    en: "The trade you don't babysit is the trade with a stop. Set your exits before emotion gets a vote.",
    fr: "Le trade que tu ne surveilles pas, c'est celui qui a un stop. Fixe tes sorties avant que l'émotion n'ait voix au chapitre.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Entering a trade is the easy part. The hard part — the part that separates survivors from the rest — is deciding *in advance* where you'll get out, whether you're right or wrong. That's what take-profit and stop-loss are for.",
        fr: "Entrer dans un trade, c'est la partie facile. La partie dure — celle qui sépare les survivants du reste — c'est de décider *à l'avance* où tu sortiras, que tu aies raison ou tort. C'est à ça que servent le take-profit et le stop-loss.",
      },
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
      ],
    },
    {
      type: "h",
      text: { en: "Set them at entry, not in panic", fr: "Fixe-les à l'entrée, pas en panique" },
    },
    {
      type: "p",
      text: {
        en: "The right moment to choose your stop is *before* you're in the trade, when you're calm and objective. Once you're in and the candle is moving, your brain will invent reasons to move the stop \"just a little.\" Pre-committing removes that conversation.",
        fr: "Le bon moment pour choisir ton stop, c'est *avant* d'être dans le trade, quand tu es calme et objectif. Une fois dedans, la bougie qui bouge, ton cerveau inventera des raisons de décaler le stop « juste un peu ». Pré-décider supprime cette discussion.",
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
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "Important on Tide", fr: "Important sur Tide" },
      text: {
        en: "In Paper mode, TP and SL are **triggers evaluated in your browser tab** — if you close the tab, they won't fire. There's no server-side auto-liquidation either. So use them to build the *discipline* of always defining your exits, but don't rely on them as an unattended safety net the way a live exchange stop would work.",
        fr: "En mode Paper, le TP et le SL sont des **déclencheurs évalués dans l'onglet de ton navigateur** — si tu fermes l'onglet, ils ne se déclenchent pas. Il n'y a pas non plus de liquidation auto côté serveur. Sers-t'en pour bâtir la *discipline* de toujours définir tes sorties, mais ne compte pas dessus comme un filet de sécurité sans surveillance, à la manière d'un stop sur un exchange réel.",
      },
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
