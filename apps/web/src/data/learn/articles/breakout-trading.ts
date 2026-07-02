import type { RawArticle } from "../types";

/* Strategies — breakout, cassure de range, confirmation par le volume.
 * Étendue au format GOLD STANDARD (what-is-trading) : ~20+ blocs, sections H2
 * riches, exemples chiffrés, SEO complet, caveats Tide (perp simulé, TP/SL
 * client-side, floor -marge, fees, Live spot-only). Ton « tu », adrénaline. */
export const breakoutTrading: RawArticle = {
  slug: "breakout-trading",
  category: "strategies",
  difficulty: "advanced",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "breakout trading",
    "breakout strategy",
    "trading breakouts",
    "fakeout",
    "range breakout",
    "volume confirmation",
    "support resistance",
    "crypto breakout",
  ],
  title: {
    en: "Breakout trading: catching the move",
    fr: "Breakout : attraper le mouvement",
  },
  seoTitle: {
    en: "Breakout Trading: How to Trade Breakouts (and Dodge Fakeouts)",
    fr: "Breakout trading : trader les cassures (et éviter les faux signaux)",
  },
  seoDescription: {
    en: "Breakout trading explained: how to spot a real breakout, confirm it with volume and retests, filter fakeouts, size risk, and practice it risk-free on Tide.",
    fr: "Le breakout trading expliqué : repérer une vraie cassure, la confirmer par le volume et le retest, filtrer les faux signaux, gérer le risque, et t'entraîner sans risque sur Tide.",
  },
  dek: {
    en: "When price finally escapes its range, the move can be violent. Breakout traders position for the explosion — and learn to survive the traps.",
    fr: "Quand le prix s'échappe enfin de son range, le mouvement peut être violent. Le trader de breakout se positionne pour l'explosion — et apprend à survivre aux pièges.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "**Breakout trading** is one of the most seductive strategies in the book: you wait for price to punch through a level it kept respecting, then ride the explosion that follows. A breakout is that exact moment — price pushes decisively past the top of a range, a long-standing resistance, or the edge of a chart pattern. Energy that was coiling sideways suddenly releases in one direction, and a big move can follow. This guide shows you how to trade breakouts without becoming the liquidity that fuels everyone else's move.",
        fr: "Le **breakout trading** est l'une des stratégies les plus séduisantes du manuel : tu attends que le prix perce un niveau qu'il respectait, puis tu surfes l'explosion qui suit. Un breakout (cassure), c'est ce moment précis — le prix franchit franchement le haut d'un range, une résistance ancienne, ou le bord d'une figure. L'énergie qui s'enroulait latéralement se libère d'un coup dans une direction, et un gros mouvement peut suivre. Ce guide te montre comment trader les cassures sans devenir la liquidité qui alimente le mouvement des autres.",
      },
    },
    {
      type: "h",
      text: { en: "What actually is a breakout?", fr: "C'est quoi vraiment un breakout ?" },
    },
    {
      type: "p",
      text: {
        en: "Price rarely moves in a straight line. Most of the time it **consolidates** — it bounces between a floor (support) and a ceiling (resistance), building a range. Buyers keep stepping in at the floor, sellers keep hitting the ceiling, and the market coils. A breakout happens when one side finally wins: demand overwhelms the ceiling, or supply crushes the floor, and price escapes the box it was trapped in.",
        fr: "Le prix bouge rarement en ligne droite. La plupart du temps il **consolide** — il rebondit entre un plancher (support) et un plafond (résistance), en construisant un range. Les acheteurs reviennent au plancher, les vendeurs frappent au plafond, et le marché s'enroule. Un breakout survient quand un camp finit par gagner : la demande écrase le plafond, ou l'offre broie le plancher, et le prix s'échappe de la boîte où il était piégé.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Range top / resistance** — a price ceiling that's been rejected several times. A break above it is a bullish breakout.",
          fr: "**Haut de range / résistance** — un plafond de prix rejeté plusieurs fois. Une cassure au-dessus est un breakout haussier.",
        },
        {
          en: "**Range bottom / support** — a floor that keeps holding. A break below it is a bearish breakdown.",
          fr: "**Bas de range / support** — un plancher qui tient. Une cassure en dessous est un breakdown baissier.",
        },
        {
          en: "**Pattern edges** — triangles, flags, wedges. The tighter the coil, the more explosive the release tends to be.",
          fr: "**Bords de figures** — triangles, drapeaux, biseaux. Plus le ressort est comprimé, plus la détente tend à être explosive.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "The whole game is confirmation", fr: "Tout le jeu, c'est la confirmation" },
    },
    {
      type: "p",
      text: {
        en: "Here's the brutal truth: most breakouts are **fakeouts**. Price pokes through the level, triggers the stops and the eager breakout buyers, then snaps right back into the range — leaving latecomers trapped at the worst price. The whole discipline of breakout trading is filtering the real moves from the traps. Confirmation is how you do it.",
        fr: "La vérité brutale : la plupart des breakouts sont des **faux signaux**. Le prix dépasse le niveau, déclenche les stops et les acheteurs trop pressés, puis revient sec dans le range — laissant les retardataires piégés au pire prix. Toute la discipline du breakout trading, c'est filtrer les vrais mouvements des pièges. La confirmation, c'est comme ça que tu le fais.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Volume** — a genuine breakout usually comes on a surge of volume. A breakout on thin volume is suspect: nobody committed to the move.",
          fr: "**Volume** — un vrai breakout arrive en général sur une poussée de volume. Une cassure sur volume famélique est suspecte : personne ne s'est engagé sur le mouvement.",
        },
        {
          en: "**Close beyond the level** — wait for a candle to *close* past the level, not just wick through it intrabar. A wick is a probe; a close is a decision.",
          fr: "**Clôture au-delà du niveau** — attends qu'une bougie *clôture* au-delà du niveau, pas juste une mèche qui le traverse en intrabar. Une mèche est un sondage ; une clôture est une décision.",
        },
        {
          en: "**Retest** — often price breaks out, comes back to kiss the old level (resistance now flipped to support), and only then launches. Entering on the retest gives a tighter stop and better risk/reward.",
          fr: "**Retest** — souvent le prix casse, revient embrasser l'ancien niveau (la résistance devenue support), et décolle seulement ensuite. Entrer sur le retest offre un stop plus serré et un meilleur risque/rendement.",
        },
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Breakout vs breakdown", fr: "Breakout vs breakdown" },
      text: {
        en: "The same mechanics work in both directions. A **breakout** through resistance is a signal to go **long**; a **breakdown** through support is a signal to go **short**. The confirmation rules — volume, close, retest — are identical. Don't be a permabull: some of the cleanest moves are to the downside.",
        fr: "La mécanique fonctionne dans les deux sens. Une **cassure** de résistance est un signal pour passer **long** ; un **breakdown** de support est un signal pour passer **short**. Les règles de confirmation — volume, clôture, retest — sont identiques. Ne sois pas permabull : certains des mouvements les plus propres sont à la baisse.",
      },
    },
    {
      type: "h",
      text: { en: "A confirmed breakout, step by step", fr: "Une cassure confirmée, pas à pas" },
    },
    {
      type: "example",
      title: { en: "A confirmed breakout trade", fr: "Un trade de breakout confirmé" },
      rows: [
        { k: { en: "Resistance", fr: "Résistance" }, v: { en: "$1.20 (tested 3×)", fr: "1,20 $ (testée 3×)" } },
        { k: { en: "Signal", fr: "Signal" }, v: { en: "1H close at $1.24, high volume", fr: "Clôture 1H à 1,24 $, fort volume" } },
        { k: { en: "Entry (retest)", fr: "Entrée (retest)" }, v: { en: "$1.205", fr: "1,205 $" } },
        { k: { en: "Stop", fr: "Stop" }, v: { en: "$1.17 (below old level)", fr: "1,17 $ (sous l'ancien niveau)" } },
        { k: { en: "Target", fr: "Objectif" }, v: { en: "$1.31 (range height projected)", fr: "1,31 $ (hauteur du range projetée)" } },
        { k: { en: "Risk / reward", fr: "Risque / rendement" }, v: { en: "≈ 1 : 3", fr: "≈ 1 : 3" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "Notice the math: you risk $0.035 to make $0.105 — a **1:3 risk/reward**. With that ratio you can be wrong on two breakouts out of three and still come out ahead. That's the real edge of breakout trading: it's not about a high win rate, it's about small, defined losses on the fakeouts and outsized wins on the runners.",
        fr: "Regarde le calcul : tu risques 0,035 $ pour en gagner 0,105 $ — un **risque/rendement de 1:3**. Avec ce ratio, tu peux te tromper sur deux breakouts sur trois et rester gagnant. C'est ça le vrai edge du breakout trading : pas un taux de réussite élevé, mais des pertes petites et définies sur les faux signaux, et des gains démesurés sur les mouvements qui courent.",
      },
    },
    {
      type: "h",
      text: { en: "Sizing the trade and placing the stop", fr: "Dimensionner le trade et placer le stop" },
    },
    {
      type: "p",
      text: {
        en: "A breakout without a stop is just gambling with extra steps. The stop belongs on the *other side* of the level you broke — if $1.20 is now real support, a clean re-entry below it means your idea was wrong, so cut it. Then size the position so that hitting the stop costs a fixed, survivable fraction of your capital (many traders cap it at ~1–2% per trade). Let the stop distance drive the position size, never the other way around.",
        fr: "Un breakout sans stop, c'est juste du pari avec des étapes en plus. Le stop se place de l'*autre côté* du niveau que tu as cassé — si 1,20 $ est désormais un vrai support, un retour propre en dessous signifie que ton idée est fausse, donc coupe. Ensuite dimensionne la position pour que toucher le stop coûte une fraction fixe et survivable de ton capital (beaucoup plafonnent à ~1–2 % par trade). Laisse la distance au stop dicter la taille, jamais l'inverse.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Stop location** — just beyond the broken level, in the zone that invalidates your idea.",
          fr: "**Emplacement du stop** — juste au-delà du niveau cassé, dans la zone qui invalide ton idée.",
        },
        {
          en: "**Take-profit** — project the range height from the breakout point, or trail behind the move to let winners run.",
          fr: "**Take-profit** — projette la hauteur du range depuis le point de cassure, ou suis le mouvement pour laisser courir les gagnants.",
        },
        {
          en: "**Position size** — fixed risk per trade divided by the stop distance. Same risk on every trade, whatever the level.",
          fr: "**Taille de position** — risque fixe par trade divisé par la distance au stop. Même risque sur chaque trade, quel que soit le niveau.",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "You can trade breakouts on Tide in **Paper** with simulated perps — long *or* short, up to **100x** isolated leverage — but that leverage is a simulation, with no borrowed money and no real liquidations. Your **TP/SL are client-side triggers**: they only fire while the browser tab stays open, so a closed tab means an unmanaged position. There's **no server-side auto-liquidation** — realized PnL is simply floored at **−margin** when you close. Fees at open are **0.02% maker / 0.06% taker**. **Live mode is spot only** (real XRP↔RLUSD swaps, non-custodial), never leverage.",
        fr: "Tu peux trader les breakouts sur Tide en **Paper** avec des perps simulés — long *ou* short, jusqu'à **100x** en marge isolée — mais ce levier est une simulation, sans argent emprunté ni vraie liquidation. Tes **TP/SL sont des déclencheurs côté client** : ils ne se déclenchent que si l'onglet du navigateur reste ouvert, donc un onglet fermé = position non gérée. **Pas de liquidation auto côté serveur** — le PnL réalisé est simplement plafonné à **−marge** à la fermeture. Les frais à l'ouverture sont de **0,02 % maker / 0,06 % taker**. Le **mode Live est spot uniquement** (vrais swaps XRP↔RLUSD, non-custodial), jamais du levier.",
      },
    },
    {
      type: "h",
      text: { en: "Why fakeouts happen", fr: "Pourquoi les faux signaux existent" },
    },
    {
      type: "p",
      text: {
        en: "Fakeouts aren't random — they're often engineered. Everyone can see the same obvious level, so everyone stacks their stop-loss orders just beyond it. That cluster of stops is a pool of liquidity, and larger players love to push price into it to fill their own orders before the real move begins. Understanding this makes you patient: the first poke through a level is frequently a **liquidity grab**, not a breakout.",
        fr: "Les faux signaux ne sont pas aléatoires — ils sont souvent fabriqués. Tout le monde voit le même niveau évident, donc tout le monde empile ses stops juste au-delà. Ce paquet de stops est une réserve de liquidité, et les gros acteurs adorent y pousser le prix pour remplir leurs propres ordres avant que le vrai mouvement commence. Comprendre ça te rend patient : le premier dépassement d'un niveau est souvent une **prise de liquidité**, pas un breakout.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Chasing the wick** — buying the instant price pokes through, before any close confirms it.",
          fr: "**Courir après la mèche** — acheter à l'instant où le prix dépasse, avant qu'une clôture ne confirme.",
        },
        {
          en: "**Ignoring volume** — a break on dead volume has no fuel to sustain the move.",
          fr: "**Ignorer le volume** — une cassure sur volume mort n'a aucun carburant pour tenir.",
        },
        {
          en: "**No stop** — turning a small fakeout loss into a big one by hoping it comes back.",
          fr: "**Pas de stop** — transformer une petite perte de fakeout en grosse perte en espérant que ça revienne.",
        },
        {
          en: "**Breaking into resistance** — going long right under a much bigger level overhead leaves no room to run.",
          fr: "**Casser dans une résistance** — passer long juste sous un niveau bien plus gros au-dessus ne laisse aucune marge pour courir.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Practice this on Tide", fr: "Entraîne-toi sur Tide" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Find a market that's been ranging on the top 250, and mark the ceiling and floor on the chart.",
          fr: "Trouve un marché qui range dans le top 250, et marque le plafond et le plancher sur le graphique.",
        },
        {
          en: "Wait for a candle to *close* beyond the level on rising volume — don't chase the wick.",
          fr: "Attends qu'une bougie *clôture* au-delà du niveau sur volume croissant — ne cours pas après la mèche.",
        },
        {
          en: "Enter on the retest, set your stop just inside the old range and your take-profit at the projected target.",
          fr: "Entre sur le retest, place ton stop juste dans l'ancien range et ton take-profit sur l'objectif projeté.",
        },
        {
          en: "Journal every attempt — held or faked, and why — until the pattern recognition becomes a reflex.",
          fr: "Journalise chaque tentative — tenue ou piégée, et pourquoi — jusqu'à ce que la reconnaissance de figure devienne un réflexe.",
        },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Fakeouts are free to learn on Tide", fr: "Les faux signaux s'apprennent gratis sur Tide" },
      text: {
        en: "Getting faked out is part of every breakout trader's education — it's just expensive with real money. With virtual capital on the Paper terminal you can take a hundred breakout attempts, log which ones held and why, and build the pattern recognition without paying the tuition in real losses.",
        fr: "Se faire piéger fait partie de l'éducation de tout trader de breakout — c'est juste cher avec de l'argent réel. Avec un capital virtuel sur le terminal Paper, tu peux tenter cent cassures, noter lesquelles ont tenu et pourquoi, et construire la reconnaissance de figures sans payer les frais de scolarité en pertes réelles.",
      },
    },
    {
      type: "quote",
      text: {
        en: "Amateurs chase the wick. Pros wait for the close, the retest, and the volume — then let the fakeouts pay for the winners.",
        fr: "Les amateurs courent après la mèche. Les pros attendent la clôture, le retest et le volume — puis laissent les faux signaux payer les gagnants.",
      },
    },
  ],
  related: ["mean-reversion-ranges", "trend-following", "reading-a-chart"],
};
