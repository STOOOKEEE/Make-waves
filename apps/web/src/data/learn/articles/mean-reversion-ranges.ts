import type { RawArticle } from "../types";

/* Strategies — retour à la moyenne, support/résistance, ranges.
 * Étoffé au niveau du gold standard (what-is-trading) : sections H2 riches,
 * exemples chiffrés, callouts, caveats Tide (perp simulé, TP/SL client-side). */
export const meanReversionRanges: RawArticle = {
  slug: "mean-reversion-ranges",
  category: "strategies",
  difficulty: "advanced",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "mean reversion",
    "range trading",
    "support and resistance",
    "trading strategy",
    "buy low sell high",
    "range breakout",
    "bollinger bands",
    "paper trading",
  ],
  title: {
    en: "Mean reversion & trading the range",
    fr: "Retour à la moyenne & trader le range",
  },
  seoTitle: {
    en: "Mean Reversion Trading: How to Trade a Range Like a Pro",
    fr: "Retour à la moyenne : comment trader un range comme un pro",
  },
  seoDescription: {
    en: "Mean reversion trading explained: how to read a range, buy support, sell resistance, place stops, and avoid the breakout trap — then practise risk-free on Tide.",
    fr: "Le retour à la moyenne expliqué : lire un range, acheter le support, vendre la résistance, placer tes stops, éviter le piège de la cassure — puis t'entraîner sans risque sur Tide.",
  },
  dek: {
    en: "Not every market trends. When price bounces between two walls, you play the walls — buy low, sell high, repeat.",
    fr: "Tous les marchés ne suivent pas de tendance. Quand le prix rebondit entre deux murs, tu joues les murs — achète bas, vends haut, recommence.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "**Mean reversion** is the strategy you reach for when a market refuses to trend. Prices spend a huge share of their life going nowhere — chopping sideways in a **range**, bounded above and below. Instead of expecting a move to continue, mean reversion bets the opposite: a price stretched too far from its average is a rubber band, and rubber bands snap back. This guide shows you how to spot a range, trade it, protect it with a stop, and — crucially — recognise when the range is about to betray you.",
        fr: "Le **retour à la moyenne** (mean reversion), c'est la stratégie que tu dégaines quand un marché refuse de suivre une tendance. Les prix passent une part énorme de leur vie à ne mener nulle part — à hacher latéralement dans un **range**, borné en haut et en bas. Au lieu d'attendre qu'un mouvement continue, le retour à la moyenne parie l'inverse : un prix trop étiré de sa moyenne est un élastique, et les élastiques reviennent. Ce guide te montre comment repérer un range, le trader, le protéger avec un stop, et — surtout — reconnaître quand le range est sur le point de te trahir.",
      },
    },
    {
      type: "h",
      text: { en: "What mean reversion actually means", fr: "Ce que veut vraiment dire le retour à la moyenne" },
    },
    {
      type: "p",
      text: {
        en: "The core idea of mean reversion is that price tends to orbit a central value — a moving average, a session VWAP, the middle of a range. When it spikes far above that mean, sellers see \"expensive\" and lean in; when it dumps far below, buyers see \"cheap\" and step up. You're not predicting a big directional move. You're fading extremes and collecting the snap-back to the middle. It's the mathematical opposite of trend following: a trend trader buys strength, a reversion trader sells it.",
        fr: "L'idée centrale du retour à la moyenne, c'est que le prix a tendance à graviter autour d'une valeur centrale — une moyenne mobile, un VWAP de séance, le milieu d'un range. Quand il pique loin au-dessus de cette moyenne, les vendeurs voient « cher » et s'appuient dessus ; quand il plonge loin en dessous, les acheteurs voient « pas cher » et reviennent. Tu ne prédis pas un gros mouvement directionnel. Tu contres les extrêmes et tu encaisses le retour vers le milieu. C'est l'opposé mathématique du suivi de tendance : un trader de tendance achète la force, un trader de reversion la vend.",
      },
    },
    {
      type: "h",
      text: { en: "Support & resistance: the walls", fr: "Support & résistance : les murs" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Support** — a price floor where buyers keep stepping in and the drop stalls. The bottom of the range, where you look to go **long**.",
          fr: "**Support** — un plancher de prix où les acheteurs reviennent et où la baisse cale. Le bas du range, où tu cherches à te mettre **long**.",
        },
        {
          en: "**Resistance** — a ceiling where sellers keep appearing and rallies stall. The top of the range, where you look to take profit or go **short**.",
          fr: "**Résistance** — un plafond où les vendeurs réapparaissent et où les hausses calent. Le haut du range, où tu prends le profit ou tu passes **short**.",
        },
        {
          en: "**The mean** — the midpoint between the two walls. It's your target: most reversion trades aim to ride price from one wall back toward this centre.",
          fr: "**La moyenne** — le milieu entre les deux murs. C'est ta cible : la plupart des trades de reversion visent à ramener le prix d'un mur vers ce centre.",
        },
      ],
    },
    {
      type: "p",
      text: {
        en: "The more times price touches a level and turns, the more traders watch it — which makes it more real. A wall confirmed by three or four clean rejections is worth far more than a line you drew across a single wick. You buy near support with a stop just below it, and sell near resistance. Your risk is small (the wall is right there) and, more importantly, **defined before you enter**.",
        fr: "Plus le prix touche un niveau et se retourne, plus les traders le surveillent — ce qui le rend plus réel. Un mur confirmé par trois ou quatre rejets nets vaut bien plus qu'une ligne tracée sur une seule mèche. Tu achètes près du support avec un stop juste en dessous, et tu vends près de la résistance. Ton risque est petit (le mur est juste là) et, surtout, **défini avant même d'entrer**.",
      },
    },
    {
      type: "h",
      text: { en: "Tools that measure \"too far\"", fr: "Les outils qui mesurent le « trop loin »" },
    },
    {
      type: "p",
      text: {
        en: "You don't have to eyeball the stretch. A few classic indicators quantify how far price has strayed from its mean, so you fade extremes instead of guessing:",
        fr: "Tu n'es pas obligé de juger l'étirement à l'œil. Quelques indicateurs classiques quantifient à quel point le prix s'est écarté de sa moyenne, pour que tu contres des extrêmes au lieu de deviner :",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Bollinger Bands** — a moving average with two bands set a couple of standard deviations away. Price tagging the outer band = statistically stretched, a reversion candidate.",
          fr: "**Bandes de Bollinger** — une moyenne mobile encadrée par deux bandes à quelques écarts-types. Le prix qui touche la bande extérieure = statistiquement étiré, un candidat au retour.",
        },
        {
          en: "**RSI** — an oscillator from 0 to 100. Classic reads: above 70 = overbought (fade the top), below 30 = oversold (buy the dip). In a clean range these signals are gold; in a trend they lie for a long time.",
          fr: "**RSI** — un oscillateur de 0 à 100. Lectures classiques : au-dessus de 70 = suracheté (contre le haut), en dessous de 30 = survendu (achète le creux). Dans un range propre ces signaux sont en or ; en tendance ils mentent longtemps.",
        },
        {
          en: "**Distance from a moving average** — the simplest of all. Price 5% above the 20-period MA on an asset that usually hugs it is a stretch worth fading.",
          fr: "**Écart à une moyenne mobile** — le plus simple. Un prix à 5 % au-dessus de la MM 20 sur un actif qui la colle d'habitude, c'est un étirement bon à contrer.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "A range trade, step by step", fr: "Un trade de range, pas à pas" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Mark the range: draw the support and resistance that price has respected at least twice each.",
          fr: "Marque le range : trace le support et la résistance que le prix a respectés au moins deux fois chacun.",
        },
        {
          en: "Wait for price to reach a wall — don't chase it in the middle, where risk is undefined.",
          fr: "Attends que le prix atteigne un mur — ne le poursuis pas au milieu, où le risque n'est pas défini.",
        },
        {
          en: "Enter on a rejection signal at the wall (a wick, an RSI extreme, a stalling candle).",
          fr: "Entre sur un signal de rejet au mur (une mèche, un extrême de RSI, une bougie qui cale).",
        },
        {
          en: "Place your stop just *beyond* the wall, and your target near the mean or the opposite wall.",
          fr: "Place ton stop juste *au-delà* du mur, et ta cible près de la moyenne ou du mur opposé.",
        },
        {
          en: "If the wall breaks and takes your stop, don't argue with it — the range is over.",
          fr: "Si le mur casse et prend ton stop, ne discute pas — le range est terminé.",
        },
      ],
    },
    {
      type: "example",
      title: { en: "Buying support in a range", fr: "Acheter le support dans un range" },
      rows: [
        { k: { en: "Range", fr: "Range" }, v: { en: "Support $100 / Resistance $120", fr: "Support 100 $ / Résistance 120 $" } },
        { k: { en: "You buy near", fr: "Tu achètes vers" }, v: { en: "$101 (at support)", fr: "101 $ (au support)" } },
        { k: { en: "Stop just below", fr: "Stop juste sous" }, v: { en: "$97 (−$4 risk)", fr: "97 $ (−4 $ de risque)" } },
        { k: { en: "Target near", fr: "Cible vers" }, v: { en: "$118 (+$17 reward)", fr: "118 $ (+17 $ de gain)" } },
        { k: { en: "Risk / reward", fr: "Risque / gain" }, v: { en: "≈ 1 : 4", fr: "≈ 1 : 4" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "Notice the geometry: because your stop sits just under a hard floor and your target is the far wall, a single win pays for several stopped-out attempts. You can be wrong more often than right and still come out ahead — the same **expectancy** math that runs every good strategy.",
        fr: "Regarde la géométrie : comme ton stop est juste sous un plancher dur et ta cible est le mur d'en face, un seul gain paie plusieurs tentatives stoppées. Tu peux te tromper plus souvent que réussir et sortir quand même gagnant — la même **espérance** qui fait tourner toute bonne stratégie.",
      },
    },
    {
      type: "h",
      text: { en: "The trap: ranges eventually break", fr: "Le piège : les ranges finissent par casser" },
    },
    {
      type: "p",
      text: {
        en: "Every range ends. The danger of mean reversion is fading a move that turns out to be a real breakout — buying \"support\" as the floor gives way, or shorting \"resistance\" as price rips through it. That's why the stop just beyond the wall is non-negotiable: when the level breaks, you're out fast and small, and you can even flip to trade the breakout in the new direction. A reversion trader without a stop isn't a trader — they're a bag holder with a thesis.",
        fr: "Tout range finit. Le danger du retour à la moyenne, c'est de contrer un mouvement qui s'avère être une vraie cassure — acheter le « support » pendant que le plancher cède, ou shorter la « résistance » pendant que le prix la traverse. D'où le stop juste au-delà du mur, non négociable : quand le niveau casse, tu sors vite et petit, et tu peux même te retourner pour trader la cassure dans le nouveau sens. Un trader de reversion sans stop n'est pas un trader — c'est un sac à porter avec une thèse.",
      },
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Range vs trend: know which market you're in", fr: "Range vs tendance : sache dans quel marché tu es" },
      text: {
        en: "Range strategies get shredded in a strong trend, and trend strategies get chopped up in a range. Before you pick a playbook, decide which regime the chart is in — sideways and bounded, or one-directional with higher highs. Getting *that* read right matters more than any single entry.",
        fr: "Les stratégies de range se font déchiqueter dans une forte tendance, et les stratégies de tendance se font hacher dans un range. Avant de choisir un plan, décide dans quel régime est le graphique — latéral et borné, ou directionnel avec des plus hauts qui montent. Réussir *cette* lecture compte plus que n'importe quelle entrée isolée.",
      },
    },
    {
      type: "h",
      text: { en: "Common mistakes that kill range traders", fr: "Les erreurs qui tuent les traders de range" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Entering in the middle** — no nearby wall means no defined risk. Trade the edges or don't trade.",
          fr: "**Entrer au milieu** — pas de mur proche = pas de risque défini. Trade les bords ou ne trade pas.",
        },
        {
          en: "**Moving the stop** — nudging it further from the wall to \"give it room\" is how a small loss becomes a full range width.",
          fr: "**Déplacer le stop** — l'éloigner du mur pour « lui laisser de l'air », c'est comme ça qu'une petite perte devient la largeur entière du range.",
        },
        {
          en: "**Fading a fresh breakout** — the first close cleanly beyond the wall is a signal to stand aside, not to double down.",
          fr: "**Contrer une cassure fraîche** — la première clôture nette au-delà du mur est un signal pour te ranger, pas pour renforcer.",
        },
        {
          en: "**Ignoring context** — a tight range right under a major daily resistance is far more likely to break down than to keep bouncing.",
          fr: "**Ignorer le contexte** — un range serré juste sous une grosse résistance journalière a bien plus de chances de casser que de continuer à rebondir.",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "You can trade the range long **or** short on Tide, because perp is available — but it's **simulated in Paper only**: no real leverage, no borrowed money. Leverage is capped at 100x on isolated margin, and realized PnL is floored at −margin when you close (there's no server-side auto-liquidation, so that floor only applies at close). Your **TP/SL and limit orders are client-side triggers** — keep the browser tab open or they won't fire; only the execution is reported to the backend. Fees at open are 0.02% maker / 0.06% taker. Live mode is a different beast: a real **spot** swap, XRP vs RLUSD only, non-custodial via Xaman or GemWallet — no leverage there.",
        fr: "Tu peux trader le range long **ou** short sur Tide, parce que le perp est dispo — mais il est **simulé en Paper uniquement** : pas de vrai levier, pas d'argent emprunté. Le levier est plafonné à 100x en marge isolée, et le PnL réalisé est plafonné à −marge à la fermeture (pas d'auto-liquidation côté serveur, donc ce plancher ne s'applique qu'à la clôture). Tes **TP/SL et ordres limit sont des déclencheurs côté client** — garde l'onglet du navigateur ouvert sinon ils ne partent pas ; seule l'exécution remonte au backend. Frais à l'ouverture : 0,02 % maker / 0,06 % taker. Le mode Live est une autre bête : un vrai swap **spot**, XRP contre RLUSD uniquement, non-custodial via Xaman ou GemWallet — pas de levier là-dedans.",
      },
    },
    {
      type: "h",
      text: { en: "Practise the regime read on Tide", fr: "Entraîne ta lecture de régime sur Tide" },
    },
    {
      type: "p",
      text: {
        en: "The skill that separates good range traders from stopped-out ones isn't the entry — it's telling a range apart from a trend *before* you commit. That read only sharpens with reps. On Tide you get them with **virtual capital** on the top 250 crypto markets, priced on live data: same walls, same fake-outs, same adrenaline, but a blown range costs you leaderboard rank, not rent.",
        fr: "Le talent qui sépare les bons traders de range des stoppés, ce n'est pas l'entrée — c'est distinguer un range d'une tendance *avant* de t'engager. Cette lecture ne s'affûte qu'avec les reps. Sur Tide tu les enchaînes avec un **capital virtuel** sur les 250 plus gros marchés crypto, cotés sur des données live : mêmes murs, mêmes faux signaux, même adrénaline, mais un range raté te coûte du classement, pas ton loyer.",
      },
    },
    {
      type: "steps",
      items: [
        {
          en: "Find a chart that's clearly ranging, and mark both walls plus the midpoint.",
          fr: "Trouve un graphique clairement en range, et marque les deux murs plus le point milieu.",
        },
        {
          en: "Place one Paper trade at a wall with a defined stop beyond it and a target at the mean.",
          fr: "Place un trade Paper à un mur, avec un stop défini au-delà et une cible à la moyenne.",
        },
        {
          en: "Log whether the range held or broke, and let the leaderboard measure your regime-reading edge over time.",
          fr: "Note si le range a tenu ou cassé, et laisse le classement mesurer ton edge de lecture de régime dans la durée.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "The trend is your friend — until the range decides otherwise.",
        fr: "La tendance est ton amie — jusqu'à ce que le range en décide autrement.",
      },
    },
  ],
  related: ["trend-following", "breakout-trading", "reading-a-chart"],
};
