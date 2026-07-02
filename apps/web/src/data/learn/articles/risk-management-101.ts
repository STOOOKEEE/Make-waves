import type { RawArticle } from "../types";

/* Strategies — position sizing, règle du 1 %, R:R. */
export const riskManagement101: RawArticle = {
  slug: "risk-management-101",
  category: "strategies",
  difficulty: "intermediate",
  minutes: 8,
  featured: false,
  icon: "🛡️",
  title: {
    en: "Risk management 101: position sizing & R:R",
    fr: "Gestion du risque 101 : sizing & R:R",
  },
  dek: {
    en: "You can be right less than half the time and still win. The secret isn't prediction — it's math you decide in advance.",
    fr: "Tu peux avoir raison moins d'une fois sur deux et gagner quand même. Le secret n'est pas la prédiction — c'est un calcul que tu décides à l'avance.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Ask a pro what they do and most will say the same thing: they manage risk. Entries are guesses; risk is a decision. This is the one lesson that keeps you in the game long enough for a good strategy to pay off.",
        fr: "Demande à un pro ce qu'il fait, la plupart répondront pareil : ils gèrent le risque. Les entrées sont des paris ; le risque est une décision. C'est la leçon qui te maintient en jeu assez longtemps pour qu'une bonne stratégie porte ses fruits.",
      },
    },
    {
      type: "h",
      text: { en: "The 1% rule", fr: "La règle du 1 %" },
    },
    {
      type: "p",
      text: {
        en: "Never risk more than a small, fixed slice of your account on one trade — a common rule is **1%**. Risk here means the distance to your stop-loss, not the position size. With a $10,000 account, 1% is $100 of risk per trade. Lose ten in a row (rare) and you're down 10%, not wiped out.",
        fr: "Ne risque jamais plus qu'une petite fraction fixe de ton compte sur un seul trade — une règle courante est **1 %**. Le risque ici, c'est la distance jusqu'à ton stop-loss, pas la taille de la position. Avec un compte de 10 000 $, 1 % = 100 $ de risque par trade. Perds dix fois de suite (rare) et tu es à −10 %, pas ruiné.",
      },
    },
    {
      type: "h",
      text: { en: "Position sizing: work backwards", fr: "Sizing : remonte le calcul" },
    },
    {
      type: "p",
      text: {
        en: "Your stop distance decides your size, not the other way around. Formula: `size = risk amount ÷ stop distance`. A tight stop lets you take a bigger position for the same risk; a wide stop forces a smaller one.",
        fr: "C'est la distance de ton stop qui décide ta taille, pas l'inverse. Formule : `taille = montant risqué ÷ distance du stop`. Un stop serré t'autorise une position plus grosse pour le même risque ; un stop large en impose une plus petite.",
      },
    },
    {
      type: "example",
      title: { en: "Sizing a trade", fr: "Dimensionner un trade" },
      rows: [
        { k: { en: "Account", fr: "Compte" }, v: { en: "$10,000", fr: "10 000 $" } },
        { k: { en: "Risk per trade (1%)", fr: "Risque/trade (1 %)" }, v: { en: "$100", fr: "100 $" } },
        { k: { en: "Entry / stop", fr: "Entrée / stop" }, v: { en: "$100 / $95", fr: "100 $ / 95 $" } },
        { k: { en: "Stop distance", fr: "Distance du stop" }, v: { en: "$5", fr: "5 $" } },
        { k: { en: "Position size", fr: "Taille" }, v: { en: "20 units", fr: "20 unités" } },
      ],
    },
    {
      type: "h",
      text: { en: "Risk-to-reward (R:R)", fr: "Risque-sur-gain (R:R)" },
    },
    {
      type: "p",
      text: {
        en: "Before entering, compare what you risk to what you aim to make. If you risk $100 to make $200, that's a **2:1** trade. At 2:1 you only need to be right about **1 time in 3** to break even. This is why a losing-more-than-half trader can still be profitable: winners are bigger than losers.",
        fr: "Avant d'entrer, compare ce que tu risques à ce que tu vises. Risquer 100 $ pour en gagner 200, c'est un trade **2:1**. À 2:1 tu n'as besoin d'avoir raison qu'**une fois sur trois** pour être à l'équilibre. Voilà pourquoi un trader perdant plus d'une fois sur deux peut rester profitable : les gains sont plus gros que les pertes.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Where Tide is perfect for this", fr: "Là où Tide est parfait pour ça" },
      text: {
        en: "Risk rules are boring until they save you — and painful to learn with real money. Practice sizing every trade on the Paper terminal until it's automatic. The competition leaderboard quietly rewards the disciplined, not the lucky, over a full season.",
        fr: "Les règles de risque sont ennuyeuses jusqu'à ce qu'elles te sauvent — et douloureuses à apprendre avec de l'argent réel. Entraîne-toi à dimensionner chaque trade sur le terminal Paper jusqu'à ce que ce soit automatique. Sur une saison entière, le classement récompense discrètement les disciplinés, pas les chanceux.",
      },
    },
    {
      type: "quote",
      text: {
        en: "Take care of the losses and the profits will take care of themselves.",
        fr: "Occupe-toi des pertes, les profits s'occuperont d'eux-mêmes.",
      },
    },
  ],
  related: ["leverage-and-margin", "take-profit-stop-loss", "trading-psychology"],
};
