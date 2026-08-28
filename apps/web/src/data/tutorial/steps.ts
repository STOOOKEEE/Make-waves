/* ===== Tutoriel interactif — le programme =====
 *
 * Écrit pour quelqu'un qui n'a jamais passé un ordre. Chaque étape enseigne une
 * idée, demande une action, et pointe la leçon Tide School qui va plus loin.
 *
 * Les chapitres « perps » et « risk » sont volontairement les plus longs : c'est
 * ce que les plateformes classiques n'expliquent pas, et c'est ce que Tide
 * propose en plus. Ce sont aussi les deux chapitres qu'on ne coupe jamais.
 *
 * Contrainte de copie (docs/BRAND.md § Voice) : jamais « sans risque », jamais
 * de promesse de gain. On dit « argent fictif ».
 */
import type { ChapterMeta, RawTutorialStep } from "./types";

export const CHAPTERS: readonly ChapterMeta[] = [
  { id: "why", label: { en: "Why", fr: "Pourquoi" } },
  { id: "read", label: { en: "Read the screen", fr: "Lire l'écran" } },
  { id: "orders", label: { en: "Your first order", fr: "Ton premier ordre" } },
  { id: "perps", label: { en: "Perps & leverage", fr: "Perps & levier" } },
  { id: "risk", label: { en: "Staying alive", fr: "Rester en vie" } },
  { id: "next", label: { en: "What's next", fr: "La suite" } },
];

export const STEPS: readonly RawTutorialStep[] = [
  /* ---------------- Chapitre 0 — Pourquoi ---------------- */
  {
    id: "welcome",
    chapter: "why",
    title: { en: "This is a sandbox", fr: "Ici, rien n'est réel" },
    key: {
      en: "Real prices. Fake money. Nothing leaves your browser.",
      fr: "Vrais prix. Argent fictif. Rien ne sort de ton navigateur.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "You are about to place your first trade. The prices you'll see are the **real crypto market**, live. The money is **not real**, and nothing here touches a wallet, a blockchain, or a single cent of yours.",
          fr: "Tu vas passer ton premier ordre. Les prix que tu vois sont ceux du **vrai marché crypto**, en direct. L'argent, lui, **n'est pas réel** : rien ici ne touche un wallet, une blockchain, ni un centime à toi.",
        },
      },
      {
        type: "list",
        items: [
          {
            en: "It takes about ten minutes. You can leave whenever you want and come back where you left off.",
            fr: "Ça prend une dizaine de minutes. Tu peux partir quand tu veux et reprendre où tu en étais.",
          },
          {
            en: "Each step asks you to do one thing. Do it and the step ticks green.",
            fr: "Chaque étape te demande une chose. Fais-la et l'étape passe au vert.",
          },
          {
            en: "Stuck or bored? **Skip** is always there, top right. Nothing is locked.",
            fr: "Bloqué ou pas d'humeur ? **Passer** est toujours en haut à droite. Rien n'est verrouillé.",
          },
        ],
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "Why bother learning first", fr: "Pourquoi apprendre d'abord" },
        text: {
          en: "Most people never place a first trade, not because it's hard, but because the first mistake costs real money. So we removed the money, not the market.",
          fr: "La plupart des gens ne passent jamais leur premier ordre : pas parce que c'est difficile, mais parce que la première erreur coûte de l'argent réel. Alors on a retiré l'argent, pas le marché.",
        },
      },
    ],
    goal: { kind: "read" },
    lesson: "what-is-trading",
  },
  {
    id: "what-is-trading",
    chapter: "why",
    title: { en: "What trading actually is", fr: "Le trading, concrètement" },
    key: {
      en: "You buy something you think is cheap, and sell it to someone who disagrees.",
      fr: "Tu achètes ce que tu crois bon marché, et tu le revends à quelqu'un qui n'est pas d'accord.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A market is just a permanent negotiation. At every instant, some people want to buy and some want to sell. The **price** is simply where those two crowds currently agree.",
          fr: "Un marché n'est qu'une négociation permanente. À chaque instant, des gens veulent acheter et d'autres veulent vendre. Le **prix**, c'est simplement l'endroit où ces deux foules se mettent d'accord.",
        },
      },
      {
        type: "p",
        text: {
          en: "Trading is taking a position on where that agreement moves next. If you buy at 100 and the crowd later agrees on 110, you can sell and keep the difference. If they agree on 90, you lose it.",
          fr: "Trader, c'est prendre position sur le prochain déplacement de cet accord. Si tu achètes à 100 et que la foule s'accorde plus tard sur 110, tu peux revendre et garder la différence. Si elle s'accorde sur 90, tu la perds.",
        },
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "The part nobody says out loud", fr: "Ce que personne ne dit" },
        text: {
          en: "Someone is on the other side of every trade you make, and they think you're wrong. Being right more often than you're wrong is the entire job.",
          fr: "Quelqu'un est en face de chacun de tes trades, et pense que tu as tort. Avoir raison plus souvent que tort, c'est tout le métier.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "chart",
    lesson: "what-is-trading",
  },

  /* ---------------- Chapitre 1 — Lire l'écran ---------------- */
  {
    id: "pick-a-market",
    chapter: "read",
    title: { en: "Pick a market", fr: "Choisis un marché" },
    key: {
      en: "Each line is one asset, its current price, and how it moved today.",
      fr: "Chaque ligne est un actif, son prix courant, et son mouvement du jour.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "On the left is the **watchlist**. Each row shows an asset, its live price, and its change over 24 hours. Green means it's higher than yesterday, red means lower. That's all.",
          fr: "À gauche, la **watchlist**. Chaque ligne montre un actif, son prix en direct, et sa variation sur 24 heures. Vert = plus haut qu'hier, rouge = plus bas. C'est tout.",
        },
      },
    ],
    task: {
      en: "Click any market in the list on the left.",
      fr: "Clique sur n'importe quel marché dans la liste de gauche.",
    },
    done: {
      en: "The chart and the order book now follow that market.",
      fr: "Le graphique et le carnet suivent maintenant ce marché.",
    },
    goal: { kind: "select-market" },
    spotlight: "watchlist",
    lesson: "reading-a-chart",
  },
  {
    id: "candles",
    chapter: "read",
    title: { en: "Read a candle", fr: "Lire une bougie" },
    key: {
      en: "One candle = one slice of time. Body = open to close. Wicks = the extremes.",
      fr: "Une bougie = une tranche de temps. Le corps = ouverture à clôture. Les mèches = les extrêmes.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A candle summarises everything that happened in one period, in one shape. The **body** runs from the opening price to the closing price. The thin **wicks** show how far the price went before coming back.",
          fr: "Une bougie résume tout ce qui s'est passé sur une période, en une seule forme. Le **corps** va du prix d'ouverture au prix de clôture. Les **mèches** fines montrent jusqu'où le prix est allé avant de revenir.",
        },
      },
      {
        type: "example",
        title: { en: "A green candle, decoded", fr: "Une bougie verte, décodée" },
        rows: [
          { k: { en: "Opened at", fr: "Ouverture" }, v: { en: "$100", fr: "100 $" } },
          { k: { en: "Dropped to", fr: "Descendue à" }, v: { en: "$97 (lower wick)", fr: "97 $ (mèche basse)" } },
          { k: { en: "Rose to", fr: "Montée à" }, v: { en: "$106 (upper wick)", fr: "106 $ (mèche haute)" } },
          { k: { en: "Closed at", fr: "Clôture" }, v: { en: "$104 → green", fr: "104 $ → verte" } },
        ],
      },
      {
        type: "p",
        text: {
          en: "A long lower wick means buyers stepped in hard after a drop. A long upper wick means sellers pushed back. That's the whole vocabulary you need for now.",
          fr: "Une longue mèche basse veut dire que les acheteurs sont intervenus fort après une baisse. Une longue mèche haute, que les vendeurs ont repoussé. C'est tout le vocabulaire dont tu as besoin pour l'instant.",
        },
      },
    ],
    task: {
      en: "Switch the chart to candles.",
      fr: "Bascule le graphique en bougies.",
    },
    done: {
      en: "Every bar is now one hour of trading, summarised.",
      fr: "Chaque barre est maintenant une heure de marché, résumée.",
    },
    goal: { kind: "chart-mode", value: "candles" },
    spotlight: "chart.mode",
    lesson: "reading-a-chart",
    preset: { chartMode: "line" },
  },
  {
    id: "book-and-spread",
    chapter: "read",
    title: { en: "Bid, ask, spread", fr: "Bid, ask, spread" },
    key: {
      en: "There is never one price. There is a price to buy and a price to sell.",
      fr: "Il n'y a jamais un prix. Il y a un prix pour acheter et un pour vendre.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "The **order book** on the right lists everyone waiting. Red rows are people willing to sell (**asks**), green rows people willing to buy (**bids**). The gap between the best of each is the **spread**.",
          fr: "Le **carnet d'ordres** à droite liste tous ceux qui attendent. Les lignes rouges sont ceux qui veulent vendre (**asks**), les vertes ceux qui veulent acheter (**bids**). L'écart entre les deux meilleurs est le **spread**.",
        },
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "The spread is a real cost", fr: "Le spread est un vrai coût" },
        text: {
          en: "If you buy instantly and sell instantly, you lose the spread twice. On a liquid market it's tiny. On an illiquid one it can eat a whole day of gains.",
          fr: "Si tu achètes et revends instantanément, tu perds le spread deux fois. Sur un marché liquide, c'est minuscule. Sur un marché illiquide, ça peut manger une journée entière de gains.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "book",
    lesson: "order-book-spread",
  },

  /* ---------------- Chapitre 2 — Ton premier ordre ---------------- */
  {
    id: "limit-order",
    chapter: "orders",
    title: { en: "Limit: you choose the price", fr: "Limit : tu choisis le prix" },
    key: {
      en: "A limit order names your price. It may never get filled.",
      fr: "Un ordre limit fixe ton prix. Il peut ne jamais être exécuté.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A **limit** order says: *I'll buy, but only at this price or better.* You control the price completely. What you don't control is whether the market ever comes to you.",
          fr: "Un ordre **limit** dit : *j'achète, mais seulement à ce prix ou mieux*. Tu contrôles totalement le prix. Ce que tu ne contrôles pas, c'est si le marché viendra jusqu'à toi.",
        },
      },
      {
        type: "p",
        text: {
          en: "It's the patient option. You use it when you have a level in mind and no reason to rush.",
          fr: "C'est l'option patiente. Tu l'utilises quand tu as un niveau en tête et aucune raison de te presser.",
        },
      },
    ],
    task: {
      en: "Switch the order type to LIMIT.",
      fr: "Bascule le type d'ordre sur LIMIT.",
    },
    done: {
      en: "A price field appeared. That's the price you're naming.",
      fr: "Un champ de prix est apparu. C'est le prix que tu fixes.",
    },
    goal: { kind: "select-order-kind", value: "limit" },
    spotlight: "ticket.orderKind",
    lesson: "order-types",
  },
  {
    id: "market-order",
    chapter: "orders",
    title: { en: "Market: you choose speed", fr: "Market : tu choisis la vitesse" },
    key: {
      en: "A market order fills now, at whatever price is there.",
      fr: "Un ordre market s'exécute tout de suite, au prix qui s'y trouve.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A **market** order is the opposite trade-off: guaranteed execution, uncertain price. You take whatever the book is offering right now, crossing the spread to get it.",
          fr: "Un ordre **market** fait le compromis inverse : exécution garantie, prix incertain. Tu prends ce que le carnet offre à l'instant, en traversant le spread pour l'obtenir.",
        },
      },
      {
        type: "p",
        text: {
          en: "That's also why it costs more. Crossing the spread makes you a **taker** and taker fees are higher: **0.06 %** against **0.02 %** for a maker who posts and waits. Watch the *Est. fees* line change when you switch.",
          fr: "C'est aussi pour ça qu'il coûte plus cher. Traverser le spread fait de toi un **taker**, et les frais taker sont plus élevés : **0,06 %** contre **0,02 %** pour un maker qui pose son ordre et attend. Regarde la ligne *Frais estimés* changer quand tu bascules.",
        },
      },
    ],
    task: {
      en: "Switch back to MARKET.",
      fr: "Reviens sur MARKET.",
    },
    done: {
      en: "Your order will now fill immediately at the book price.",
      fr: "Ton ordre s'exécutera maintenant immédiatement au prix du carnet.",
    },
    goal: { kind: "select-order-kind", value: "market" },
    spotlight: "ticket.summary",
    lesson: "order-types",
  },
  {
    id: "size-it",
    chapter: "orders",
    title: { en: "Choose a size", fr: "Choisis une taille" },
    key: {
      en: "Size decides how much a move is worth to you.",
      fr: "La taille décide de ce qu'un mouvement te rapporte ou te coûte.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "You have **$10,000** of fake money. The amount you type is what you're committing. A 1 % move on $200 is $2; the same move on $2,000 is $20. Same call, ten times the consequence.",
          fr: "Tu as **10 000 $** d'argent fictif. Le montant que tu saisis est ce que tu engages. Un mouvement de 1 % sur 200 $ fait 2 $ ; le même sur 2 000 $ en fait 20. Même analyse, dix fois les conséquences.",
        },
      },
    ],
    task: {
      en: "Set an amount of at least $200 (the % buttons are the fast way).",
      fr: "Mets un montant d'au moins 200 $ (les boutons % vont plus vite).",
    },
    done: {
      en: "The summary now shows what you'd actually get.",
      fr: "Le résumé montre maintenant ce que tu obtiendrais réellement.",
    },
    goal: { kind: "set-amount", min: 200 },
    spotlight: "ticket.amount",
    lesson: "risk-management-101",
  },
  {
    id: "first-buy",
    chapter: "orders",
    title: { en: "Send it", fr: "Envoie" },
    key: {
      en: "A filled order becomes a position you can watch.",
      fr: "Un ordre exécuté devient une position que tu peux suivre.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Time to press the button. Your order will fill against the book, you'll pay the taker fee, and the result will appear in the **blotter** below the chart.",
          fr: "Il est temps d'appuyer. Ton ordre va s'exécuter contre le carnet, tu paieras les frais taker, et le résultat apparaîtra dans le **blotter** sous le graphique.",
        },
      },
      {
        type: "p",
        text: {
          en: "Look at the fill price against the price displayed before you clicked. They're rarely identical. That difference has a name: **slippage**.",
          fr: "Compare le prix obtenu au prix affiché avant ton clic. Ils sont rarement identiques. Cet écart a un nom : le **slippage**.",
        },
      },
    ],
    task: {
      en: "Place the order.",
      fr: "Passe l'ordre.",
    },
    done: {
      en: "You have a position. It's now worth something that changes.",
      fr: "Tu as une position. Elle vaut maintenant quelque chose qui bouge.",
    },
    goal: { kind: "place-order", product: "spot" },
    spotlight: "ticket.place",
    lesson: "how-tide-works",
    preset: { product: "spot", orderKind: "market", side: "buy" },
  },

  /* ---------------- Chapitre 3 — Perps & levier ---------------- */
  {
    id: "what-is-a-perp",
    chapter: "perps",
    title: { en: "What a perpetual is", fr: "Ce qu'est un perpétuel" },
    key: {
      en: "A bet on the price. You never own the asset, and it never expires.",
      fr: "Un pari sur le prix. Tu ne possèdes jamais l'actif, et ça n'expire jamais.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Everything so far was **spot**: you bought the thing, you own the thing. A **perpetual** is different. You never own anything. You hold a contract whose value tracks the price, and you can hold it as long as you like.",
          fr: "Tout ce qui précède était du **spot** : tu achètes la chose, tu possèdes la chose. Un **perpétuel**, c'est différent. Tu ne possèdes rien. Tu tiens un contrat dont la valeur suit le prix, et tu peux le garder aussi longtemps que tu veux.",
        },
      },
      {
        type: "list",
        items: [
          {
            en: "**No expiry.** Traditional futures have a settlement date. Perps don't.",
            fr: "**Pas d'échéance.** Les futures classiques ont une date de règlement. Les perps, non.",
          },
          {
            en: "**You can bet on a fall.** With spot you can only profit when the price rises.",
            fr: "**Tu peux parier sur la baisse.** En spot, tu ne gagnes que si le prix monte.",
          },
          {
            en: "**You can use leverage.** This is the part that gets people hurt, and the next four steps are about it.",
            fr: "**Tu peux utiliser du levier.** C'est ce qui fait le plus de dégâts, et les quatre étapes suivantes y sont consacrées.",
          },
        ],
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "On Tide", fr: "Sur Tide" },
        text: {
          en: "Perps are simulated in Paper only, as a learning tool. There is no real leveraged position anywhere, and no real money involved.",
          fr: "Les perps sont simulés en Paper uniquement, comme outil d'apprentissage. Il n'existe aucune position à levier réelle, et aucun argent réel n'entre en jeu.",
        },
      },
    ],
    task: {
      en: "Switch the product to PERP.",
      fr: "Bascule le produit sur PERP.",
    },
    done: {
      en: "A leverage slider appeared. Don't touch it yet.",
      fr: "Un curseur de levier est apparu. N'y touche pas encore.",
    },
    goal: { kind: "select-product", value: "perp" },
    spotlight: "ticket.product",
    lesson: "what-is-a-perpetual",
  },
  {
    id: "long-and-short",
    chapter: "perps",
    title: { en: "Long and short", fr: "Long et short" },
    key: {
      en: "Long profits when it rises. Short profits when it falls.",
      fr: "Long gagne à la hausse. Short gagne à la baisse.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Going **long** is what you already did: you win if the price goes up. Going **short** is the mirror image: you win if it goes down. Same screen, same buttons, opposite direction.",
          fr: "Être **long**, c'est ce que tu viens de faire : tu gagnes si le prix monte. Être **short**, c'est l'image miroir : tu gagnes s'il baisse. Même écran, mêmes boutons, direction opposée.",
        },
      },
      {
        type: "example",
        title: { en: "One formula for both", fr: "Une seule formule pour les deux" },
        rows: [
          { k: { en: "Long", fr: "Long" }, v: { en: "(exit − entry) × quantity", fr: "(sortie − entrée) × quantité" } },
          { k: { en: "Short", fr: "Short" }, v: { en: "(entry − exit) × quantity", fr: "(entrée − sortie) × quantité" } },
        ],
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "Short is not symmetric", fr: "Le short n'est pas symétrique" },
        text: {
          en: "A price can only fall to zero, so a long's loss is capped. A price can rise forever, so a short's loss is not. Shorts demand tighter discipline.",
          fr: "Un prix ne peut baisser que jusqu'à zéro : la perte d'un long est donc plafonnée. Un prix peut monter indéfiniment : celle d'un short ne l'est pas. Le short demande plus de discipline.",
        },
      },
    ],
    task: {
      en: "Select SELL to set up a short.",
      fr: "Sélectionne VENDRE pour préparer un short.",
    },
    done: {
      en: "You're now set up to profit from a fall.",
      fr: "Tu es maintenant positionné pour gagner à la baisse.",
    },
    goal: { kind: "select-side", value: "sell" },
    spotlight: "ticket.side",
    lesson: "long-and-short",
  },
  {
    id: "leverage",
    chapter: "perps",
    title: { en: "Leverage multiplies exposure", fr: "Le levier multiplie l'exposition" },
    key: {
      en: "10x doesn't mean ten times your money. It means ten times your exposure.",
      fr: "10x ne veut pas dire dix fois ton argent. Ça veut dire dix fois ton exposition.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This is the single most misunderstood control on the screen. Leverage does **not** give you more money. It lets a small amount of your money control a much larger position.",
          fr: "C'est le contrôle le plus mal compris de tout l'écran. Le levier ne te donne **pas** plus d'argent. Il permet à une petite somme de contrôler une position beaucoup plus grande.",
        },
      },
      {
        type: "example",
        title: { en: "$100 at 10x", fr: "100 $ à 10x" },
        rows: [
          { k: { en: "Your money (margin)", fr: "Ton argent (marge)" }, v: { en: "$100", fr: "100 $" } },
          { k: { en: "Position size", fr: "Taille de position" }, v: { en: "$1,000", fr: "1 000 $" } },
          { k: { en: "Price moves +1 %", fr: "Le prix bouge de +1 %" }, v: { en: "+$10 → +10 % on your money", fr: "+10 $ → +10 % sur ton argent" } },
          { k: { en: "Price moves −1 %", fr: "Le prix bouge de −1 %" }, v: { en: "−$10 → −10 % on your money", fr: "−10 $ → −10 % sur ton argent" } },
        ],
      },
      {
        type: "p",
        text: {
          en: "Move the slider and watch the **position size** in the summary grow while your committed amount stays exactly the same. That's the whole mechanism.",
          fr: "Déplace le curseur et regarde la **taille de position** grossir dans le résumé pendant que le montant engagé, lui, ne bouge pas d'un centime. C'est tout le mécanisme.",
        },
      },
    ],
    task: {
      en: "Set leverage to 5x or more.",
      fr: "Mets le levier à 5x ou plus.",
    },
    done: {
      en: "Your exposure grew. Your money didn't.",
      fr: "Ton exposition a grandi. Ton argent, non.",
    },
    goal: { kind: "set-leverage", min: 5 },
    spotlight: "ticket.leverage",
    lesson: "leverage-and-margin",
  },
  {
    id: "liquidation",
    chapter: "perps",
    title: { en: "The liquidation price", fr: "Le prix de liquidation" },
    key: {
      en: "At 20x, a 5 % move against you wipes out everything you committed.",
      fr: "À 20x, un mouvement de 5 % contre toi efface tout ce que tu as engagé.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Leverage is borrowed exposure, and the lender wants their capital back. The moment your margin is fully eaten by losses, the position is closed for you. That price is the **liquidation price**, and it's in the summary.",
          fr: "Le levier est une exposition empruntée, et le prêteur veut récupérer son capital. Dès que ta marge est entièrement mangée par les pertes, la position est fermée à ta place. Ce prix est le **prix de liquidation**, et il est dans le résumé.",
        },
      },
      {
        type: "example",
        title: { en: "How much room you get", fr: "La marge d'erreur que tu as" },
        rows: [
          { k: { en: "2x", fr: "2x" }, v: { en: "50 % move against you", fr: "50 % de mouvement contre toi" } },
          { k: { en: "5x", fr: "5x" }, v: { en: "20 %", fr: "20 %" } },
          { k: { en: "10x", fr: "10x" }, v: { en: "10 %", fr: "10 %" } },
          { k: { en: "20x", fr: "20x" }, v: { en: "5 % — crypto does that before lunch", fr: "5 % — la crypto fait ça avant midi" } },
        ],
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "Read that table again", fr: "Relis ce tableau" },
        text: {
          en: "High leverage doesn't make you more likely to be right. It makes you far more likely to be closed out before you get the chance to be right.",
          fr: "Un levier élevé ne te donne pas plus de chances d'avoir raison. Il te donne beaucoup plus de chances d'être fermé avant d'avoir eu l'occasion d'avoir raison.",
        },
      },
    ],
    task: {
      en: "Push leverage to 10x and watch the liquidation price move closer.",
      fr: "Pousse le levier à 10x et regarde le prix de liquidation se rapprocher.",
    },
    done: {
      en: "That's how little room you now have.",
      fr: "Voilà la marge d'erreur qu'il te reste.",
    },
    goal: { kind: "set-leverage", min: 10 },
    spotlight: "ticket.summary",
    lesson: "leverage-and-margin",
  },
  {
    id: "funding",
    chapter: "perps",
    title: { en: "Funding: the rent you pay", fr: "Le funding : le loyer que tu paies" },
    key: {
      en: "A perp has no expiry, so a small fee keeps it glued to the real price.",
      fr: "Un perp n'a pas d'échéance : un petit paiement le garde collé au prix réel.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "If a contract never expires, what stops its price drifting away from the actual asset? A recurring payment called **funding**. When more traders are long than short, longs pay shorts. When the crowd flips, so does the payment.",
          fr: "Si un contrat n'expire jamais, qu'est-ce qui empêche son prix de dériver loin de l'actif réel ? Un paiement récurrent appelé **funding**. Quand il y a plus de longs que de shorts, les longs paient les shorts. Quand la foule bascule, le paiement bascule aussi.",
        },
      },
      {
        type: "p",
        text: {
          en: "It's usually tiny per payment, but it's charged every few hours. Holding a leveraged position for weeks costs real money even if the price never moves.",
          fr: "C'est minuscule à chaque fois, mais c'est prélevé toutes les quelques heures. Garder une position à levier pendant des semaines coûte de l'argent même si le prix ne bouge jamais.",
        },
      },
    ],
    goal: { kind: "read" },
    lesson: "what-is-a-perpetual",
  },

  /* ---------------- Chapitre 4 — Rester en vie ---------------- */
  {
    id: "stop-loss",
    chapter: "risk",
    title: { en: "Decide your exit first", fr: "Décide ta sortie d'abord" },
    key: {
      en: "A stop-loss is a decision you make while you're still calm.",
      fr: "Un stop-loss est une décision que tu prends pendant que tu es encore calme.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A **stop-loss** closes your position automatically if the price reaches a level you chose in advance. Its real purpose isn't mathematical, it's psychological: it makes the decision before you're emotionally invested in being right.",
          fr: "Un **stop-loss** ferme ta position automatiquement si le prix atteint un niveau que tu as choisi à l'avance. Son vrai but n'est pas mathématique, il est psychologique : il prend la décision avant que tu ne sois émotionnellement investi dans le fait d'avoir raison.",
        },
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "The mistake everyone makes once", fr: "L'erreur que tout le monde fait une fois" },
        text: {
          en: "Watching a loss grow while telling yourself it'll come back. Sometimes it does. The time it doesn't is the time that ends the account.",
          fr: "Regarder une perte grandir en se disant que ça va revenir. Parfois ça revient. La fois où ça ne revient pas est celle qui termine le compte.",
        },
      },
    ],
    task: {
      en: "Set a stop-loss price.",
      fr: "Pose un prix de stop-loss.",
    },
    done: {
      en: "Your worst case is now a number you chose.",
      fr: "Ton pire scénario est maintenant un chiffre que tu as choisi.",
    },
    goal: { kind: "set-stop-loss" },
    spotlight: "ticket.risk",
    lesson: "take-profit-stop-loss",
  },
  {
    id: "take-profit",
    chapter: "risk",
    title: { en: "And your exit up", fr: "Et ta sortie à la hausse" },
    key: {
      en: "Aim for at least twice what you're risking.",
      fr: "Vise au moins le double de ce que tu risques.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A **take-profit** does the same thing in the other direction: it closes the position once you've made what you came for. It protects you from the other classic mistake, watching a gain evaporate because you got greedy.",
          fr: "Un **take-profit** fait la même chose dans l'autre sens : il ferme la position une fois que tu as obtenu ce que tu venais chercher. Il te protège de l'autre erreur classique : regarder un gain s'évaporer par avidité.",
        },
      },
      {
        type: "p",
        text: {
          en: "Compare the two distances. If your target is $30 away and your stop is $30 away, you need to be right more than half the time just to break even after fees. If your target is twice as far, you can be wrong most of the time and still come out ahead.",
          fr: "Compare les deux distances. Si ta cible est à 30 $ et ton stop à 30 $, tu dois avoir raison plus d'une fois sur deux rien que pour rentrer dans tes frais. Si ta cible est deux fois plus loin, tu peux avoir tort la plupart du temps et t'en sortir quand même.",
        },
      },
    ],
    task: {
      en: "Set a take-profit price.",
      fr: "Pose un prix de take-profit.",
    },
    done: {
      en: "Both exits are planned. Now the trade runs itself.",
      fr: "Les deux sorties sont planifiées. Le trade se gère maintenant tout seul.",
    },
    goal: { kind: "set-take-profit" },
    spotlight: "ticket.risk",
    lesson: "take-profit-stop-loss",
  },
  {
    id: "position-sizing",
    chapter: "risk",
    title: { en: "The 1 % rule", fr: "La règle du 1 %" },
    key: {
      en: "Never risk more than 1 % of your account on one idea.",
      fr: "Ne risque jamais plus de 1 % de ton compte sur une seule idée.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This is the step that separates people who last from people who don't. You don't choose a position size because it feels right. You work backwards from the loss you're willing to take.",
          fr: "C'est l'étape qui sépare ceux qui durent de ceux qui ne durent pas. Tu ne choisis pas une taille de position au feeling. Tu pars de la perte que tu acceptes, et tu remontes.",
        },
      },
      {
        type: "steps",
        items: [
          {
            en: "Decide the most you'll lose: 1 % of $10,000 is **$100**.",
            fr: "Décide ta perte maximale : 1 % de 10 000 $, c'est **100 $**.",
          },
          {
            en: "Decide where your idea is wrong. That's your stop.",
            fr: "Décide où ton idée est invalidée. C'est ton stop.",
          },
          {
            en: "Size the position so that hitting the stop costs exactly that $100, no more.",
            fr: "Dimensionne la position pour que toucher le stop coûte exactement ces 100 $, pas plus.",
          },
        ],
      },
      {
        type: "p",
        text: {
          en: "The **Risk at stop** line in the summary does this arithmetic live. Bring it under 1 % by lowering the amount, moving the stop closer, or both.",
          fr: "La ligne **Risque au stop** du résumé fait ce calcul en direct. Fais-la passer sous 1 % en baissant le montant, en rapprochant le stop, ou les deux.",
        },
      },
      {
        type: "callout",
        variant: "tip",
        title: { en: "Why 1 %", fr: "Pourquoi 1 %" },
        text: {
          en: "At 1 % per trade you can be wrong ten times in a row and still have 90 % of your account. At 20 % per trade, five mistakes and there's nothing left to trade with.",
          fr: "À 1 % par trade, tu peux te tromper dix fois d'affilée et garder 90 % de ton compte. À 20 % par trade, cinq erreurs et il ne reste plus rien pour trader.",
        },
      },
    ],
    task: {
      en: "Get Risk at stop under 1 % of your equity.",
      fr: "Fais passer le risque au stop sous 1 % de ton équité.",
    },
    done: {
      en: "That's a professionally sized position.",
      fr: "Voilà une position dimensionnée proprement.",
    },
    goal: { kind: "risk-budget", maxRiskPct: 1 },
    spotlight: "ticket.summary",
    lesson: "risk-management-101",
  },
  {
    id: "run-the-plan",
    chapter: "risk",
    title: { en: "Run the whole plan", fr: "Déroule le plan entier" },
    key: {
      en: "Entry, stop, target, size. Decided before you click, not after.",
      fr: "Entrée, stop, cible, taille. Décidés avant de cliquer, pas après.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "You now know every piece. Put them together: a sized position with both exits set, sent as one decision. Then use **fast-forward** to watch an hour of market pass in a couple of seconds and see what your plan does without you.",
          fr: "Tu connais maintenant toutes les pièces. Assemble-les : une position dimensionnée, les deux sorties posées, envoyée comme une seule décision. Puis utilise **accélérer** pour voir une heure de marché défiler en deux secondes, et regarder ton plan se dérouler sans toi.",
        },
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "Fast-forward is a teaching tool", fr: "L'accélération est un outil pédagogique" },
        text: {
          en: "It compresses time so you can see a stop or a target actually trigger. Real markets take hours to do this.",
          fr: "Elle compresse le temps pour que tu voies un stop ou une cible se déclencher pour de vrai. Les vrais marchés mettent des heures.",
        },
      },
    ],
    task: {
      en: "Place the order, then hit fast-forward.",
      fr: "Passe l'ordre, puis lance l'accélération.",
    },
    done: {
      en: "You just ran a complete trade, start to finish.",
      fr: "Tu viens de dérouler un trade complet, du début à la fin.",
    },
    goal: { kind: "accelerate" },
    spotlight: "accelerate",
    lesson: "trading-psychology",
  },

  /* ---------------- Chapitre 5 — La suite ---------------- */
  {
    id: "graduate",
    chapter: "next",
    title: { en: "You're ready for the real terminal", fr: "Tu es prêt pour le vrai terminal" },
    key: {
      en: "Same buttons, same rules, a portfolio that persists.",
      fr: "Mêmes boutons, mêmes règles, un portefeuille qui persiste.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Everything you just used exists in the real Tide terminal, in the same place, with the same names. The difference is that your positions persist, your performance is ranked against everyone else, and you can enter competitions.",
          fr: "Tout ce que tu viens d'utiliser existe dans le vrai terminal Tide, au même endroit, avec les mêmes noms. La différence, c'est que tes positions persistent, ta performance est classée face aux autres, et tu peux entrer en compétition.",
        },
      },
      {
        type: "list",
        items: [
          {
            en: "Still **no real money** in Paper mode. That doesn't change.",
            fr: "Toujours **aucun argent réel** en mode Paper. Ça ne change pas.",
          },
          {
            en: "The **?** next to any control opens the lesson that explains it.",
            fr: "Le **?** à côté de chaque contrôle ouvre la leçon qui l'explique.",
          },
          {
            en: "Sixteen lessons go deeper than this tutorial could. Strategies, psychology, on-chain track records.",
            fr: "Seize leçons vont plus loin que ce tutoriel ne pouvait aller. Stratégies, psychologie, historique on-chain.",
          },
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: { en: "One habit worth keeping", fr: "Une habitude à garder" },
        text: {
          en: "Before every click: where's my stop, what's my size, and what makes this idea wrong? If you can't answer all three, you don't have a trade yet.",
          fr: "Avant chaque clic : où est mon stop, quelle est ma taille, et qu'est-ce qui rendrait cette idée fausse ? Si tu ne peux pas répondre aux trois, tu n'as pas encore de trade.",
        },
      },
    ],
    goal: { kind: "read" },
    lesson: "how-tide-works",
    extraLessons: ["trend-following", "mean-reversion-ranges", "breakout-trading"],
  },
];
