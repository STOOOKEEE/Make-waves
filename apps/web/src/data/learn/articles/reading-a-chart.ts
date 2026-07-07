import type { RawArticle } from "../types";

/* Basics — lire un graphique de prix : bougies, timeframes, volume, patterns.
 * Même profondeur/format que le gold standard what-is-trading. Ton « tu ». */
export const readingAChart: RawArticle = {
  slug: "reading-a-chart",
  category: "basics",
  difficulty: "beginner",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "reading a price chart",
    "candlestick chart",
    "how to read candles",
    "timeframes trading",
    "trading volume",
    "support and resistance",
    "crypto chart basics",
    "candlestick patterns",
  ],
  title: {
    en: "Reading a price chart",
    fr: "Lire un graphique de prix",
  },
  seoTitle: {
    en: "Reading a Price Chart: Candlesticks, Timeframes & Volume",
    fr: "Lire un graphique de prix : bougies, timeframes et volume",
  },
  seoDescription: {
    en: "Learn to read a price chart the trader's way: candlesticks, timeframes, volume, support and resistance. Practice on live crypto markets risk-free on Tide.",
    fr: "Apprends à lire un graphique de prix comme un trader : bougies, timeframes, volume, supports et résistances. Entraîne-toi sur des marchés crypto live sans risque sur Tide.",
  },
  dek: {
    en: "Candles, timeframes, volume. Learn to read the market's handwriting before you place a single order.",
    fr: "Bougies, unités de temps, volume. Apprends à lire l'écriture du marché avant de passer le moindre ordre.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Reading a price chart is the first real skill a trader builds — before strategy, before indicators, before anything. A chart is the market's story told in pictures: every push, every panic, every hesitation is drawn on the screen. On Tide, each of the top 250 crypto markets shows a **candlestick chart** on live data, because it packs four numbers into a single shape. Once you can read one candle, you can read a thousand — and this guide takes you from a blank chart to spotting the levels that actually matter.",
        fr: "Lire un graphique de prix, c'est la première vraie compétence d'un trader — avant la stratégie, avant les indicateurs, avant tout le reste. Un graphique, c'est l'histoire du marché racontée en images : chaque poussée, chaque panique, chaque hésitation est dessinée à l'écran. Sur Tide, chacun des 250 plus gros marchés crypto s'affiche en **bougies japonaises** sur des données live, parce qu'une bougie condense quatre chiffres dans une seule forme. Sais lire une bougie, et tu sais en lire mille — et ce guide te fait passer du graphique vierge au repérage des niveaux qui comptent vraiment.",
      },
    },
    {
      type: "h",
      text: { en: "Why candlesticks beat a line", fr: "Pourquoi les bougies battent une ligne" },
    },
    {
      type: "p",
      text: {
        en: "A simple line chart only shows the closing price — it tells you where the market ended each slice, but nothing about the fight to get there. A candlestick chart shows the **whole battle** inside every slice: where it opened, where it closed, and how far it stretched in both directions. That extra information is where the edge hides. A flat close can hide a violent day, and candles let you see it.",
        fr: "Un simple graphique en ligne ne montre que le prix de clôture — il te dit où le marché a fini chaque tranche, mais rien du combat pour y arriver. Une bougie montre **toute la bataille** dans chaque tranche : où ça a ouvert, où ça a clôturé, et jusqu'où ça s'est étiré dans les deux sens. C'est dans cette info en plus que se cache l'edge. Une clôture plate peut masquer une journée violente, et les bougies te la révèlent.",
      },
    },
    {
      type: "h",
      text: { en: "Anatomy of a candle", fr: "Anatomie d'une bougie" },
    },
    {
      type: "p",
      text: {
        en: "Each candle covers one slice of time (one minute, one hour, one day…). It records four prices for that slice, often called **OHLC**:",
        fr: "Chaque bougie couvre une tranche de temps (une minute, une heure, un jour…). Elle enregistre quatre prix pour cette tranche, qu'on appelle souvent **OHLC** :",
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
        en: "The fat part is the **body** (open-to-close). The thin lines are the **wicks** (the rejected extremes). A long wick means price tried to go there and got pushed back — often a clue about who's winning the tug-of-war. A big body with almost no wick means one side dominated the whole slice.",
        fr: "La partie épaisse, c'est le **corps** (ouverture-clôture). Les traits fins, ce sont les **mèches** (les extrêmes rejetés). Une longue mèche signifie que le prix a tenté d'y aller et s'est fait repousser — souvent un indice sur qui gagne le bras de fer. Un gros corps quasi sans mèche veut dire qu'un camp a dominé toute la tranche.",
      },
    },
    {
      type: "example",
      title: { en: "One green hourly candle, decoded", fr: "Une bougie verte 1H, décodée" },
      rows: [
        { k: { en: "Open", fr: "Ouverture" }, v: { en: "$2.40", fr: "2,40 $" } },
        { k: { en: "High", fr: "Haut" }, v: { en: "$2.58", fr: "2,58 $" } },
        { k: { en: "Low", fr: "Bas" }, v: { en: "$2.37", fr: "2,37 $" } },
        { k: { en: "Close", fr: "Clôture" }, v: { en: "$2.55", fr: "2,55 $" } },
        { k: { en: "Read", fr: "Lecture" }, v: { en: "Green body, tiny top wick → buyers in control", fr: "Corps vert, mèche haute minuscule → acheteurs aux commandes" } },
      ],
    },
    {
      type: "h",
      text: { en: "Timeframes change everything", fr: "L'unité de temps change tout" },
    },
    {
      type: "p",
      text: {
        en: "The same market looks calm on a daily chart and chaotic on a 1-minute chart. On Tide you can switch timeframes (`5m`, `15m`, `1H`, `4H`, `1D`). Zoom out to see the big trend; zoom in to time your entry. A common mistake is picking a timeframe that doesn't match your plan — reading a day trade on a monthly chart is noise, and scalping off a daily candle is guesswork.",
        fr: "Le même marché paraît calme en journalier et chaotique en 1 minute. Sur Tide tu changes l'unité de temps (`5m`, `15m`, `1H`, `4H`, `1D`). Dézoome pour voir la grande tendance ; zoome pour affiner ton entrée. Erreur classique : choisir une unité qui ne colle pas à ton plan — lire un trade du jour sur un graphique mensuel, c'est du bruit, et scalper sur une bougie journalière, c'est deviner.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Higher timeframes** (`4H`, `1D`) — the trend and the levels that hold. This is your map.",
          fr: "**Grandes unités** (`4H`, `1D`) — la tendance et les niveaux qui tiennent. C'est ta carte.",
        },
        {
          en: "**Lower timeframes** (`5m`, `15m`) — the timing of your entry and exit. This is your zoom.",
          fr: "**Petites unités** (`5m`, `15m`) — le timing de ton entrée et ta sortie. C'est ton zoom.",
        },
        {
          en: "**The trap** — flipping timeframes until one agrees with the trade you already want. Decide the plan first.",
          fr: "**Le piège** — changer d'unité jusqu'à en trouver une qui valide le trade que tu veux déjà. Décide le plan d'abord.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Volume: the fuel gauge", fr: "Le volume : la jauge de carburant" },
    },
    {
      type: "p",
      text: {
        en: "Volume is how much was traded in each slice. A price move on **high volume** carries conviction; the same move on thin volume is fragile and often reverses. Think of volume as the fuel behind a move — no fuel, no follow-through. A breakout on huge volume is real intent; a breakout on nothing is usually a trap waiting to snap back.",
        fr: "Le volume, c'est la quantité échangée dans chaque tranche. Un mouvement de prix sur **fort volume** porte de la conviction ; le même mouvement sur volume famélique est fragile et se retourne souvent. Vois le volume comme le carburant derrière un mouvement — pas de carburant, pas de suite. Une cassure sur gros volume, c'est de l'intention réelle ; une cassure sur rien, c'est souvent un piège qui va se refermer.",
      },
    },
    {
      type: "h",
      text: { en: "Support, resistance and trend", fr: "Support, résistance et tendance" },
    },
    {
      type: "p",
      text: {
        en: "Beyond single candles, the chart draws **levels**. A **support** is a price floor where buyers keep stepping in; a **resistance** is a ceiling where sellers keep pushing back. Connect the higher lows of an uptrend or the lower highs of a downtrend and you've drawn the **trend** itself. These lines aren't magic — they're just memory of where the crowd reacted before, and the crowd tends to react there again.",
        fr: "Au-delà des bougies isolées, le graphique dessine des **niveaux**. Un **support**, c'est un plancher de prix où les acheteurs reviennent ; une **résistance**, un plafond où les vendeurs repoussent. Relie les creux ascendants d'une hausse ou les sommets descendants d'une baisse et tu as tracé la **tendance** elle-même. Ces lignes n'ont rien de magique — ce sont juste la mémoire de là où la foule a réagi avant, et la foule a tendance à y réagir encore.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Uptrend** — a stack of higher highs and higher lows. Buyers keep paying up.",
          fr: "**Tendance haussière** — une pile de sommets et de creux de plus en plus hauts. Les acheteurs paient toujours plus.",
        },
        {
          en: "**Downtrend** — lower highs and lower lows. Sellers keep accepting less.",
          fr: "**Tendance baissière** — sommets et creux de plus en plus bas. Les vendeurs acceptent toujours moins.",
        },
        {
          en: "**Range** — price bounces between a support and a resistance, going nowhere. Trade the edges, not the middle.",
          fr: "**Range** — le prix rebondit entre un support et une résistance, sans direction. Trade les bords, pas le milieu.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "A few candle shapes worth knowing", fr: "Quelques formes de bougies à connaître" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Doji** — open and close almost equal, tiny body. Indecision; the market is holding its breath.",
          fr: "**Doji** — ouverture et clôture quasi égales, corps minuscule. Indécision ; le marché retient son souffle.",
        },
        {
          en: "**Hammer** — small body up top, long lower wick. Sellers tried to push down and failed — a possible bottom.",
          fr: "**Marteau** — petit corps en haut, longue mèche basse. Les vendeurs ont poussé vers le bas et échoué — un bas possible.",
        },
        {
          en: "**Engulfing** — a big candle that fully swallows the previous one. Momentum just flipped hands.",
          fr: "**Engloutissante** — une grosse bougie qui avale entièrement la précédente. Le momentum vient de changer de camp.",
        },
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Patterns are hints, not promises", fr: "Les patterns sont des indices, pas des promesses" },
      text: {
        en: "No candle shape guarantees anything. A hammer at a strong support with rising volume is a real signal; the same hammer floating in the middle of nowhere is just a shape. Always read a candle **in context** — level, trend and volume together — never on its own.",
        fr: "Aucune forme de bougie ne garantit quoi que ce soit. Un marteau sur un support fort avec volume en hausse, c'est un vrai signal ; le même marteau flottant au milieu de nulle part, c'est juste une forme. Lis toujours une bougie **dans son contexte** — niveau, tendance et volume ensemble — jamais toute seule.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "Charts on Tide run on live data across the top 250 crypto markets, so what you read is real. Any perp position you take is **simulated in Paper** — no real leverage, no borrowed money — with a 100x cap and isolated margin, and realized PnL floored at your margin only when you close. Your **TP/SL are client-side triggers**: the browser tab has to stay open for them to fire, and there's no server-side auto-liquidation. Reading the chart well is how you set those levels somewhere they can actually defend you.",
        fr: "Les graphiques de Tide tournent sur des données live pour les 250 plus gros marchés crypto — ce que tu lis est réel. Toute position perp que tu prends est **simulée en Paper** — pas de vrai levier, pas d'argent emprunté — avec un plafond de 100x et une marge isolée, et un PnL réalisé plafonné à ta marge seulement à la fermeture. Tes **TP/SL sont des déclencheurs côté client** : l'onglet du navigateur doit rester ouvert pour qu'ils se déclenchent, et il n'y a pas d'auto-liquidation serveur. Bien lire le graphique, c'est ce qui te permet de poser ces niveaux là où ils peuvent vraiment te protéger.",
      },
    },
    {
      type: "h",
      text: { en: "Do this on Tide", fr: "À faire sur Tide" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Open any market on the terminal and flip between `1H` and `1D`. Notice how the story changes with the zoom.",
          fr: "Ouvre un marché sur le terminal et bascule entre `1H` et `1D`. Remarque comme l'histoire change avec le zoom.",
        },
        {
          en: "Name each recent candle out loud — green or red, long body or long wick, high or low volume.",
          fr: "Nomme chaque bougie récente à voix haute — verte ou rouge, grand corps ou longue mèche, volume fort ou faible.",
        },
        {
          en: "Draw one support and one resistance you can see, then place a small Paper trade that respects them.",
          fr: "Trace un support et une résistance que tu vois, puis place un petit trade Paper qui les respecte.",
        },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Five minutes a day", fr: "Cinq minutes par jour" },
      text: {
        en: "You don't build a trader's eye by reading about candles — you build it by watching them. Five minutes a day naming candles and levels on Tide sharpens your read faster than any indicator you could bolt on top. The chart is a language; fluency comes from reps.",
        fr: "Tu ne développes pas un œil de trader en lisant sur les bougies — tu le développes en les regardant. Cinq minutes par jour à nommer bougies et niveaux sur Tide affûtent ta lecture plus vite que n'importe quel indicateur que tu pourrais empiler par-dessus. Le graphique est une langue ; la fluidité vient des répétitions.",
      },
    },
    {
      type: "quote",
      text: {
        en: "The chart doesn't predict the future. It shows you where the crowd already committed — so you can act before they do it again.",
        fr: "Le graphique ne prédit pas l'avenir. Il te montre où la foule s'est déjà engagée — pour que tu agisses avant qu'elle ne recommence.",
      },
    },
  ],
  related: ["what-is-trading", "order-book-spread", "trend-following"],
};
