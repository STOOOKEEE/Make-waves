import type { RawArticle } from "../types";

/* Basics — carnet d'ordres, bid/ask/spread, liquidité/profondeur, slippage,
 * maker vs taker (fees Tide). Étendu au format GOLD STANDARD. Ton « tu ». */
export const orderBookSpread: RawArticle = {
  slug: "order-book-spread",
  category: "basics",
  difficulty: "intermediate",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "order book",
    "bid ask spread",
    "market depth",
    "maker vs taker",
    "slippage",
    "liquidity",
    "limit order",
    "order book trading",
  ],
  title: {
    en: "Bid, ask, spread & the order book",
    fr: "Bid, ask, spread & le carnet d'ordres",
  },
  seoTitle: {
    en: "Order Book Explained: Bid, Ask, Spread & Slippage",
    fr: "Le carnet d'ordres expliqué : bid, ask, spread & slippage",
  },
  seoDescription: {
    en: "The order book explained for traders: bid, ask, spread, depth, slippage and maker vs taker fees — and how to read real order books on Tide.",
    fr: "Le carnet d'ordres expliqué : bid, ask, spread, profondeur, slippage et frais maker vs taker — et comment lire de vrais carnets sur Tide.",
  },
  dek: {
    en: "Where does the price actually come from? Peek inside the order book — the market's beating heart, where every trade really happens.",
    fr: "D'où vient vraiment le prix ? Regarde dans le carnet d'ordres — le cœur battant du marché, là où chaque trade se joue vraiment.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "The single \"price\" you see on a chart is a summary — the last handshake between a buyer and a seller. Underneath sits the **order book**: a live, two-sided list of everyone waiting to buy or sell, and at exactly what price. Learn to read the order book and the market stops looking like a random line; it becomes a crowd whose intentions you can actually see. On Tide you read **real order books** pulled from venues like the XRPL DEX, Binance and Hyperliquid — this is the real thing, not a decoration.",
        fr: "Le « prix » unique que tu vois sur un graphique est un résumé — la dernière poignée de main entre un acheteur et un vendeur. En dessous se trouve le **carnet d'ordres** : la liste vivante, à deux faces, de tous ceux qui attendent d'acheter ou de vendre, et à quel prix exactement. Apprends à lire le carnet d'ordres et le marché arrête de ressembler à une ligne au hasard ; il devient une foule dont tu vois vraiment les intentions. Sur Tide, tu lis de **vrais carnets d'ordres** tirés de places comme le DEX XRPL, Binance et Hyperliquid — du réel, pas de la déco.",
      },
    },
    {
      type: "h",
      text: { en: "What the order book actually is", fr: "Ce qu'est vraiment le carnet d'ordres" },
    },
    {
      type: "p",
      text: {
        en: "Picture two stacks facing each other. On one side, **buyers** post the prices they're willing to pay — the bids. On the other, **sellers** post the prices they'll accept — the asks. Each line is a resting **limit order**: a promise to trade a certain size at a certain price. The order book is just those two stacks, sorted best-price-first, updating many times a second as orders arrive, fill and get cancelled.",
        fr: "Imagine deux piles face à face. D'un côté, les **acheteurs** affichent les prix qu'ils acceptent de payer — les bids. De l'autre, les **vendeurs** affichent les prix qu'ils veulent — les asks. Chaque ligne est un **ordre limit** en attente : la promesse de trader une certaine taille à un certain prix. Le carnet d'ordres, c'est juste ces deux piles, triées meilleur-prix-en-premier, qui se mettent à jour plusieurs fois par seconde à mesure que les ordres arrivent, se remplissent et s'annulent.",
      },
    },
    {
      type: "h",
      text: { en: "Bid, ask, spread", fr: "Bid, ask, spread" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Bid** — the highest price a buyer is currently willing to pay. It's the best you can *sell* into right now.",
          fr: "**Bid** — le prix le plus haut qu'un acheteur est prêt à payer maintenant. C'est le mieux que tu puisses *vendre* à l'instant.",
        },
        {
          en: "**Ask** (or offer) — the lowest price a seller is willing to accept. It's the best you can *buy* right now.",
          fr: "**Ask** (ou offre) — le prix le plus bas qu'un vendeur accepte. C'est le mieux que tu puisses *acheter* à l'instant.",
        },
        {
          en: "**Spread** — the gap between best bid and best ask. A tight spread means a liquid, healthy market; a wide spread means it's thin, nervous and costlier to trade.",
          fr: "**Spread** — l'écart entre le meilleur bid et le meilleur ask. Un spread serré = marché liquide et sain ; un spread large = marché mince, nerveux et plus cher à trader.",
        },
        {
          en: "**Mid price** — the halfway point between bid and ask. It's the number most charts quote, even though you can rarely trade exactly there.",
          fr: "**Mid** — le point milieu entre le bid et l'ask. C'est le chiffre que la plupart des graphiques affichent, alors que tu peux rarement trader pile à ce niveau.",
        },
      ],
    },
    {
      type: "example",
      title: { en: "Reading the top of the book", fr: "Lire le haut du carnet" },
      rows: [
        { k: { en: "Best bid", fr: "Meilleur bid" }, v: { en: "$2.9985", fr: "2,9985 $" } },
        { k: { en: "Best ask", fr: "Meilleur ask" }, v: { en: "$3.0015", fr: "3,0015 $" } },
        { k: { en: "Spread", fr: "Spread" }, v: { en: "$0.0030 (0.10%)", fr: "0,0030 $ (0,10 %)" } },
        { k: { en: "Mid price", fr: "Prix mid" }, v: { en: "$3.0000", fr: "3,0000 $" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "When you place a **market buy**, you pay the ask. When you **market sell**, you hit the bid. So the moment you buy at the ask and could only sell back at the bid, you're already down by the spread. That gap is a real, if invisible, cost baked into every round trip — before any fee.",
        fr: "Quand tu passes un **achat market**, tu paies l'ask. Quand tu **vends market**, tu tapes le bid. Donc à la seconde où tu achètes à l'ask et où tu ne pourrais revendre qu'au bid, tu es déjà en perte du montant du spread. Cet écart est un coût réel, quoique invisible, cuit dans chaque aller-retour — avant le moindre frais.",
      },
    },
    {
      type: "h",
      text: { en: "Depth and liquidity", fr: "Profondeur et liquidité" },
    },
    {
      type: "p",
      text: {
        en: "The best bid and ask are only the front row. Behind them sit more orders at worse prices — that's the book's **depth**. Add it all up and you get **liquidity**: how much size the market can absorb without the price lurching. Deep books (BTC, ETH, XRP) barely flinch when you trade; thin books (a small-cap far down the top 250) can jump on a single order.",
        fr: "Le meilleur bid et le meilleur ask ne sont que le premier rang. Derrière eux s'empilent d'autres ordres à des prix moins bons — c'est la **profondeur** du carnet. Additionne le tout et tu obtiens la **liquidité** : la taille que le marché peut absorber sans que le prix ne dérape. Les carnets profonds (BTC, ETH, XRP) bronchent à peine quand tu trades ; les carnets minces (un small-cap loin dans le top 250) peuvent sauter sur un seul ordre.",
      },
    },
    {
      type: "h",
      text: { en: "Slippage: when your fill drifts", fr: "Le slippage : quand ton fill dérape" },
    },
    {
      type: "p",
      text: {
        en: "If your market order is bigger than the size resting at the best price, it eats through the book level by level — filling a bit at the ask, then the next-worst ask, then the next. The difference between the price you expected and the average price you actually got is **slippage**. On thin markets, or in fast conditions, slippage can dwarf the fee.",
        fr: "Si ton ordre market est plus gros que la taille posée au meilleur prix, il mange le carnet niveau par niveau — un peu à l'ask, puis à l'ask suivant (moins bon), puis au suivant. L'écart entre le prix que tu attendais et le prix moyen que tu obtiens vraiment, c'est le **slippage**. Sur les marchés minces, ou en conditions rapides, le slippage peut écraser le frais.",
      },
    },
    {
      type: "example",
      title: { en: "A market buy eating the book", fr: "Un achat market qui mange le carnet" },
      rows: [
        { k: { en: "You want", fr: "Tu veux" }, v: { en: "300 units, market buy", fr: "300 unités, achat market" } },
        { k: { en: "100 fill at", fr: "100 remplies à" }, v: { en: "$3.0015", fr: "3,0015 $" } },
        { k: { en: "100 fill at", fr: "100 remplies à" }, v: { en: "$3.0040", fr: "3,0040 $" } },
        { k: { en: "100 fill at", fr: "100 remplies à" }, v: { en: "$3.0090", fr: "3,0090 $" } },
        { k: { en: "Average price", fr: "Prix moyen" }, v: { en: "$3.0048", fr: "3,0048 $" } },
        { k: { en: "Slippage vs best ask", fr: "Slippage vs meilleur ask" }, v: { en: "+0.11%", fr: "+0,11 %" } },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Read the book before you size", fr: "Lis le carnet avant de dimensionner" },
      text: {
        en: "Before firing a big market order, glance at the depth. If the size resting near the top is thin compared to your order, split it up, use a limit, or trade a deeper market. A tight spread on the top line means nothing if there's no size behind it.",
        fr: "Avant de balancer un gros ordre market, jette un œil à la profondeur. Si la taille posée près du haut est mince face à ton ordre, découpe-le, passe en limit, ou trade un marché plus profond. Un spread serré sur la première ligne ne veut rien dire s'il n'y a pas de taille derrière.",
      },
    },
    {
      type: "h",
      text: { en: "Maker vs taker", fr: "Maker vs taker" },
    },
    {
      type: "p",
      text: {
        en: "There are two ways to interact with the book, and they define whether you *give* or *take* liquidity:",
        fr: "Il y a deux façons d'interagir avec le carnet, et elles définissent si tu *donnes* ou tu *prends* de la liquidité :",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Taker** — you cross the spread and grab liquidity that's already sitting there (a market order). Instant fill, but you pay the higher fee and eat the spread.",
          fr: "**Taker** — tu franchis le spread et prends la liquidité déjà posée (un ordre market). Fill instantané, mais tu paies le frais le plus élevé et tu manges le spread.",
        },
        {
          en: "**Maker** — you post a limit order and wait, *adding* a new line to the book. You might not get filled, but you set your own price and pay a lower fee for your patience.",
          fr: "**Maker** — tu poses un ordre limit et tu attends, en *ajoutant* une nouvelle ligne au carnet. Tu n'es pas sûr d'être rempli, mais tu fixes ton prix et paies un frais plus bas pour ta patience.",
        },
      ],
    },
    {
      type: "p",
      text: {
        en: "The trade-off is speed versus cost. Takers buy certainty — they get in *now*. Makers buy a better price and lower fees, at the risk that the market walks away and never fills their order. Neither is \"correct\"; good traders switch depending on whether they need the fill or need the edge.",
        fr: "Le compromis, c'est vitesse contre coût. Le taker achète de la certitude — il entre *maintenant*. Le maker achète un meilleur prix et des frais plus bas, au risque que le marché s'éloigne et ne remplisse jamais son ordre. Aucun n'est « le bon » ; les bons traders alternent selon qu'ils ont besoin du fill ou de l'edge.",
      },
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Fees on Tide", fr: "Les frais sur Tide" },
      text: {
        en: "Tide's paper terminal models this honestly: a **maker fee of 0.02%** and a **taker fee of 0.06%**, charged when a position opens. Small numbers — but over hundreds of trades, taking liquidity every time adds up. There is **no fee on Live swaps**; Tide only monetises via poker-style tournament rake.",
        fr: "Le terminal paper de Tide modélise ça honnêtement : un **frais maker de 0,02 %** et un **frais taker de 0,06 %**, prélevés à l'ouverture d'une position. Des petits chiffres — mais sur des centaines de trades, prendre la liquidité à chaque fois, ça s'accumule. Il n'y a **aucun frais sur les swaps Live** ; Tide se rémunère uniquement via un rake de tournoi façon poker.",
      },
    },
    {
      type: "h",
      text: { en: "How the order book works on Tide", fr: "Comment le carnet d'ordres marche sur Tide" },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "In **Paper**, your fills are simulated on live market prices with the maker/taker fees above — no real orders hit an exchange. **Limit orders and TP/SL are client-side triggers**: your browser tab must stay open for them to fire, and only the execution is reported to the backend. In **Live** mode you place a real **spot swap, XRP vs RLUSD only**, signed non-custodially with Xaman or GemWallet against the actual XRPL order book. Live is spot only — no leverage, no perp.",
        fr: "En **Paper**, tes fills sont simulés sur les prix de marché live avec les frais maker/taker ci-dessus — aucun ordre réel n'atteint une plateforme. **Les ordres limit et les TP/SL sont des déclencheurs côté client** : ton onglet doit rester ouvert pour qu'ils se déclenchent, et seule l'exécution remonte au backend. En mode **Live**, tu passes un vrai **swap spot, XRP contre RLUSD uniquement**, signé de façon non-custodiale avec Xaman ou GemWallet contre le vrai carnet d'ordres XRPL. Le Live, c'est du spot uniquement — pas de levier, pas de perp.",
      },
    },
    {
      type: "h",
      text: { en: "What a healthy book looks like", fr: "À quoi ressemble un carnet sain" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Tight spread** relative to the price — fractions of a percent on major pairs.",
          fr: "**Spread serré** par rapport au prix — des fractions de pour cent sur les grosses paires.",
        },
        {
          en: "**Balanced depth** on both sides — no cliff of emptiness one tick away from the top.",
          fr: "**Profondeur équilibrée** des deux côtés — pas de falaise de vide à un tick du sommet.",
        },
        {
          en: "**Stable top of book** — the best bid/ask don't flicker wildly every millisecond.",
          fr: "**Haut de carnet stable** — les meilleurs bid/ask ne clignotent pas dans tous les sens à la milliseconde.",
        },
        {
          en: "A **wall** — an unusually large order at one level — can act as support or resistance, but it can also vanish the instant it's tested. Don't trust it blindly.",
          fr: "Un **mur** — un ordre anormalement gros à un niveau — peut faire support ou résistance, mais peut aussi disparaître à l'instant où il est testé. Ne t'y fie pas aveuglément.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Practice reading it live", fr: "Entraîne-toi à le lire en live" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Open the terminal in Paper and pick a deep market like XRP, then a thinner one further down the top 250.",
          fr: "Ouvre le terminal en Paper et choisis un marché profond comme XRP, puis un plus mince plus bas dans le top 250.",
        },
        {
          en: "Compare their spreads and depth side by side — feel how much size each can take before the price moves.",
          fr: "Compare leurs spreads et leur profondeur côte à côte — sens la taille que chacun encaisse avant que le prix ne bouge.",
        },
        {
          en: "Place one small taker (market) order, then one maker (limit) order, and watch the fee and fill differ.",
          fr: "Passe un petit ordre taker (market), puis un ordre maker (limit), et regarde le frais et le fill différer.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "The chart tells you where the price has been. The order book tells you where it can go next — and what it'll cost you to get there.",
        fr: "Le graphique te dit où le prix est passé. Le carnet d'ordres te dit où il peut aller ensuite — et ce que ça va te coûter d'y aller.",
      },
    },
  ],
  related: ["order-types", "reading-a-chart", "how-tide-works"],
};
