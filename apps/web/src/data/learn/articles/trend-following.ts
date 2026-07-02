import type { RawArticle } from "../types";

/* Strategies — suivre la tendance, moyennes mobiles, higher highs. */
export const trendFollowing: RawArticle = {
  slug: "trend-following",
  category: "strategies",
  difficulty: "intermediate",
  minutes: 7,
  title: {
    en: "Trend following: ride the wave",
    fr: "Suivre la tendance : surfe la vague",
  },
  dek: {
    en: "The oldest edge in trading: don't fight the current, join it. Spot the direction and let winners run.",
    fr: "Le plus vieil edge du trading : ne combats pas le courant, rejoins-le. Repère la direction et laisse courir les gagnants.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Trend following bets that a market in motion tends to stay in motion. Instead of guessing tops and bottoms, you identify the prevailing direction and trade *with* it until it clearly ends. It's not glamorous, but it's how a huge share of professional money is run.",
        fr: "Le suivi de tendance parie qu'un marché en mouvement tend à le rester. Au lieu de deviner sommets et creux, tu identifies la direction dominante et tu trades *avec* elle jusqu'à ce qu'elle se termine nettement. Pas glamour, mais c'est ainsi qu'une immense part de l'argent pro est gérée.",
      },
    },
    {
      type: "h",
      text: { en: "What a trend looks like", fr: "À quoi ressemble une tendance" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Uptrend** — a staircase of **higher highs and higher lows**. Each dip bottoms above the last.",
          fr: "**Hausse** — un escalier de **sommets plus hauts et creux plus hauts**. Chaque repli touche le fond au-dessus du précédent.",
        },
        {
          en: "**Downtrend** — lower highs and lower lows. Each bounce fails below the last.",
          fr: "**Baisse** — sommets plus bas et creux plus bas. Chaque rebond échoue sous le précédent.",
        },
        {
          en: "**Range** — no staircase, just sideways chop. Trend strategies struggle here (see mean reversion instead).",
          fr: "**Range** — pas d'escalier, juste du plat qui hache. Les stratégies de tendance galèrent ici (vois plutôt le retour à la moyenne).",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Moving averages: the trend's ruler", fr: "Les moyennes mobiles : la règle de la tendance" },
    },
    {
      type: "p",
      text: {
        en: "A **moving average** (MA) smooths price into a single line — the average close over the last N candles. A simple read: price above a rising MA = uptrend; price below a falling MA = downtrend. Many traders watch a fast and a slow MA and act when they cross. It's a lagging tool by design — it confirms rather than predicts.",
        fr: "Une **moyenne mobile** (MA) lisse le prix en une seule ligne — la clôture moyenne sur les N dernières bougies. Lecture simple : prix au-dessus d'une MA qui monte = hausse ; prix sous une MA qui descend = baisse. Beaucoup surveillent une MA rapide et une lente et agissent quand elles se croisent. C'est un outil retardé par nature — il confirme plus qu'il ne prédit.",
      },
    },
    {
      type: "h",
      text: { en: "The hard part: letting winners run", fr: "Le plus dur : laisser courir les gagnants" },
    },
    {
      type: "p",
      text: {
        en: "Trend following makes its money on a few big moves, so cutting winners early kills the edge. The discipline is to hold while the trend structure holds — trailing your stop up under each higher low — and only exit when the structure breaks. Small losses, occasional large wins.",
        fr: "Le suivi de tendance gagne son argent sur quelques gros mouvements ; couper les gagnants trop tôt tue l'edge. La discipline : tenir tant que la structure de tendance tient — en remontant ton stop sous chaque creux plus haut — et ne sortir que quand la structure casse. Petites pertes, gains parfois énormes.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Practice read", fr: "Lecture d'entraînement" },
      text: {
        en: "On Tide, pull up a strong mover on the `4H` chart and mark the higher highs and higher lows by eye. Then drop to `15m` to time an entry on a pullback. Doing this across dozens of paper trades trains you to see structure instantly.",
        fr: "Sur Tide, affiche un actif qui bouge fort en `4H` et repère à l'œil les sommets et creux plus hauts. Puis descends en `15m` pour caler une entrée sur un repli. Répète sur des dizaines de trades paper et tu verras la structure instantanément.",
      },
    },
  ],
  related: ["reading-a-chart", "breakout-trading", "risk-management-101"],
};
