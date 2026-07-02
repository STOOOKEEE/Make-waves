import type { RawArticle } from "../types";

/* Strategies — retour à la moyenne, support/résistance, ranges. */
export const meanReversionRanges: RawArticle = {
  slug: "mean-reversion-ranges",
  category: "strategies",
  difficulty: "advanced",
  minutes: 7,
  title: {
    en: "Mean reversion & trading the range",
    fr: "Retour à la moyenne & trader le range",
  },
  dek: {
    en: "Not every market trends. When price bounces between two walls, you play the walls — buy low, sell high, repeat.",
    fr: "Tous les marchés ne suivent pas de tendance. Quand le prix rebondit entre deux murs, tu joues les murs — achète bas, vends haut, recommence.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Markets spend a lot of time going nowhere — chopping sideways in a **range**. Mean reversion is the opposite mindset to trend following: instead of expecting a move to continue, you bet that price stretched too far will snap back toward its average.",
        fr: "Les marchés passent beaucoup de temps à ne mener nulle part — à hacher latéralement dans un **range**. Le retour à la moyenne est l'état d'esprit inverse du suivi de tendance : au lieu d'attendre qu'un mouvement continue, tu paries qu'un prix trop étiré va revenir vers sa moyenne.",
      },
    },
    {
      type: "h",
      text: { en: "Support & resistance: the walls", fr: "Support & résistance : les murs" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Support** — a price floor where buyers keep stepping in and the drop stalls. The bottom of the range.",
          fr: "**Support** — un plancher de prix où les acheteurs reviennent et où la baisse cale. Le bas du range.",
        },
        {
          en: "**Resistance** — a ceiling where sellers keep appearing and rallies stall. The top of the range.",
          fr: "**Résistance** — un plafond où les vendeurs réapparaissent et où les hausses calent. Le haut du range.",
        },
      ],
    },
    {
      type: "p",
      text: {
        en: "The more times price touches a level and turns, the more traders watch it — which makes it more real. You buy near support with a stop just below it, and sell near resistance. Your risk is small (the wall is right there) and defined.",
        fr: "Plus le prix touche un niveau et se retourne, plus les traders le surveillent — ce qui le rend plus réel. Tu achètes près du support avec un stop juste en dessous, et tu vends près de la résistance. Ton risque est petit (le mur est juste là) et défini.",
      },
    },
    {
      type: "h",
      text: { en: "The trap: ranges eventually break", fr: "Le piège : les ranges finissent par casser" },
    },
    {
      type: "p",
      text: {
        en: "Every range ends. The danger of mean reversion is fading a move that turns out to be a real breakout — buying \"support\" as the floor gives way. That's why the stop just beyond the wall is non-negotiable: when the level breaks, you're out fast and small, and you can even flip to trade the breakout.",
        fr: "Tout range finit. Le danger du retour à la moyenne, c'est de contrer un mouvement qui s'avère être une vraie cassure — acheter le « support » pendant que le plancher cède. D'où le stop juste au-delà du mur, non négociable : quand le niveau casse, tu sors vite et petit, et tu peux même te retourner pour trader la cassure.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "Know which market you're in", fr: "Sache dans quel marché tu es" },
      text: {
        en: "Range strategies get shredded in a strong trend, and trend strategies get chopped up in a range. Before you pick a playbook, decide which regime the chart is in. Getting *that* right matters more than any single entry.",
        fr: "Les stratégies de range se font déchiqueter dans une forte tendance, et les stratégies de tendance se font hacher dans un range. Avant de choisir un plan, décide dans quel régime est le graphique. Réussir *ça* compte plus que n'importe quelle entrée isolée.",
      },
    },
    {
      type: "quote",
      text: {
        en: "The trend is your friend — until the range decides otherwise.",
        fr: "La tendance est ton amie — jusqu'à ce que le range en décide autrement.",
      },
    },
  ],
  related: ["trend-following", "breakout-trading", "reading-a-chart"],
};
