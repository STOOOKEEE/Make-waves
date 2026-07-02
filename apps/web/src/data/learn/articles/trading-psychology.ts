import type { RawArticle } from "../types";

/* Strategies — discipline, biais, revenge trading. */
export const tradingPsychology: RawArticle = {
  slug: "trading-psychology",
  category: "strategies",
  difficulty: "beginner",
  minutes: 7,
  title: {
    en: "Trading psychology: your real opponent",
    fr: "Psychologie du trading : ton vrai adversaire",
  },
  dek: {
    en: "Two traders, same strategy, opposite results. The difference is never the chart — it's the person reading it.",
    fr: "Deux traders, même stratégie, résultats opposés. La différence n'est jamais le graphique — c'est la personne qui le lit.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "You can know every pattern and still lose, because the market is an emotional machine and you're plugged into it. Fear, greed and ego quietly overrule your plan at exactly the wrong moments. Managing yourself is the strategy behind every other strategy.",
        fr: "Tu peux connaître toutes les figures et perdre quand même, parce que le marché est une machine émotionnelle et que tu y es branché. Peur, avidité et ego contournent en douce ton plan aux pires moments. Te gérer toi-même, c'est la stratégie derrière toutes les autres.",
      },
    },
    {
      type: "h",
      text: { en: "The classic traps", fr: "Les pièges classiques" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Revenge trading** — you take a loss, get angry, and immediately jump into a bigger, unplanned trade to \"win it back.\" This is how small losses become disasters.",
          fr: "**Revenge trading** — tu prends une perte, tu t'énerves, et tu sautes aussitôt dans un trade plus gros et non planifié pour « te refaire ». C'est ainsi que les petites pertes deviennent des désastres.",
        },
        {
          en: "**FOMO** — chasing a candle that already ran because you can't stand missing out, buying exactly where you should be taking profit.",
          fr: "**FOMO** — courir après une bougie déjà partie parce que tu ne supportes pas de rater, en achetant précisément là où tu devrais prendre des profits.",
        },
        {
          en: "**Moving your stop** — widening a stop-loss as price approaches it, turning a planned small loss into an unplanned big one.",
          fr: "**Décaler son stop** — élargir un stop-loss quand le prix s'en approche, transformant une petite perte planifiée en grosse perte non planifiée.",
        },
        {
          en: "**Overtrading** — confusing activity with progress, taking trades out of boredom rather than edge.",
          fr: "**Overtrading** — confondre activité et progrès, prendre des trades par ennui plutôt que par edge.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Build a process, not a mood", fr: "Construis un process, pas une humeur" },
    },
    {
      type: "p",
      text: {
        en: "The antidote to emotion is a written plan you follow mechanically: entry reason, stop, target, size — decided before you click. Keep a simple journal of every trade and *why* you took it. Over weeks, patterns in your own behaviour become as readable as patterns on the chart.",
        fr: "L'antidote à l'émotion, c'est un plan écrit que tu suis mécaniquement : raison d'entrée, stop, cible, taille — décidés avant de cliquer. Tiens un journal simple de chaque trade et du *pourquoi*. En quelques semaines, les schémas de ton propre comportement deviennent aussi lisibles que ceux du graphique.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Why paper trading builds real skill", fr: "Pourquoi le paper trading forge une vraie compétence" },
      text: {
        en: "Tide competitions give you real stakes — rank, pride, a leaderboard full of rivals — without the account-blowing fear that makes beginners panic. That's the ideal lab for emotional discipline: pressure to perform, but room to make mistakes. Bring the habits you build here to Live, not the other way around.",
        fr: "Les compétitions Tide te donnent de vrais enjeux — classement, fierté, un leaderboard plein de rivaux — sans la peur de faire sauter son compte qui fait paniquer les débutants. C'est le labo idéal pour la discipline émotionnelle : la pression de performer, mais le droit à l'erreur. Emporte vers le Live les habitudes que tu bâtis ici, pas l'inverse.",
      },
    },
    {
      type: "quote",
      text: {
        en: "The goal of a successful trader is to make the best trades. Money is secondary.",
        fr: "Le but d'un trader qui réussit, c'est de faire les meilleurs trades. L'argent est secondaire.",
      },
    },
  ],
  related: ["risk-management-101", "take-profit-stop-loss", "winning-competitions"],
};
