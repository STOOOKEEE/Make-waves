import type { RawArticle } from "../types";

/* Basics — porte d'entrée du cursus. GOLD STANDARD de profondeur/format pour les
 * autres leçons : ~20+ blocs, sections H2 riches, exemples chiffrés, SEO complet.
 * Concepts : marché, prix, offre/demande, long vs short, spéculation vs
 * investissement, espérance, erreurs du débutant. Ton « tu », honnête. */
export const whatIsTrading: RawArticle = {
  slug: "what-is-trading",
  category: "basics",
  difficulty: "beginner",
  minutes: 8,
  featured: true,
  popular: true,
  updated: "2026-07-02",
  keywords: [
    "what is trading",
    "trading for beginners",
    "how trading works",
    "long vs short",
    "crypto trading basics",
    "paper trading",
  ],
  title: {
    en: "What is trading, really?",
    fr: "C'est quoi le trading, vraiment ?",
  },
  seoTitle: {
    en: "What Is Trading? A Beginner's Guide to How Markets Work",
    fr: "C'est quoi le trading ? Guide débutant du fonctionnement des marchés",
  },
  seoDescription: {
    en: "Trading explained simply for beginners: what a market is, why prices move, long vs short, trading vs investing, and how to practice risk-free on Tide.",
    fr: "Le trading expliqué simplement aux débutants : c'est quoi un marché, pourquoi les prix bougent, long vs short, trading vs investissement, et comment t'entraîner sans risque sur Tide.",
  },
  dek: {
    en: "Before any strategy, one idea: buy something for less than you sell it. Everything else — charts, leverage, order books — is detail built on top.",
    fr: "Avant toute stratégie, une seule idée : acheter moins cher que tu ne revends. Le reste — graphiques, levier, carnets d'ordres — n'est que du détail posé par-dessus.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "If you've ever sold something for more than you paid — a bike, a pair of sneakers, a concert ticket — you've already traded. Financial trading is the same instinct pointed at markets: buy an asset, sell it later at a different price, and keep the difference. This guide strips trading back to that core idea and builds up from there, so the rest of Tide School makes sense.",
        fr: "Si tu as déjà revendu un objet plus cher que tu ne l'avais payé — un vélo, une paire de sneakers, une place de concert — tu as déjà tradé. Le trading financier, c'est le même instinct pointé sur les marchés : acheter un actif, le revendre plus tard à un autre prix, et garder la différence. Ce guide ramène le trading à cette idée de base et construit à partir de là, pour que le reste de Tide School prenne tout son sens.",
      },
    },
    {
      type: "h",
      text: { en: "Trading in one sentence", fr: "Le trading en une phrase" },
    },
    {
      type: "p",
      text: {
        en: "Trading is buying and selling an asset — a crypto, a stock, a currency — to profit from the change in its price. You're not trying to own the thing forever. You're trying to be **right about where its price goes next**, and to size that bet so a wrong call doesn't hurt too much.",
        fr: "Le trading, c'est acheter et vendre un actif — une crypto, une action, une devise — pour profiter de la variation de son prix. Tu ne cherches pas à posséder la chose pour toujours. Tu cherches à **avoir raison sur la direction de son prix**, et à dimensionner ce pari pour qu'une erreur ne fasse pas trop mal.",
      },
    },
    {
      type: "h",
      text: { en: "Why do prices move?", fr: "Pourquoi les prix bougent ?" },
    },
    {
      type: "p",
      text: {
        en: "Every price is a live agreement between buyers and sellers. It's set by **supply and demand**: when buyers are more eager than sellers, the price rises; when sellers rush for the exit, it falls. That balance shifts every second as news, emotion and money flow in and out. A market is just this tug-of-war, priced in real time.",
        fr: "Chaque prix est un accord vivant entre acheteurs et vendeurs. Il est fixé par l'**offre et la demande** : quand les acheteurs sont plus pressés que les vendeurs, le prix monte ; quand les vendeurs se ruent vers la sortie, il baisse. Cet équilibre bascule à chaque seconde, au gré des news, des émotions et des flux d'argent. Un marché, c'est ce bras de fer, coté en temps réel.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Demand up** (more buyers, or buyers willing to pay more) pushes price **up**.",
          fr: "**Demande en hausse** (plus d'acheteurs, ou prêts à payer plus) pousse le prix **vers le haut**.",
        },
        {
          en: "**Supply up** (more sellers, or sellers accepting less) pushes price **down**.",
          fr: "**Offre en hausse** (plus de vendeurs, ou acceptant moins) pousse le prix **vers le bas**.",
        },
        {
          en: "**News, narrative and emotion** are what suddenly change how eager each side is — which is why markets can jump on a headline.",
          fr: "**News, narratif et émotion** sont ce qui change soudain l'empressement de chaque camp — d'où les sauts de marché sur un simple titre.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "The two directions: long and short", fr: "Les deux directions : long et short" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Long** — you buy first, betting the price goes up, then sell higher. The classic move: buy low, sell high.",
          fr: "**Long** — tu achètes d'abord, en pariant que le prix monte, puis tu revends plus haut. Le grand classique : acheter bas, vendre haut.",
        },
        {
          en: "**Short** — you bet the price goes *down*. It sounds strange at first, but it means you can profit in a falling market too. We cover the mechanics in the perps track.",
          fr: "**Short** — tu paries que le prix *baisse*. Ça surprend au début, mais ça veut dire que tu peux aussi gagner sur un marché qui chute. On détaille la mécanique dans la piste perps.",
        },
      ],
    },
    {
      type: "example",
      title: { en: "A long trade, step by step", fr: "Un trade long, pas à pas" },
      rows: [
        { k: { en: "You buy", fr: "Tu achètes" }, v: { en: "1 BTC at $60,000", fr: "1 BTC à 60 000 $" } },
        { k: { en: "Price moves to", fr: "Le prix passe à" }, v: { en: "$66,000", fr: "66 000 $" } },
        { k: { en: "You sell", fr: "Tu revends" }, v: { en: "1 BTC at $66,000", fr: "1 BTC à 66 000 $" } },
        { k: { en: "Profit", fr: "Gain" }, v: { en: "+$6,000 (+10%)", fr: "+6 000 $ (+10 %)" } },
      ],
    },
    {
      type: "h",
      text: { en: "What can you actually trade?", fr: "Qu'est-ce qu'on peut trader, concrètement ?" },
    },
    {
      type: "p",
      text: {
        en: "Markets exist for almost anything with a fluctuating price. The big families are crypto, stocks, currencies (forex), commodities like gold or oil, and derivatives such as perpetual futures. On Tide you practice on the **top 250 crypto markets** by market cap, priced on live data — so what you learn maps directly onto real conditions.",
        fr: "Il existe un marché pour presque tout ce qui a un prix qui varie. Les grandes familles : crypto, actions, devises (forex), matières premières comme l'or ou le pétrole, et dérivés comme les futures perpétuels. Sur Tide, tu t'entraînes sur les **250 plus gros marchés crypto** en capitalisation, cotés sur des données live — ce que tu apprends colle donc directement aux conditions réelles.",
      },
    },
    {
      type: "h",
      text: { en: "Trading vs investing", fr: "Trading vs investissement" },
    },
    {
      type: "p",
      text: {
        en: "An investor buys and holds for months or years, betting on the long-term story. A trader works shorter timeframes — minutes, hours, days — and cares about the move in front of them. Neither is smarter than the other; they're different games with different rules. Tide is where you learn the trader's game, where timing and risk control matter more than conviction about the next decade.",
        fr: "Un investisseur achète et garde des mois ou des années, en pariant sur l'histoire de long terme. Un trader travaille sur des horizons courts — minutes, heures, jours — et se concentre sur le mouvement devant lui. Aucun n'est plus malin que l'autre ; ce sont deux jeux différents, avec des règles différentes. Tide est là où tu apprends celui du trader, où le timing et la maîtrise du risque comptent plus que la conviction sur la prochaine décennie.",
      },
    },
    {
      type: "h",
      text: { en: "The only equation that matters", fr: "La seule équation qui compte" },
    },
    {
      type: "p",
      text: {
        en: "Here's the secret that surprises beginners: you don't need to win most of your trades. What matters is **expectancy** — your average result per trade once wins and losses are weighed together. Win big when you're right, lose small when you're wrong, and the math works even with a losing majority.",
        fr: "Voici le secret qui surprend les débutants : tu n'as pas besoin de gagner la majorité de tes trades. Ce qui compte, c'est l'**espérance** — ton résultat moyen par trade une fois gains et pertes pesés ensemble. Gagne gros quand tu as raison, perds petit quand tu as tort, et le calcul fonctionne même en perdant plus d'une fois sur deux.",
      },
    },
    {
      type: "example",
      title: { en: "Win rate isn't everything", fr: "Le taux de réussite n'est pas tout" },
      rows: [
        { k: { en: "Win rate", fr: "Taux de réussite" }, v: { en: "40% (4 wins / 10)", fr: "40 % (4 gains / 10)" } },
        { k: { en: "Average win", fr: "Gain moyen" }, v: { en: "+$300", fr: "+300 $" } },
        { k: { en: "Average loss", fr: "Perte moyenne" }, v: { en: "−$100", fr: "−100 $" } },
        { k: { en: "Net over 10 trades", fr: "Net sur 10 trades" }, v: { en: "+$600", fr: "+600 $" } },
      ],
    },
    {
      type: "h",
      text: { en: "Why most beginners lose", fr: "Pourquoi la plupart des débutants perdent" },
    },
    {
      type: "list",
      items: [
        {
          en: "**No plan** — they enter on a feeling with no exit decided, so emotion runs the trade.",
          fr: "**Pas de plan** — ils entrent au feeling sans sortie décidée, donc l'émotion pilote le trade.",
        },
        {
          en: "**Oversizing** — one big bet wipes out ten good ones. Position size is a decision, not an afterthought.",
          fr: "**Positions trop grosses** — un gros pari efface dix bons trades. La taille de position est une décision, pas un détail.",
        },
        {
          en: "**No stop-loss** — a small loss is left to become a huge one because \"it'll come back.\"",
          fr: "**Pas de stop-loss** — une petite perte devient énorme parce que « ça va revenir ».",
        },
        {
          en: "**Learning with real money** — paying tuition in cash and panic instead of practicing first.",
          fr: "**Apprendre avec de l'argent réel** — payer ses frais de scolarité en cash et en panique au lieu de s'entraîner d'abord.",
        },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Practice with zero risk", fr: "Entraîne-toi sans aucun risque" },
      text: {
        en: "On Tide you trade real markets with virtual capital. Same prices, same charts, same adrenaline — but a losing trade costs you rank, not rent. Learn the reflexes here before a single dollar is ever at stake, then carry a proven track record into real trading.",
        fr: "Sur Tide, tu trades de vrais marchés avec un capital virtuel. Mêmes prix, mêmes graphiques, même adrénaline — mais un trade perdant te coûte du classement, pas ton loyer. Acquiers les réflexes ici avant qu'un seul dollar ne soit en jeu, puis emporte un track record prouvé vers le trading réel.",
      },
    },
    {
      type: "h",
      text: { en: "Your first steps on Tide", fr: "Tes premiers pas sur Tide" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Open the terminal in Paper mode and place one small trade on a market you recognise.",
          fr: "Ouvre le terminal en mode Paper et place un petit trade sur un marché que tu connais.",
        },
        {
          en: "Before you click, decide your exit — where you take profit and where you cut the loss.",
          fr: "Avant de cliquer, décide ta sortie — où tu prends le profit et où tu coupes la perte.",
        },
        {
          en: "Repeat, keep a note of *why* you entered, and let the leaderboard measure your edge over time.",
          fr: "Recommence, note *pourquoi* tu es entré, et laisse le classement mesurer ton edge dans la durée.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "The goal is not to be right every time. It's to make more when you're right than you lose when you're wrong.",
        fr: "Le but n'est pas d'avoir raison à chaque fois. C'est de gagner plus quand tu as raison que tu ne perds quand tu as tort.",
      },
    },
  ],
  related: ["reading-a-chart", "order-types", "how-tide-works"],
};
