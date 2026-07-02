import type { RawArticle } from "../types";

/* Basics — porte d'entrée du cursus. Concepts : marché, prix, offre/demande,
 * long vs short, spéculation vs investissement. Ton « tu », honnête. */
export const whatIsTrading: RawArticle = {
  slug: "what-is-trading",
  category: "basics",
  difficulty: "beginner",
  minutes: 6,
  featured: true,
  icon: "🌊",
  title: {
    en: "What is trading, really?",
    fr: "C'est quoi le trading, vraiment ?",
  },
  dek: {
    en: "Before any strategy, one idea: buy something for less than you sell it. Everything else is detail.",
    fr: "Avant toute stratégie, une seule idée : acheter moins cher que tu ne revends. Le reste, c'est du détail.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Trading is the act of buying and selling an asset — a crypto, a stock, a currency — to profit from the difference between your entry and your exit. You are not trying to own the thing forever. You are trying to be **right about where its price goes next**.",
        fr: "Le trading, c'est acheter et vendre un actif — une crypto, une action, une devise — pour profiter de l'écart entre ton entrée et ta sortie. Tu ne cherches pas à posséder la chose pour toujours. Tu cherches à **avoir raison sur la direction de son prix**.",
      },
    },
    {
      type: "h",
      text: { en: "Why do prices move?", fr: "Pourquoi les prix bougent ?" },
    },
    {
      type: "p",
      text: {
        en: "Every price is a live agreement between buyers and sellers. When buyers are more eager than sellers, the price rises. When sellers rush for the exit, it falls. That balance shifts every second as news, emotion, and money flow in and out. A market is just this tug-of-war, priced in real time.",
        fr: "Chaque prix est un accord vivant entre acheteurs et vendeurs. Quand les acheteurs sont plus pressés que les vendeurs, le prix monte. Quand les vendeurs se ruent vers la sortie, il baisse. Cet équilibre bascule à chaque seconde, au gré des news, des émotions et des flux d'argent. Un marché, c'est ce bras de fer, coté en temps réel.",
      },
    },
    {
      type: "h",
      text: { en: "Two directions: long and short", fr: "Deux directions : long et short" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Long** — you buy first, betting the price goes up, then sell higher. This is the classic move: buy low, sell high.",
          fr: "**Long** — tu achètes d'abord, en pariant que le prix monte, puis tu revends plus haut. Le grand classique : acheter bas, vendre haut.",
        },
        {
          en: "**Short** — you bet the price goes down. It sounds strange at first, but it means you can profit in a falling market too. We cover it in detail in the perps track.",
          fr: "**Short** — tu paries que le prix baisse. Ça surprend au début, mais ça veut dire que tu peux aussi gagner sur un marché qui chute. On détaille ça dans la piste perps.",
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
      text: { en: "Trading vs investing", fr: "Trading vs investissement" },
    },
    {
      type: "p",
      text: {
        en: "An investor buys and holds for months or years, betting on the long-term story. A trader works shorter timeframes — minutes, hours, days — and cares about the move in front of them. Neither is smarter than the other. They are different games with different rules, and Tide is where you learn the trader's game.",
        fr: "Un investisseur achète et garde des mois ou des années, en pariant sur l'histoire de long terme. Un trader travaille sur des horizons courts — minutes, heures, jours — et se concentre sur le mouvement devant lui. Aucun n'est plus malin que l'autre. Ce sont deux jeux différents, avec des règles différentes, et Tide est là où tu apprends celui du trader.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Practice with zero risk", fr: "Entraîne-toi sans aucun risque" },
      text: {
        en: "On Tide you trade real markets with virtual capital. Same prices, same charts, same adrenaline — but a losing trade costs you rank, not rent. Learn the reflexes here before a single dollar is ever at stake.",
        fr: "Sur Tide, tu trades de vrais marchés avec un capital virtuel. Mêmes prix, mêmes graphiques, même adrénaline — mais un trade perdant te coûte du classement, pas ton loyer. Acquiers les réflexes ici avant qu'un seul dollar ne soit en jeu.",
      },
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
