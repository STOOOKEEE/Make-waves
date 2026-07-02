import type { RawArticle } from "../types";

/* Basics — lire une bougie, timeframes, volume. */
export const readingAChart: RawArticle = {
  slug: "reading-a-chart",
  category: "basics",
  difficulty: "beginner",
  minutes: 7,
  icon: "📊",
  title: {
    en: "Reading a price chart",
    fr: "Lire un graphique de prix",
  },
  dek: {
    en: "Candles, timeframes, volume. Learn to read the market's handwriting before you place a single order.",
    fr: "Bougies, unités de temps, volume. Apprends à lire l'écriture du marché avant de passer le moindre ordre.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "A chart is the market's story told in pictures. On Tide, every asset shows a **candlestick chart** — the trader's default view — because it packs four numbers into a single shape. Once you can read one candle, you can read a thousand.",
        fr: "Un graphique, c'est l'histoire du marché racontée en images. Sur Tide, chaque actif s'affiche en **bougies japonaises** — la vue par défaut du trader — parce qu'une bougie condense quatre chiffres dans une seule forme. Sais lire une bougie, et tu sais en lire mille.",
      },
    },
    {
      type: "h",
      text: { en: "Anatomy of a candle", fr: "Anatomie d'une bougie" },
    },
    {
      type: "p",
      text: {
        en: "Each candle covers one slice of time (one minute, one hour, one day…). It records four prices for that slice:",
        fr: "Chaque bougie couvre une tranche de temps (une minute, une heure, un jour…). Elle enregistre quatre prix pour cette tranche :",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Open** — the price at the start of the slice.",
          fr: "**Ouverture** — le prix au début de la tranche.",
        },
        {
          en: "**Close** — the price at the end. If close is above open, the candle is green (up); below, it's red (down).",
          fr: "**Clôture** — le prix à la fin. Clôture au-dessus de l'ouverture : bougie verte (hausse) ; en dessous : rouge (baisse).",
        },
        {
          en: "**High** and **Low** — the extremes reached during the slice, shown as thin `wicks` sticking out of the body.",
          fr: "**Haut** et **Bas** — les extrêmes atteints pendant la tranche, dessinés comme de fines `mèches` qui dépassent du corps.",
        },
      ],
    },
    {
      type: "p",
      text: {
        en: "The fat part is the **body** (open-to-close). The thin lines are the **wicks** (the rejected extremes). A long wick means price tried to go there and got pushed back — often a clue about who's winning the tug-of-war.",
        fr: "La partie épaisse, c'est le **corps** (ouverture-clôture). Les traits fins, ce sont les **mèches** (les extrêmes rejetés). Une longue mèche signifie que le prix a tenté d'y aller et s'est fait repousser — souvent un indice sur qui gagne le bras de fer.",
      },
    },
    {
      type: "h",
      text: { en: "Timeframes change everything", fr: "L'unité de temps change tout" },
    },
    {
      type: "p",
      text: {
        en: "The same market looks calm on a daily chart and chaotic on a 1-minute chart. On Tide you can switch timeframes (`5m`, `15m`, `1H`, `4H`, `1D`). Zoom out to see the big trend; zoom in to time your entry. A common mistake is picking a timeframe that doesn't match your plan — a day trade read on a monthly chart is noise.",
        fr: "Le même marché paraît calme en journalier et chaotique en 1 minute. Sur Tide tu changes l'unité de temps (`5m`, `15m`, `1H`, `4H`, `1D`). Dézoome pour voir la grande tendance ; zoome pour affiner ton entrée. Erreur classique : choisir une unité qui ne colle pas à ton plan — lire un trade du jour sur un graphique mensuel, c'est du bruit.",
      },
    },
    {
      type: "h",
      text: { en: "Volume: the fuel gauge", fr: "Le volume : la jauge de carburant" },
    },
    {
      type: "p",
      text: {
        en: "Volume is how much was traded in each slice. A price move on **high volume** carries conviction; the same move on thin volume is fragile and often reverses. Think of volume as the fuel behind a move — no fuel, no follow-through.",
        fr: "Le volume, c'est la quantité échangée dans chaque tranche. Un mouvement de prix sur **fort volume** porte de la conviction ; le même mouvement sur volume famélique est fragile et se retourne souvent. Vois le volume comme le carburant derrière un mouvement — pas de carburant, pas de suite.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Do this on Tide", fr: "À faire sur Tide" },
      text: {
        en: "Open any market on the terminal, flip between `1H` and `1D`, and just watch. Name each candle out loud — green or red, long body or long wick. Five minutes of this a day builds the eye faster than any indicator.",
        fr: "Ouvre un marché sur le terminal, bascule entre `1H` et `1D`, et observe. Nomme chaque bougie à voix haute — verte ou rouge, grand corps ou longue mèche. Cinq minutes par jour et ton œil progresse plus vite qu'avec n'importe quel indicateur.",
      },
    },
  ],
  related: ["what-is-trading", "order-book-spread", "trend-following"],
};
