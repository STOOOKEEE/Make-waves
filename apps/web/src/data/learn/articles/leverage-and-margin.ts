import type { RawArticle } from "../types";

/* Perps — notional, marge isolée, liquidation. Exactitude Tide : cap 100x,
 * marge isolée, PnL planchonné à -marge à la fermeture, pas d'auto-liq serveur. */
export const leverageAndMargin: RawArticle = {
  slug: "leverage-and-margin",
  category: "perps",
  difficulty: "advanced",
  minutes: 8,
  icon: "⚖️",
  title: {
    en: "Leverage & margin, explained",
    fr: "Levier & marge, expliqués",
  },
  dek: {
    en: "Leverage multiplies your size — and your risk. Here's exactly how margin, notional and liquidation fit together.",
    fr: "Le levier multiplie ta taille — et ton risque. Voici précisément comment marge, notional et liquidation s'emboîtent.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Leverage lets you control a position larger than your cash. At **10x**, $1,000 controls a $10,000 position. Your gains and losses are calculated on the big number, not the small one — which is the whole point, and the whole danger.",
        fr: "Le levier te permet de piloter une position plus grosse que ton cash. À **10x**, 1 000 $ pilotent une position de 10 000 $. Tes gains et pertes se calculent sur le gros chiffre, pas le petit — c'est tout l'intérêt, et tout le danger.",
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
          en: "**Margin** — the cash you put up to open it (`notional ÷ leverage`). It's reserved, not spent — set aside as collateral.",
          fr: "**Marge** — le cash que tu mets pour l'ouvrir (`notional ÷ levier`). Il est réservé, pas dépensé — mis de côté en garantie.",
        },
        {
          en: "**Liquidation** — if the trade moves against you enough to wipe out your margin, the position is force-closed. On high leverage, \"enough\" is a very small move.",
          fr: "**Liquidation** — si le trade bouge assez contre toi pour effacer ta marge, la position est fermée de force. À fort levier, « assez » est un tout petit mouvement.",
        },
      ],
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
      text: { en: "Isolated margin", fr: "Marge isolée" },
    },
    {
      type: "p",
      text: {
        en: "Tide uses **isolated margin**: each position risks only the margin you assigned to it, never your whole balance. One bad trade can cost you its margin — not your account. This is the safer default and the one worth building habits around.",
        fr: "Tide utilise la **marge isolée** : chaque position ne risque que la marge que tu lui as attribuée, jamais tout ton solde. Un mauvais trade peut te coûter sa marge — pas ton compte. C'est le réglage le plus sûr, et celui autour duquel prendre tes habitudes.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it behaves on Tide", fr: "Comment ça se comporte sur Tide" },
      text: {
        en: "Paper perps allow up to **100x** so you can *feel* how brutal high leverage is — safely. There's no real-time server liquidation engine: instead, a losing position's P&L is **floored at −margin when you close it**, so you can never lose more than you put up. Great for learning the mechanics; not a model of a real exchange's instant liquidation.",
        fr: "Les perps Paper autorisent jusqu'à **100x** pour que tu *ressentes* à quel point le fort levier est brutal — en sécurité. Il n'y a pas de moteur de liquidation serveur en temps réel : à la place, le P&L d'une position perdante est **planchonné à −marge quand tu la fermes**, donc tu ne peux jamais perdre plus que ta mise. Idéal pour la mécanique ; ce n'est pas un modèle de la liquidation instantanée d'un vrai exchange.",
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
