import type { RawArticle } from "../types";

/* Strategies — breakout, cassure de range, confirmation par le volume. */
export const breakoutTrading: RawArticle = {
  slug: "breakout-trading",
  category: "strategies",
  difficulty: "advanced",
  minutes: 6,
  icon: "🚀",
  title: {
    en: "Breakout trading: catching the move",
    fr: "Breakout : attraper le mouvement",
  },
  dek: {
    en: "When price finally escapes its range, the move can be violent. Breakout traders position for the explosion.",
    fr: "Quand le prix s'échappe enfin de son range, le mouvement peut être violent. Le trader de breakout se positionne pour l'explosion.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "A **breakout** is the moment price pushes decisively through a level it kept respecting — the top of a range, a long-standing resistance, a chart pattern's edge. Energy that was coiling sideways suddenly releases in one direction, and a big move can follow.",
        fr: "Un **breakout** (cassure), c'est le moment où le prix franchit franchement un niveau qu'il respectait — le haut d'un range, une résistance ancienne, le bord d'une figure. L'énergie qui s'enroulait latéralement se libère d'un coup dans une direction, et un gros mouvement peut suivre.",
      },
    },
    {
      type: "h",
      text: { en: "The whole game is confirmation", fr: "Tout le jeu, c'est la confirmation" },
    },
    {
      type: "p",
      text: {
        en: "The hard part is that most breakouts are **fakeouts** — price pokes through, traps the eager traders, then snaps back. Confirmation is how you separate the real ones:",
        fr: "Le plus dur, c'est que la plupart des breakouts sont des **faux signaux** — le prix dépasse, piège les traders trop pressés, puis revient. La confirmation, c'est ce qui sépare les vrais :",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Volume** — a genuine breakout usually comes on a surge of volume. A breakout on thin volume is suspect.",
          fr: "**Volume** — un vrai breakout arrive en général sur une poussée de volume. Une cassure sur volume famélique est suspecte.",
        },
        {
          en: "**Close beyond the level** — wait for a candle to *close* past resistance, not just wick through it intrabar.",
          fr: "**Clôture au-delà du niveau** — attends qu'une bougie *clôture* au-delà de la résistance, pas juste une mèche qui la traverse.",
        },
        {
          en: "**Retest** — often price breaks out, comes back to kiss the old level (now support), and launches. Entering on the retest gives a tighter stop.",
          fr: "**Retest** — souvent le prix casse, revient embrasser l'ancien niveau (devenu support), puis décolle. Entrer sur le retest offre un stop plus serré.",
        },
      ],
    },
    {
      type: "example",
      title: { en: "A confirmed breakout trade", fr: "Un trade de breakout confirmé" },
      rows: [
        { k: { en: "Resistance", fr: "Résistance" }, v: { en: "$1.20 (tested 3×)", fr: "1,20 $ (testée 3×)" } },
        { k: { en: "Signal", fr: "Signal" }, v: { en: "1H close at $1.24, high volume", fr: "Clôture 1H à 1,24 $, fort volume" } },
        { k: { en: "Entry", fr: "Entrée" }, v: { en: "Retest of $1.20", fr: "Retest de 1,20 $" } },
        { k: { en: "Stop", fr: "Stop" }, v: { en: "$1.17 (below old level)", fr: "1,17 $ (sous l'ancien niveau)" } },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Fakeouts are free to learn on Tide", fr: "Les faux signaux s'apprennent gratis sur Tide" },
      text: {
        en: "Getting faked out is part of every breakout trader's education — it's just expensive with real money. On the Paper terminal you can take a hundred breakout attempts, journal which ones held and why, and build the pattern recognition without the tuition.",
        fr: "Se faire piéger fait partie de l'éducation de tout trader de breakout — c'est juste cher avec de l'argent réel. Sur le terminal Paper tu peux tenter cent cassures, noter lesquelles ont tenu et pourquoi, et construire la reconnaissance de figures sans payer les frais de scolarité.",
      },
    },
  ],
  related: ["mean-reversion-ranges", "trend-following", "reading-a-chart"],
};
