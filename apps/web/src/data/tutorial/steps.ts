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
  /* ================= Chapitre 0 — Pourquoi ================= */
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
          en: "You are about to place your first trade. The prices are the **real crypto market**, live. The money is **not real**, and nothing here touches a wallet, a blockchain, or a single cent of yours.",
          fr: "Tu vas passer ton premier ordre. Les prix sont ceux du **vrai marché crypto**, en direct. L'argent, lui, **n'est pas réel** : rien ici ne touche un wallet, une blockchain, ni un centime à toi.",
        },
      },
      {
        type: "list",
        items: [
          {
            en: "Around fifteen minutes. Leave whenever you want, come back where you left off.",
            fr: "Une quinzaine de minutes. Pars quand tu veux, reprends où tu en étais.",
          },
          {
            en: "**The red ring** shows you what to look at. Everything else fades out on purpose.",
            fr: "**L'anneau rouge** te montre où regarder. Tout le reste s'efface exprès.",
          },
          {
            en: "**Skip** is always top right. Nothing is ever locked.",
            fr: "**Passer** est toujours en haut à droite. Rien n'est jamais verrouillé.",
          },
        ],
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "Why learn first", fr: "Pourquoi apprendre d'abord" },
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
    id: "the-screen",
    chapter: "why",
    title: { en: "Four zones, that's all", fr: "Quatre zones, c'est tout" },
    key: {
      en: "Every trading screen in the world is these same four blocks.",
      fr: "Tous les écrans de trading du monde sont ces quatre mêmes blocs.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A trading terminal looks intimidating until you know it's only four things. We'll go through them one at a time, and you'll click every single control before the end.",
          fr: "Un terminal de trading paraît intimidant jusqu'à ce qu'on sache qu'il n'y a que quatre choses. On va les voir une par une, et tu auras cliqué sur chaque contrôle avant la fin.",
        },
      },
      {
        type: "steps",
        items: [
          {
            en: "**The watchlist**, top left: what you can trade, and its price.",
            fr: "**La watchlist**, en haut à gauche : ce que tu peux trader, et son prix.",
          },
          {
            en: "**The chart**: the price history of whatever you selected.",
            fr: "**Le graphique** : l'historique du prix de ce que tu as sélectionné.",
          },
          {
            en: "**The order book**: who's waiting to buy and who's waiting to sell.",
            fr: "**Le carnet d'ordres** : qui attend pour acheter et qui attend pour vendre.",
          },
          {
            en: "**The ticket**, on the right: where you actually place an order.",
            fr: "**Le ticket**, à droite : là où tu passes réellement un ordre.",
          },
        ],
      },
    ],
    goal: { kind: "read" },
    lesson: "how-tide-works",
  },
  {
    id: "what-is-trading",
    chapter: "why",
    title: { en: "What trading actually is", fr: "Le trading, concrètement" },
    key: {
      en: "You buy what you think is cheap, and sell to someone who disagrees.",
      fr: "Tu achètes ce que tu crois bon marché, et tu revends à quelqu'un qui n'est pas d'accord.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A market is a permanent negotiation. At every instant some people want to buy and some want to sell. The **price** is where those two crowds currently agree.",
          fr: "Un marché est une négociation permanente. À chaque instant, des gens veulent acheter et d'autres vendre. Le **prix** est l'endroit où ces deux foules se mettent d'accord.",
        },
      },
      {
        type: "p",
        text: {
          en: "Trading is taking a position on where that agreement moves next. Buy at 100, the crowd later agrees on 110, you sell and keep the difference. They agree on 90 instead, you lose it.",
          fr: "Trader, c'est prendre position sur le prochain déplacement de cet accord. Tu achètes à 100, la foule s'accorde plus tard sur 110, tu revends et gardes la différence. Elle s'accorde sur 90, tu la perds.",
        },
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "The part nobody says out loud", fr: "Ce que personne ne dit" },
        text: {
          en: "Someone is on the other side of every trade you make, and they think you're wrong. Being right more often than wrong is the entire job.",
          fr: "Quelqu'un est en face de chacun de tes trades, et pense que tu as tort. Avoir raison plus souvent que tort, c'est tout le métier.",
        },
      },
    ],
    goal: { kind: "read" },
    lesson: "what-is-trading",
  },

  /* ================= Chapitre 1 — Lire l'écran ================= */
  {
    id: "pick-a-market",
    chapter: "read",
    title: { en: "The watchlist", fr: "La watchlist" },
    key: {
      en: "One row per asset: its symbol, its price, nothing else.",
      fr: "Une ligne par actif : son symbole, son prix, rien d'autre.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This is the menu. Each row is an asset you can trade, with its live price. Clicking one points the whole screen at it: the chart, the order book and the ticket all follow.",
          fr: "C'est le menu. Chaque ligne est un actif que tu peux trader, avec son prix en direct. En cliquer un braque tout l'écran dessus : le graphique, le carnet et le ticket suivent.",
        },
      },
      {
        type: "callout",
        variant: "tip",
        title: { en: "No stablecoins here", fr: "Pas de stablecoins ici" },
        text: {
          en: "Assets pegged to the dollar are filtered out of this sandbox. Something that always costs $1 can't teach you a candle, a stop or a liquidation.",
          fr: "Les actifs arrimés au dollar sont filtrés de ce bac à sable. Une chose qui vaut toujours 1 $ ne peut rien t'apprendre sur une bougie, un stop ou une liquidation.",
        },
      },
    ],
    task: { en: "Click any market in the list.", fr: "Clique sur n'importe quel marché de la liste." },
    done: {
      en: "The chart, the book and the ticket now follow that market.",
      fr: "Le graphique, le carnet et le ticket suivent maintenant ce marché.",
    },
    goal: { kind: "select-market" },
    spotlight: "watchlist",
    lesson: "reading-a-chart",
  },
  {
    id: "the-price",
    chapter: "read",
    title: { en: "The last price", fr: "Le dernier prix" },
    key: {
      en: "It is not a value. It is the price of the most recent trade.",
      fr: "Ce n'est pas une valeur. C'est le prix du dernier échange.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This big number is the price at which the **last trade actually happened**. Not what the asset is worth, not what it should cost — just what two people agreed on, seconds ago.",
          fr: "Ce gros chiffre est le prix auquel le **dernier échange a réellement eu lieu**. Pas ce que vaut l'actif, pas ce qu'il devrait coûter : juste ce sur quoi deux personnes se sont mises d'accord, il y a quelques secondes.",
        },
      },
      {
        type: "p",
        text: {
          en: "Watch it for a few seconds. It moves on its own, because the negotiation never stops. That's the thing you're taking a position on.",
          fr: "Regarde-le quelques secondes. Il bouge tout seul, parce que la négociation ne s'arrête jamais. C'est ça, la chose sur laquelle tu prends position.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "chart.price",
    lesson: "reading-a-chart",
  },
  {
    id: "candles",
    chapter: "read",
    title: { en: "Line or candles", fr: "Ligne ou bougies" },
    key: {
      en: "A candle packs a whole hour into one shape.",
      fr: "Une bougie compresse une heure entière en une seule forme.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "The line shows one number per hour: the closing price. A **candle** shows four, and that's why traders use them. The **body** runs from the opening price to the closing price. The thin **wicks** show how far the price travelled before coming back.",
          fr: "La ligne montre un chiffre par heure : le prix de clôture. Une **bougie** en montre quatre, et c'est pour ça que les traders les utilisent. Le **corps** va de l'ouverture à la clôture. Les **mèches** fines montrent jusqu'où le prix est allé avant de revenir.",
        },
      },
      {
        type: "example",
        title: { en: "A green candle, decoded", fr: "Une bougie verte, décodée" },
        rows: [
          { k: { en: "Opened at", fr: "Ouverture" }, v: { en: "$100", fr: "100 $" } },
          { k: { en: "Dropped to", fr: "Descendue à" }, v: { en: "$97 — lower wick", fr: "97 $ — mèche basse" } },
          { k: { en: "Rose to", fr: "Montée à" }, v: { en: "$106 — upper wick", fr: "106 $ — mèche haute" } },
          { k: { en: "Closed at", fr: "Clôture" }, v: { en: "$104 — above open, so green", fr: "104 $ — au-dessus, donc verte" } },
        ],
      },
      {
        type: "p",
        text: {
          en: "A long lower wick means buyers stepped in hard after a drop. A long upper wick means sellers pushed back. That's the whole vocabulary for now.",
          fr: "Une longue mèche basse veut dire que les acheteurs sont intervenus fort après une baisse. Une longue mèche haute, que les vendeurs ont repoussé. C'est tout le vocabulaire pour l'instant.",
        },
      },
    ],
    task: { en: "Switch the chart to candles.", fr: "Bascule le graphique en bougies." },
    done: { en: "Each bar is now one hour, summarised.", fr: "Chaque barre est maintenant une heure, résumée." },
    goal: { kind: "chart-mode", value: "candles" },
    spotlight: "chart.mode",
    lesson: "reading-a-chart",
    preset: { chartMode: "line" },
  },
  {
    id: "the-book",
    chapter: "read",
    title: { en: "The order book", fr: "Le carnet d'ordres" },
    key: {
      en: "Red are sellers, green are buyers. They haven't agreed yet.",
      fr: "Rouge = vendeurs, vert = acheteurs. Ils ne sont pas encore d'accord.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Everyone waiting to trade is listed here. The red rows are people willing to **sell** and the price they want. The green rows are people willing to **buy**. They're sorted towards the middle, where the two sides get closest.",
          fr: "Tous ceux qui attendent pour échanger sont listés ici. Les lignes rouges sont ceux qui veulent **vendre**, et à quel prix. Les vertes sont ceux qui veulent **acheter**. Ils sont triés vers le milieu, là où les deux camps se rapprochent le plus.",
        },
      },
      {
        type: "p",
        text: {
          en: "The gap in the middle is the **spread**. It's the distance between the cheapest seller and the most generous buyer, and it is a real cost: buy instantly and sell instantly, and you pay it twice.",
          fr: "L'écart au milieu est le **spread**. C'est la distance entre le vendeur le moins cher et l'acheteur le plus généreux, et c'est un coût réel : achète et revends instantanément, et tu le paies deux fois.",
        },
      },
      {
        type: "callout",
        variant: "tip",
        title: { en: "A quick liquidity check", fr: "Un test de liquidité rapide" },
        text: {
          en: "A tight spread means a busy, liquid market. A wide one means few participants — and getting out may cost you more than getting in.",
          fr: "Un spread serré signale un marché actif et liquide. Un spread large signale peu de participants — et en sortir peut te coûter plus cher que d'y entrer.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "book",
    lesson: "order-book-spread",
  },

  /* ================= Chapitre 2 — Ton premier ordre ================= */
  {
    id: "the-ticket",
    chapter: "orders",
    title: { en: "The ticket", fr: "Le ticket" },
    key: {
      en: "Every control here answers one question about your order.",
      fr: "Chaque contrôle ici répond à une question sur ton ordre.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This is where an order is built. It looks dense, but each control answers exactly one question, and we're going to take them in order, top to bottom.",
          fr: "C'est ici qu'un ordre se construit. Ça paraît dense, mais chaque contrôle répond à exactement une question, et on va les prendre dans l'ordre, de haut en bas.",
        },
      },
      {
        type: "list",
        items: [
          { en: "**What** am I trading? Spot or perp.", fr: "**Quoi** ? Spot ou perp." },
          { en: "**How** do I want it filled? Market or limit.", fr: "**Comment** ? Market ou limit." },
          { en: "**Which direction**? Buy or sell.", fr: "**Dans quel sens** ? Acheter ou vendre." },
          { en: "**How much**? The amount.", fr: "**Combien** ? Le montant." },
          { en: "**When do I get out**? Take-profit and stop-loss.", fr: "**Quand je sors** ? Take-profit et stop-loss." },
        ],
      },
    ],
    goal: { kind: "read" },
    spotlight: "ticket",
    lesson: "order-types",
  },
  {
    id: "product",
    chapter: "orders",
    title: { en: "Spot or perp", fr: "Spot ou perp" },
    key: {
      en: "Spot: you own it. Perp: you bet on it.",
      fr: "Spot : tu le possèdes. Perp : tu paries dessus.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "**SPOT** means you buy the actual asset. Buy $200 of bitcoin and you own $200 of bitcoin. Simple, and impossible to lose more than you put in.",
          fr: "**SPOT** veut dire que tu achètes l'actif lui-même. Achète 200 $ de bitcoin et tu possèdes 200 $ de bitcoin. Simple, et impossible de perdre plus que ta mise.",
        },
      },
      {
        type: "p",
        text: {
          en: "**PERP** is a contract that tracks the price without you ever owning anything. It unlocks betting on a fall, and leverage. We'll spend a whole chapter on it later. For now, stay on SPOT.",
          fr: "**PERP** est un contrat qui suit le prix sans que tu possèdes jamais rien. Il débloque le pari à la baisse, et le levier. On y consacrera tout un chapitre. Pour l'instant, reste sur SPOT.",
        },
      },
    ],
    task: { en: "Make sure SPOT is selected.", fr: "Vérifie que SPOT est sélectionné." },
    done: { en: "Good. You'll own what you buy.", fr: "Bien. Tu posséderas ce que tu achètes." },
    goal: { kind: "select-product", value: "spot" },
    spotlight: "ticket.product",
    lesson: "what-is-a-perpetual",
    preset: { product: "perp" },
  },
  {
    id: "limit-order",
    chapter: "orders",
    title: { en: "Limit: you name the price", fr: "Limit : tu fixes le prix" },
    key: {
      en: "You control the price. You don't control whether it fills.",
      fr: "Tu contrôles le prix. Tu ne contrôles pas si ça s'exécute.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A **limit** order says: *I'll buy, but only at this price or better.* You get total control over the price. What you give up is certainty — the market may never come to you.",
          fr: "Un ordre **limit** dit : *j'achète, mais seulement à ce prix ou mieux*. Tu obtiens le contrôle total du prix. Ce que tu abandonnes, c'est la certitude : le marché peut ne jamais venir jusqu'à toi.",
        },
      },
      {
        type: "p",
        text: {
          en: "It's the patient option: you have a level in mind and no reason to rush.",
          fr: "C'est l'option patiente : tu as un niveau en tête et aucune raison de te presser.",
        },
      },
    ],
    task: { en: "Switch the order type to LIMIT.", fr: "Bascule le type d'ordre sur LIMIT." },
    done: { en: "A price field just appeared below.", fr: "Un champ de prix vient d'apparaître en dessous." },
    goal: { kind: "select-order-kind", value: "limit" },
    spotlight: "ticket.orderKind",
    lesson: "order-types",
  },
  {
    id: "limit-price",
    chapter: "orders",
    title: { en: "The limit price field", fr: "Le champ prix limite" },
    key: {
      en: "This is the price you're waiting for, not the price now.",
      fr: "C'est le prix que tu attends, pas le prix actuel.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This field only exists in LIMIT mode, because it's the whole point of a limit order. Leave it empty and it defaults to the current price; type a lower number and you're saying *wait for a dip*.",
          fr: "Ce champ n'existe qu'en mode LIMIT, parce que c'est tout l'intérêt d'un ordre limit. Laisse-le vide et il prend le prix courant ; tape un chiffre plus bas et tu dis *attends une baisse*.",
        },
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "The trap", fr: "Le piège" },
        text: {
          en: "Set it too far and the trade you were sure about happens without you. Patience has a cost, and it's the moves you miss.",
          fr: "Mets-le trop loin et le trade dont tu étais sûr se fait sans toi. La patience a un coût : les mouvements que tu rates.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "ticket.limit",
    lesson: "order-types",
    preset: { orderKind: "limit" },
  },
  {
    id: "market-order",
    chapter: "orders",
    title: { en: "Market: you choose speed", fr: "Market : tu choisis la vitesse" },
    key: {
      en: "Guaranteed fill, uncertain price. The opposite trade-off.",
      fr: "Exécution garantie, prix incertain. Le compromis inverse.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A **market** order takes whatever the book is offering right now. You're guaranteed to be filled; you're not guaranteed the price you saw a second ago. That gap has a name: **slippage**.",
          fr: "Un ordre **market** prend ce que le carnet offre à l'instant. Tu es certain d'être exécuté ; tu n'es pas certain d'obtenir le prix vu une seconde plus tôt. Cet écart a un nom : le **slippage**.",
        },
      },
      {
        type: "p",
        text: {
          en: "Most first trades are market orders, and that's fine. Just know you're paying for the convenience.",
          fr: "La plupart des premiers ordres sont des market, et c'est très bien. Sache juste que tu paies pour cette facilité.",
        },
      },
    ],
    task: { en: "Switch back to MARKET.", fr: "Reviens sur MARKET." },
    done: { en: "Your order will now fill immediately.", fr: "Ton ordre s'exécutera maintenant immédiatement." },
    goal: { kind: "select-order-kind", value: "market" },
    spotlight: "ticket.orderKind",
    lesson: "order-types",
  },
  {
    id: "execution",
    chapter: "orders",
    title: { en: "Taker or maker", fr: "Taker ou maker" },
    key: {
      en: "Crossing the spread costs three times more than waiting.",
      fr: "Traverser le spread coûte trois fois plus cher qu'attendre.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This is the control almost nobody explains, and it's pure money. A **taker** crosses the spread and removes liquidity from the book. A **maker** posts an order and waits for someone to come to them, adding liquidity.",
          fr: "C'est le contrôle que presque personne n'explique, et c'est de l'argent pur. Un **taker** traverse le spread et retire de la liquidité au carnet. Un **maker** pose son ordre et attend qu'on vienne à lui, ajoutant de la liquidité.",
        },
      },
      {
        type: "example",
        title: { en: "The fee difference on Tide", fr: "L'écart de frais sur Tide" },
        rows: [
          { k: { en: "Maker — you wait", fr: "Maker — tu attends" }, v: { en: "0.02 %", fr: "0,02 %" } },
          { k: { en: "Taker — you cross", fr: "Taker — tu traverses" }, v: { en: "0.06 %", fr: "0,06 %" } },
          { k: { en: "On a $10,000 position", fr: "Sur une position de 10 000 $" }, v: { en: "$2 versus $6", fr: "2 $ contre 6 $" } },
        ],
      },
      {
        type: "p",
        text: {
          en: "Small on one trade. Not small over a hundred. Switch between them and watch the *Est. fees* line in the summary change.",
          fr: "Négligeable sur un trade. Pas sur cent. Bascule de l'un à l'autre et regarde la ligne *Frais estimés* du résumé changer.",
        },
      },
    ],
    task: { en: "Select MAKER, then come back to TAKER.", fr: "Sélectionne MAKER, puis reviens sur TAKER." },
    done: { en: "You saw the fee move. That's the whole lesson.", fr: "Tu as vu les frais bouger. C'est toute la leçon." },
    goal: { kind: "select-execution", value: "taker" },
    spotlight: "ticket.execution",
    lesson: "order-book-spread",
  },
  {
    id: "side",
    chapter: "orders",
    title: { en: "Buy or sell", fr: "Acheter ou vendre" },
    key: {
      en: "The only two directions there are.",
      fr: "Les deux seules directions qui existent.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Green buys, red sells. In spot, buying means acquiring the asset and hoping it rises. That's the whole decision, and it's the one everything else in this panel is describing.",
          fr: "Le vert achète, le rouge vend. En spot, acheter veut dire acquérir l'actif en espérant qu'il monte. C'est toute la décision, et c'est elle que tout le reste du panneau décrit.",
        },
      },
      {
        type: "callout",
        variant: "tip",
        title: { en: "Colour is a convention", fr: "La couleur est une convention" },
        text: {
          en: "Green up, red down is universal in trading. Tide keeps mint for gains and coral for losses everywhere, so the colours mean the same thing on every screen.",
          fr: "Vert pour la hausse, rouge pour la baisse : c'est universel en trading. Tide garde la menthe pour les gains et le corail pour les pertes partout, pour que les couleurs disent la même chose sur tous les écrans.",
        },
      },
    ],
    task: { en: "Select Buy / Long.", fr: "Sélectionne Acheter / Long." },
    done: { en: "You're set up to profit from a rise.", fr: "Tu es positionné pour gagner à la hausse." },
    goal: { kind: "select-side", value: "buy" },
    spotlight: "ticket.side",
    lesson: "long-and-short",
  },
  {
    id: "amount",
    chapter: "orders",
    title: { en: "The amount", fr: "Le montant" },
    key: {
      en: "Size decides what a 1 % move is worth to you.",
      fr: "La taille décide de ce que vaut un mouvement de 1 % pour toi.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "You have **$10,000** of fake money, shown as *Available*. The amount you type is what you commit to this one trade.",
          fr: "Tu as **10 000 $** d'argent fictif, affichés en *Disponible*. Le montant que tu saisis est ce que tu engages sur ce seul trade.",
        },
      },
      {
        type: "example",
        title: { en: "Same call, different consequence", fr: "Même analyse, conséquence différente" },
        rows: [
          { k: { en: "1 % move on $200", fr: "1 % de mouvement sur 200 $" }, v: { en: "$2", fr: "2 $" } },
          { k: { en: "1 % move on $2,000", fr: "1 % de mouvement sur 2 000 $" }, v: { en: "$20", fr: "20 $" } },
          { k: { en: "1 % move on $9,000", fr: "1 % de mouvement sur 9 000 $" }, v: { en: "$90", fr: "90 $" } },
        ],
      },
    ],
    task: { en: "Type an amount of at least $200.", fr: "Saisis un montant d'au moins 200 $." },
    done: { en: "The summary below now has numbers in it.", fr: "Le résumé en dessous contient maintenant des chiffres." },
    goal: { kind: "set-amount", min: 200 },
    spotlight: "ticket.amount",
    lesson: "risk-management-101",
  },
  {
    id: "percent-buttons",
    chapter: "orders",
    title: { en: "The % shortcuts", fr: "Les raccourcis %" },
    key: {
      en: "A fast way to size, and a fast way to over-commit.",
      fr: "Un moyen rapide de dimensionner, et de trop s'engager.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "These four buttons fill the amount with a share of what's available. **100 %** puts your entire balance into one trade.",
          fr: "Ces quatre boutons remplissent le montant avec une part du disponible. **100 %** met tout ton solde sur un seul trade.",
        },
      },
      {
        type: "callout",
        variant: "warn",
        title: { en: "Convenient, and dangerous", fr: "Pratique, et dangereux" },
        text: {
          en: "They make sizing effortless, which is exactly the problem: they invite you to pick a size because it's one click, instead of because the risk says so. Chapter four fixes that.",
          fr: "Ils rendent le dimensionnement trop facile, et c'est précisément le problème : ils invitent à choisir une taille parce que c'est un clic, au lieu de parce que le risque le dit. Le chapitre quatre corrige ça.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "ticket.pcts",
    lesson: "risk-management-101",
  },
  {
    id: "summary",
    chapter: "orders",
    title: { en: "Read the summary", fr: "Lis le résumé" },
    key: {
      en: "Four lines that tell you what you're about to do.",
      fr: "Quatre lignes qui te disent ce que tu t'apprêtes à faire.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Never send an order without reading this. It's the difference between a decision and a reflex.",
          fr: "N'envoie jamais un ordre sans lire ça. C'est la différence entre une décision et un réflexe.",
        },
      },
      {
        type: "list",
        items: [
          {
            en: "**Position size** — your total exposure. In spot it equals your amount.",
            fr: "**Taille de position** — ton exposition totale. En spot, elle égale ton montant.",
          },
          {
            en: "**Margin** — the money you actually commit.",
            fr: "**Marge** — l'argent que tu engages réellement.",
          },
          {
            en: "**Est. fees** — what the trade costs you before it even moves.",
            fr: "**Frais estimés** — ce que le trade te coûte avant même de bouger.",
          },
          {
            en: "**Liquidation** — empty in spot. It fills in with leverage, and then it matters enormously.",
            fr: "**Liquidation** — vide en spot. Elle se remplit avec le levier, et là elle compte énormément.",
          },
          {
            en: "**Risk at stop** — what you lose if your stop is hit. The most useful line on the screen.",
            fr: "**Risque au stop** — ce que tu perds si ton stop est touché. La ligne la plus utile de l'écran.",
          },
        ],
      },
    ],
    goal: { kind: "read" },
    spotlight: "ticket.summary",
    lesson: "order-types",
  },
  {
    id: "first-buy",
    chapter: "orders",
    title: { en: "Send it", fr: "Envoie" },
    key: {
      en: "One click turns a plan into a position.",
      fr: "Un clic transforme un plan en position.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Time to press the button. Your order fills against the book, you pay the taker fee, and the result appears in the blotter on the left.",
          fr: "Il est temps d'appuyer. Ton ordre s'exécute contre le carnet, tu paies les frais taker, et le résultat apparaît dans le blotter à gauche.",
        },
      },
      {
        type: "p",
        text: {
          en: "Compare the fill price with the price displayed just before you clicked. They're rarely identical, and now you know why.",
          fr: "Compare le prix obtenu avec celui affiché juste avant ton clic. Ils sont rarement identiques, et tu sais maintenant pourquoi.",
        },
      },
    ],
    task: { en: "Place the order.", fr: "Passe l'ordre." },
    done: { en: "You have a position. It's alive now.", fr: "Tu as une position. Elle est vivante maintenant." },
    goal: { kind: "place-order", product: "spot" },
    spotlight: "ticket.place",
    lesson: "how-tide-works",
    preset: { product: "spot", orderKind: "market", side: "buy" },
  },
  {
    id: "blotter",
    chapter: "orders",
    title: { en: "Your open position", fr: "Ta position ouverte" },
    key: {
      en: "The number on the right moves every second. That's real.",
      fr: "Le chiffre de droite bouge chaque seconde. Ça, c'est réel.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "The blotter lists what you currently hold: the market, the direction, your entry price, and your **unrealised profit or loss** — green above your entry, coral below.",
          fr: "Le blotter liste ce que tu détiens : le marché, la direction, ton prix d'entrée, et ton **gain ou perte latent** — vert au-dessus de ton entrée, corail en dessous.",
        },
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "Unrealised means nothing yet", fr: "Latent veut dire : rien encore" },
        text: {
          en: "That number is what you *would* get if you closed right now. Until you close, it isn't yours. Watching it is how most beginners lose their discipline.",
          fr: "Ce chiffre est ce que tu obtiendrais *si* tu fermais maintenant. Tant que tu n'as pas fermé, il n'est pas à toi. Le regarder est la façon dont la plupart des débutants perdent leur discipline.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "blotter",
    lesson: "trading-psychology",
  },
  {
    id: "equity",
    chapter: "orders",
    title: { en: "Your equity", fr: "Ton équité" },
    key: {
      en: "Cash plus what your open positions are worth right now.",
      fr: "Le cash plus ce que valent tes positions ouvertes à l'instant.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This is the single number that says how you're doing. It started at $10,000. It's now that, minus fees, plus or minus whatever your position is currently worth.",
          fr: "C'est le seul chiffre qui dit où tu en es. Il a démarré à 10 000 $. Il vaut maintenant ça, moins les frais, plus ou moins ce que vaut ta position à l'instant.",
        },
      },
      {
        type: "p",
        text: {
          en: "On the real Tide terminal, this is exactly what the leaderboard ranks. Not your best trade — your equity.",
          fr: "Sur le vrai terminal Tide, c'est exactement ce que le classement compare. Pas ton meilleur trade : ton équité.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "blotter.equity",
    lesson: "how-tide-works",
  },
  {
    id: "close",
    chapter: "orders",
    title: { en: "Close it", fr: "Ferme-la" },
    key: {
      en: "Closing is what turns a paper gain into a real one.",
      fr: "Fermer est ce qui transforme un gain sur le papier en gain réel.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Closing sells what you bought and settles the result into your balance. You pay a fee again — every round trip costs two.",
          fr: "Fermer revend ce que tu as acheté et règle le résultat dans ton solde. Tu paies à nouveau des frais : chaque aller-retour en coûte deux.",
        },
      },
      {
        type: "p",
        text: {
          en: "Do it now, whatever the position is worth. Getting comfortable closing is more important than closing at the right moment.",
          fr: "Fais-le maintenant, quel que soit l'état de la position. Être à l'aise pour fermer compte plus que fermer au bon moment.",
        },
      },
    ],
    task: { en: "Close your position.", fr: "Ferme ta position." },
    done: { en: "Settled. That's one complete round trip.", fr: "Réglé. Voilà un aller-retour complet." },
    goal: { kind: "close-position" },
    spotlight: "blotter.close",
    lesson: "take-profit-stop-loss",
  },

  /* ================= Chapitre 3 — Perps & levier ================= */
  {
    id: "what-is-a-perp",
    chapter: "perps",
    title: { en: "What a perpetual is", fr: "Ce qu'est un perpétuel" },
    key: {
      en: "A bet on the price. You never own it, and it never expires.",
      fr: "Un pari sur le prix. Tu ne le possèdes jamais, et ça n'expire jamais.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Everything so far was spot: you bought the thing, you owned the thing. A **perpetual** is different. You own nothing. You hold a contract whose value tracks the price, for as long as you like.",
          fr: "Tout ce qui précède était du spot : tu achètes la chose, tu possèdes la chose. Un **perpétuel**, c'est différent. Tu ne possèdes rien. Tu tiens un contrat dont la valeur suit le prix, aussi longtemps que tu veux.",
        },
      },
      {
        type: "list",
        items: [
          {
            en: "**No expiry.** Traditional futures settle on a date. Perps don't.",
            fr: "**Pas d'échéance.** Les futures classiques se règlent à une date. Les perps, non.",
          },
          {
            en: "**You can bet on a fall.** In spot you only profit when the price rises.",
            fr: "**Tu peux parier sur la baisse.** En spot, tu ne gagnes que si le prix monte.",
          },
          {
            en: "**You can use leverage.** This is what hurts people, and the next three steps are about exactly that.",
            fr: "**Tu peux utiliser du levier.** C'est ce qui fait mal, et les trois étapes suivantes y sont consacrées.",
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
    task: { en: "Switch the product to PERP.", fr: "Bascule le produit sur PERP." },
    done: { en: "A leverage slider appeared. Don't touch it yet.", fr: "Un curseur de levier est apparu. N'y touche pas encore." },
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
          en: "Going **long** is what you already did. Going **short** is the mirror image: you profit if the price goes down. Same buttons, opposite direction.",
          fr: "Être **long**, c'est ce que tu viens de faire. Être **short**, c'est l'image miroir : tu gagnes si le prix baisse. Mêmes boutons, direction opposée.",
        },
      },
      {
        type: "example",
        title: { en: "One formula, both directions", fr: "Une formule, les deux sens" },
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
          en: "A price can only fall to zero, so a long's loss is capped. A price can rise forever, so a short's is not. Shorts demand tighter discipline.",
          fr: "Un prix ne peut baisser que jusqu'à zéro : la perte d'un long est plafonnée. Un prix peut monter indéfiniment : celle d'un short ne l'est pas. Le short demande plus de discipline.",
        },
      },
    ],
    task: { en: "Select Sell / Short.", fr: "Sélectionne Vendre / Short." },
    done: { en: "You're now set up to profit from a fall.", fr: "Tu es maintenant positionné pour gagner à la baisse." },
    goal: { kind: "select-side", value: "sell" },
    spotlight: "ticket.side",
    lesson: "long-and-short",
    preset: { product: "perp" },
  },
  {
    id: "leverage",
    chapter: "perps",
    title: { en: "Leverage multiplies exposure", fr: "Le levier multiplie l'exposition" },
    key: {
      en: "10x is not ten times your money. It's ten times your exposure.",
      fr: "10x n'est pas dix fois ton argent. C'est dix fois ton exposition.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "This is the most misunderstood control on any trading screen. Leverage does **not** give you more money. It lets a small amount of your money control a much larger position.",
          fr: "C'est le contrôle le plus mal compris de tous les écrans de trading. Le levier ne te donne **pas** plus d'argent. Il permet à une petite somme de contrôler une position beaucoup plus grande.",
        },
      },
      {
        type: "example",
        title: { en: "$100 at 10x", fr: "100 $ à 10x" },
        rows: [
          { k: { en: "Your money — the margin", fr: "Ton argent — la marge" }, v: { en: "$100", fr: "100 $" } },
          { k: { en: "Position size", fr: "Taille de position" }, v: { en: "$1,000", fr: "1 000 $" } },
          { k: { en: "Price +1 %", fr: "Prix +1 %" }, v: { en: "+$10 → +10 % of your money", fr: "+10 $ → +10 % de ton argent" } },
          { k: { en: "Price −1 %", fr: "Prix −1 %" }, v: { en: "−$10 → −10 % of your money", fr: "−10 $ → −10 % de ton argent" } },
        ],
      },
      {
        type: "p",
        text: {
          en: "Drag the slider and watch **Position size** grow in the summary while **Margin** doesn't move a cent. That's the entire mechanism, in one gesture.",
          fr: "Fais glisser le curseur et regarde la **Taille de position** grossir dans le résumé pendant que la **Marge** ne bouge pas d'un centime. C'est tout le mécanisme, en un geste.",
        },
      },
    ],
    task: { en: "Set leverage to 5x or more.", fr: "Mets le levier à 5x ou plus." },
    done: { en: "Your exposure grew. Your money didn't.", fr: "Ton exposition a grandi. Ton argent, non." },
    goal: { kind: "set-leverage", min: 5 },
    spotlight: "ticket.leverage",
    lesson: "leverage-and-margin",
    preset: { product: "perp" },
  },
  {
    id: "liquidation",
    chapter: "perps",
    title: { en: "The liquidation price", fr: "Le prix de liquidation" },
    key: {
      en: "At 20x, a 5 % move against you erases everything you committed.",
      fr: "À 20x, 5 % de mouvement contre toi efface tout ce que tu as engagé.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "Leverage is borrowed exposure, and the lender wants their capital back. The instant your margin is fully eaten by losses, the position is closed for you. That price is the **liquidation price**, and it's now filled in below.",
          fr: "Le levier est une exposition empruntée, et le prêteur veut récupérer son capital. À l'instant où ta marge est entièrement mangée par les pertes, la position est fermée à ta place. Ce prix est le **prix de liquidation**, et il est maintenant renseigné en dessous.",
        },
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "It's drawn for you", fr: "Il est tracé pour toi" },
        text: {
          en: "Once the position is open, that level appears as an amber line on the chart. You can see exactly how much room you have.",
          fr: "Dès que la position est ouverte, ce niveau apparaît en ambre sur le graphique. Tu vois exactement la marge qu'il te reste.",
        },
      },
    ],
    goal: { kind: "read" },
    spotlight: "ticket.summary",
    lesson: "leverage-and-margin",
    preset: { product: "perp" },
  },
  {
    id: "liquidation-room",
    chapter: "perps",
    title: { en: "How much room you get", fr: "La marge d'erreur qui te reste" },
    key: {
      en: "2x forgives 50 %. 20x forgives 5 %.",
      fr: "2x pardonne 50 %. 20x pardonne 5 %.",
    },
    blocks: [
      {
        type: "example",
        title: { en: "Distance to liquidation", fr: "Distance à la liquidation" },
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
        title: { en: "Read that table twice", fr: "Relis ce tableau deux fois" },
        text: {
          en: "High leverage doesn't make you more likely to be right. It makes you far more likely to be closed out before you get the chance to be right.",
          fr: "Un levier élevé ne te donne pas plus de chances d'avoir raison. Il te donne beaucoup plus de chances d'être fermé avant d'avoir eu l'occasion d'avoir raison.",
        },
      },
    ],
    task: { en: "Push leverage to 10x.", fr: "Pousse le levier à 10x." },
    done: { en: "That's how little room you have left.", fr: "Voilà la marge d'erreur qu'il te reste." },
    goal: { kind: "set-leverage", min: 10 },
    spotlight: "ticket.leverage",
    lesson: "leverage-and-margin",
    preset: { product: "perp" },
  },
  {
    id: "funding",
    chapter: "perps",
    title: { en: "Funding: the rent you pay", fr: "Le funding : le loyer que tu paies" },
    key: {
      en: "No expiry means a small fee keeps the contract glued to reality.",
      fr: "Pas d'échéance : un petit paiement garde le contrat collé au réel.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "If a contract never expires, what stops its price drifting away from the actual asset? A recurring payment called **funding**. When more traders are long than short, longs pay shorts. When the crowd flips, so does the payment.",
          fr: "Si un contrat n'expire jamais, qu'est-ce qui empêche son prix de dériver loin de l'actif réel ? Un paiement récurrent appelé **funding**. Quand il y a plus de longs que de shorts, les longs paient les shorts. Quand la foule bascule, le paiement bascule.",
        },
      },
      {
        type: "p",
        text: {
          en: "Tiny per payment, charged every few hours. Holding a leveraged position for weeks costs real money even if the price never moves.",
          fr: "Minuscule à chaque fois, prélevé toutes les quelques heures. Garder une position à levier pendant des semaines coûte de l'argent même si le prix ne bouge jamais.",
        },
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "Not simulated here", fr: "Pas simulé ici" },
        text: {
          en: "This sandbox doesn't charge funding — it would be invisible over fifteen minutes. Know it exists, and that it punishes positions held too long.",
          fr: "Ce bac à sable ne prélève pas de funding : il serait invisible sur quinze minutes. Sache qu'il existe, et qu'il punit les positions gardées trop longtemps.",
        },
      },
    ],
    goal: { kind: "read" },
    lesson: "what-is-a-perpetual",
  },

  /* ================= Chapitre 4 — Rester en vie ================= */
  {
    id: "stop-loss",
    chapter: "risk",
    title: { en: "Decide your exit first", fr: "Décide ta sortie d'abord" },
    key: {
      en: "A stop is a decision you make while you're still calm.",
      fr: "Un stop est une décision prise pendant que tu es encore calme.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "A **stop-loss** closes your position automatically if the price reaches a level you picked in advance. Its real purpose isn't mathematical, it's psychological: it makes the decision before you're emotionally invested in being right.",
          fr: "Un **stop-loss** ferme ta position automatiquement si le prix atteint un niveau choisi à l'avance. Son vrai but n'est pas mathématique mais psychologique : il décide avant que tu ne sois émotionnellement investi dans le fait d'avoir raison.",
        },
      },
      {
        type: "p",
        text: {
          en: "Type a price below the current one for a long. Once set, it's drawn on the chart as a coral line, so you can see your own plan.",
          fr: "Saisis un prix sous le prix courant pour un long. Une fois posé, il est tracé sur le graphique en corail : tu vois ton propre plan.",
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
    task: { en: "Set a stop-loss price.", fr: "Pose un prix de stop-loss." },
    done: { en: "Your worst case is now a number you chose.", fr: "Ton pire scénario est un chiffre que tu as choisi." },
    goal: { kind: "set-stop-loss" },
    spotlight: "ticket.sl",
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
          en: "A **take-profit** does the same in the other direction: it closes the position once you've made what you came for. It protects you from the other classic mistake — watching a gain evaporate because you got greedy.",
          fr: "Un **take-profit** fait la même chose dans l'autre sens : il ferme la position une fois que tu as obtenu ce que tu venais chercher. Il te protège de l'autre erreur classique : regarder un gain s'évaporer par avidité.",
        },
      },
      {
        type: "example",
        title: { en: "Why the ratio decides everything", fr: "Pourquoi le ratio décide de tout" },
        rows: [
          { k: { en: "Target $30, stop $30", fr: "Cible 30 $, stop 30 $" }, v: { en: "right >50 % of the time just to break even", fr: "raison >50 % du temps rien que pour l'équilibre" } },
          { k: { en: "Target $60, stop $30", fr: "Cible 60 $, stop 30 $" }, v: { en: "wrong most of the time and still ahead", fr: "tort la plupart du temps et gagnant quand même" } },
        ],
      },
    ],
    task: { en: "Set a take-profit price.", fr: "Pose un prix de take-profit." },
    done: { en: "Both exits are planned. The trade runs itself now.", fr: "Les deux sorties sont planifiées. Le trade se gère seul." },
    goal: { kind: "set-take-profit" },
    spotlight: "ticket.tp",
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
          en: "You don't pick a position size because it feels right. You work backwards from the loss you're willing to take.",
          fr: "Tu ne choisis pas une taille au feeling. Tu pars de la perte que tu acceptes, et tu remontes.",
        },
      },
      {
        type: "steps",
        items: [
          { en: "Decide the most you'll lose: 1 % of $10,000 is **$100**.", fr: "Décide ta perte maximale : 1 % de 10 000 $, soit **100 $**." },
          { en: "Decide where your idea is wrong. That's your stop.", fr: "Décide où ton idée est invalidée. C'est ton stop." },
          { en: "Size the position so hitting the stop costs exactly that, no more.", fr: "Dimensionne pour que toucher le stop coûte exactement ça, pas plus." },
        ],
      },
    ],
    goal: { kind: "read" },
    spotlight: "ticket.summary",
    lesson: "risk-management-101",
  },
  {
    id: "risk-budget",
    chapter: "risk",
    title: { en: "Size it for real", fr: "Dimensionne pour de vrai" },
    key: {
      en: "One line does the arithmetic. Get it under 1 %.",
      fr: "Une ligne fait le calcul. Passe sous 1 %.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "The **Risk at stop** line shows, live, what hitting your stop would cost — in dollars and as a share of your equity. Lower the amount, move the stop closer, or both. It turns green under 1 %.",
          fr: "La ligne **Risque au stop** montre en direct ce que coûterait un stop touché — en dollars et en part de ton équité. Baisse le montant, rapproche le stop, ou les deux. Elle passe au vert sous 1 %.",
        },
      },
      {
        type: "callout",
        variant: "tip",
        title: { en: "Why 1 %", fr: "Pourquoi 1 %" },
        text: {
          en: "At 1 % per trade you can be wrong ten times in a row and keep 90 % of your account. At 20 %, five mistakes and there's nothing left to trade with.",
          fr: "À 1 % par trade, tu peux te tromper dix fois d'affilée et garder 90 % de ton compte. À 20 %, cinq erreurs et il ne reste plus rien pour trader.",
        },
      },
    ],
    task: { en: "Get Risk at stop under 1 % of your equity.", fr: "Fais passer le risque au stop sous 1 % de ton équité." },
    done: { en: "That's a professionally sized position.", fr: "Voilà une position dimensionnée proprement." },
    goal: { kind: "risk-budget", maxRiskPct: 1 },
    spotlight: "ticket.summary",
    lesson: "risk-management-101",
  },
  {
    id: "run-the-plan",
    chapter: "risk",
    title: { en: "Run the whole plan", fr: "Déroule le plan entier" },
    key: {
      en: "Entry, stop, target, size. All decided before the click.",
      fr: "Entrée, stop, cible, taille. Tout décidé avant le clic.",
    },
    blocks: [
      {
        type: "p",
        text: {
          en: "You know every piece now. Put them together: a correctly sized position with both exits set, sent as one decision. Then use **fast-forward** to watch an hour of market pass in two seconds and see your plan run without you.",
          fr: "Tu connais toutes les pièces. Assemble-les : une position correctement dimensionnée, les deux sorties posées, envoyée comme une seule décision. Puis utilise **accélérer** pour voir une heure de marché défiler en deux secondes et regarder ton plan se dérouler sans toi.",
        },
      },
      {
        type: "callout",
        variant: "info",
        title: { en: "Fast-forward is a teaching tool", fr: "L'accélération est un outil pédagogique" },
        text: {
          en: "It compresses time so you can actually see a stop or a target trigger. Real markets take hours to do this, which is why beginners never watch their own plan complete.",
          fr: "Elle compresse le temps pour que tu voies un stop ou une cible se déclencher pour de vrai. Les vrais marchés mettent des heures, et c'est pour ça que les débutants ne voient jamais leur plan aller au bout.",
        },
      },
    ],
    task: { en: "Place the order, then hit fast-forward.", fr: "Passe l'ordre, puis lance l'accélération." },
    done: { en: "You just ran a complete trade, start to finish.", fr: "Tu viens de dérouler un trade complet, du début à la fin." },
    goal: { kind: "accelerate" },
    spotlight: "accelerate",
    lesson: "trading-psychology",
  },

  /* ================= Chapitre 5 — La suite ================= */
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
          en: "Every control you just used exists in the real Tide terminal, in the same place, with the same name. The difference is that your positions persist, your performance is ranked against everyone else, and you can enter competitions.",
          fr: "Chaque contrôle que tu viens d'utiliser existe dans le vrai terminal Tide, au même endroit, avec le même nom. La différence : tes positions persistent, ta performance est classée face aux autres, et tu peux entrer en compétition.",
        },
      },
      {
        type: "list",
        items: [
          { en: "Still **no real money** in Paper mode. That doesn't change.", fr: "Toujours **aucun argent réel** en mode Paper. Ça ne change pas." },
          { en: "The **?** beside any control opens the lesson that explains it.", fr: "Le **?** à côté de chaque contrôle ouvre la leçon qui l'explique." },
          { en: "Sixteen lessons go deeper than this could: strategies, psychology, on-chain track records.", fr: "Seize leçons vont plus loin que ceci ne pouvait : stratégies, psychologie, historique on-chain." },
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: { en: "One habit worth keeping", fr: "Une habitude à garder" },
        text: {
          en: "Before every click: where's my stop, what's my size, and what would prove this idea wrong? If you can't answer all three, you don't have a trade yet.",
          fr: "Avant chaque clic : où est mon stop, quelle est ma taille, et qu'est-ce qui prouverait que cette idée est fausse ? Si tu ne peux pas répondre aux trois, tu n'as pas encore de trade.",
        },
      },
    ],
    goal: { kind: "read" },
    lesson: "how-tide-works",
    extraLessons: ["trend-following", "mean-reversion-ranges", "breakout-trading"],
  },
];
