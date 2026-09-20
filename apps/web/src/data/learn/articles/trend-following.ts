import type { RawArticle } from "../types";

/* Strategies — suivre la tendance : structure, moyennes mobiles, entrées sur
 * pullback, trailing stop, laisser courir les gagnants. Profondeur GOLD-STANDARD
 * (cf. what-is-trading) : ~20 blocs, sections H2 riches, exemple chiffré, SEO
 * complet, caveats Tide. Ton « tu », technique, un brin adrénaline. */
export const trendFollowing: RawArticle = {
  slug: "trend-following",
  category: "strategies",
  difficulty: "intermediate",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "trend following",
    "trend trading strategy",
    "moving average crossover",
    "higher highs higher lows",
    "trailing stop",
    "let winners run",
    "crypto trend strategy",
    "paper trading",
  ],
  title: {
    en: "Trend following: ride the wave",
    fr: "Suivre la tendance : surfe la vague",
  },
  seoTitle: {
    en: "Trend Following Strategy: Ride the Trend, Cut the Rest",
    fr: "Stratégie de suivi de tendance : surfe la tendance",
  },
  seoDescription: {
    en: "Trend following explained: spot higher highs, use moving averages, enter on pullbacks, trail your stop, and let winners run — practice risk-free on Tide.",
    fr: "Le suivi de tendance expliqué : sommets plus hauts, moyennes mobiles, entrées sur repli, trailing stop et laisser courir les gagnants — entraîne-toi sans risque sur Tide.",
  },
  dek: {
    en: "The oldest edge in trading: don't fight the current, join it. Spot the direction and let winners run.",
    fr: "Le plus vieil edge du trading : ne combats pas le courant, rejoins-le. Repère la direction et laisse courir les gagnants.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "**Trend following** is the oldest edge in trading, and still one of the most profitable: a market in motion tends to stay in motion. Instead of guessing tops and bottoms, you identify the prevailing direction and trade *with* it until it clearly ends. It's not glamorous — no perfect entries, no calling the exact top — but it's how a huge share of professional money is run. This guide breaks down how a trend-following strategy actually works, and how to drill it on Tide.",
        fr: "Le **suivi de tendance** est le plus vieil edge du trading, et l'un des plus rentables : un marché en mouvement tend à le rester. Au lieu de deviner sommets et creux, tu identifies la direction dominante et tu trades *avec* elle jusqu'à ce qu'elle se termine nettement. Pas glamour — pas d'entrée parfaite, pas de top pile au sommet — mais c'est ainsi qu'une immense part de l'argent pro est gérée. Ce guide décortique comment une stratégie de suivi de tendance fonctionne vraiment, et comment la travailler sur Tide.",
      },
    },
    {
      type: "h",
      text: { en: "Why trend following works", fr: "Pourquoi le suivi de tendance marche" },
    },
    {
      type: "p",
      text: {
        en: "Markets trend because humans are slow to update. When a story takes hold — a narrative, a flow of capital, a fear — money keeps piling in the same direction long after the first move. Fund managers add over weeks, latecomers chase, and momentum feeds on itself. Trend following doesn't try to be smarter than the crowd; it just gets in the boat and stays until the current visibly turns.",
        fr: "Les marchés font tendance parce que les humains sont lents à se mettre à jour. Quand une histoire s'installe — un narratif, un flux de capitaux, une peur — l'argent continue d'affluer dans le même sens bien après le premier mouvement. Les gérants ajoutent sur des semaines, les retardataires courent après, et le momentum s'auto-alimente. Le suivi de tendance ne cherche pas à être plus malin que la foule ; il monte simplement dans le bateau et y reste jusqu'à ce que le courant tourne visiblement.",
      },
    },
    {
      type: "h",
      text: { en: "What a trend looks like", fr: "À quoi ressemble une tendance" },
    },
    {
      type: "p",
      text: {
        en: "Before any indicator, a trend is a **structure** you can read with your eyes. Price moves in staircases, not straight lines.",
        fr: "Avant tout indicateur, une tendance est une **structure** que tu lis à l'œil nu. Le prix avance en escalier, pas en ligne droite.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Uptrend** — a staircase of **higher highs and higher lows**. Each dip bottoms above the last: buyers keep stepping in earlier.",
          fr: "**Hausse** — un escalier de **sommets plus hauts et creux plus hauts**. Chaque repli touche le fond au-dessus du précédent : les acheteurs entrent de plus en plus tôt.",
        },
        {
          en: "**Downtrend** — **lower highs and lower lows**. Each bounce fails below the last: sellers keep hitting earlier.",
          fr: "**Baisse** — **sommets plus bas et creux plus bas**. Chaque rebond échoue sous le précédent : les vendeurs frappent de plus en plus tôt.",
        },
        {
          en: "**Range** — no staircase, just sideways chop between a floor and a ceiling. Trend strategies bleed here — reach for mean reversion instead.",
          fr: "**Range** — pas d'escalier, juste du plat qui hache entre un plancher et un plafond. Les stratégies de tendance saignent ici — passe plutôt au retour à la moyenne.",
        },
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "One decision before anything", fr: "Une décision avant tout" },
      text: {
        en: "The first question is never \"buy or sell?\" — it's \"is this thing trending or ranging?\" Get that wrong and every entry after it is a coin flip. Most bad trend trades are just range trades in disguise.",
        fr: "La première question n'est jamais « acheter ou vendre ? » — c'est « est-ce que ça trend ou ça range ? ». Rate ça et chaque entrée qui suit devient un pile ou face. La plupart des mauvais trades de tendance ne sont que des trades de range déguisés.",
      },
    },
    {
      type: "h",
      text: { en: "Moving averages: the trend's ruler", fr: "Les moyennes mobiles : la règle de la tendance" },
    },
    {
      type: "p",
      text: {
        en: "A **moving average** (MA) smooths price into a single line — the average close over the last N candles. A simple read: price above a rising MA = uptrend; price below a falling MA = downtrend. Many traders watch a fast and a slow MA and act when they cross — a **moving average crossover**. It's a lagging tool by design: it *confirms* structure rather than predicting it, which is exactly why it keeps you honest in a real trend.",
        fr: "Une **moyenne mobile** (MA) lisse le prix en une seule ligne — la clôture moyenne sur les N dernières bougies. Lecture simple : prix au-dessus d'une MA qui monte = hausse ; prix sous une MA qui descend = baisse. Beaucoup surveillent une MA rapide et une lente et agissent quand elles se croisent — un **croisement de moyennes mobiles**. C'est un outil retardé par nature : il *confirme* la structure plus qu'il ne la prédit, et c'est précisément ce qui te garde honnête dans une vraie tendance.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Fast MA** (e.g. 20-period) hugs price closely — good for timing, but whipsaws in chop.",
          fr: "**MA rapide** (ex. 20 périodes) colle au prix — bonne pour le timing, mais elle se fait balader dans le plat.",
        },
        {
          en: "**Slow MA** (e.g. 50 or 200) is the big-picture direction — the tide you don't want to swim against.",
          fr: "**MA lente** (ex. 50 ou 200) donne la direction de fond — la marée contre laquelle tu ne veux pas nager.",
        },
        {
          en: "**Golden cross / death cross** — fast MA crossing above/below the slow one is a classic trend-shift signal (late, but reliable).",
          fr: "**Golden cross / death cross** — la MA rapide qui passe au-dessus/en-dessous de la lente est un signal classique de bascule de tendance (tardif, mais fiable).",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Entering: don't chase, wait for the pullback", fr: "Entrer : ne cours pas après, attends le repli" },
    },
    {
      type: "p",
      text: {
        en: "The rookie mistake is buying the vertical candle — the exact moment the move looks most obvious. In a healthy uptrend, price breathes: it pushes up, then pulls back to a higher low before the next leg. **That pullback is your entry.** It hands you a tighter stop (just under the higher low) and a far better reward-to-risk than chasing the top of a green candle.",
        fr: "L'erreur du débutant est d'acheter la bougie verticale — pile au moment où le mouvement paraît le plus évident. Dans une hausse saine, le prix respire : il pousse, puis se replie vers un creux plus haut avant la jambe suivante. **Ce repli, c'est ton entrée.** Il te donne un stop plus serré (juste sous le creux plus haut) et un ratio gain/risque bien meilleur que courir après le sommet d'une bougie verte.",
      },
    },
    {
      type: "steps",
      items: [
        {
          en: "Confirm the trend on a higher timeframe (structure of higher highs/lows, price above a rising MA).",
          fr: "Confirme la tendance sur une unité de temps supérieure (structure de sommets/creux plus hauts, prix au-dessus d'une MA qui monte).",
        },
        {
          en: "Wait for a pullback toward the higher low or the rising MA — let the impatient sellers flush out.",
          fr: "Attends un repli vers le creux plus haut ou la MA qui monte — laisse les vendeurs impatients se vider.",
        },
        {
          en: "Enter long when the pullback stalls and price turns back up, stop just under the recent higher low.",
          fr: "Entre en long quand le repli cale et que le prix repart, stop juste sous le dernier creux plus haut.",
        },
        {
          en: "Set your first target at least 2× your risk, and plan to trail the rest.",
          fr: "Place ta première cible à au moins 2× ton risque, et prévois de faire courir le reste avec un trailing.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "The hard part: letting winners run", fr: "Le plus dur : laisser courir les gagnants" },
    },
    {
      type: "p",
      text: {
        en: "Trend following makes its money on a few big moves, so cutting winners early kills the edge. The discipline is to hold while the trend structure holds — **trailing your stop up under each new higher low** — and only exit when the structure breaks. Small losses, occasional huge wins. If you take profit every time you're up 3%, you'll never be in the trade that runs 60%.",
        fr: "Le suivi de tendance gagne son argent sur quelques gros mouvements ; couper les gagnants trop tôt tue l'edge. La discipline : tenir tant que la structure de tendance tient — **en remontant ton stop sous chaque nouveau creux plus haut** — et ne sortir que quand la structure casse. Petites pertes, gains parfois énormes. Si tu prends tes bénéfices dès +3 %, tu ne seras jamais dans le trade qui court à +60 %.",
      },
    },
    {
      type: "example",
      title: { en: "A trend trade, step by step", fr: "Un trade de tendance, pas à pas" },
      rows: [
        { k: { en: "Setup", fr: "Setup" }, v: { en: "SOL uptrend, price above rising 50 MA", fr: "SOL en hausse, prix au-dessus de la MA 50 qui monte" } },
        { k: { en: "Entry (pullback)", fr: "Entrée (repli)" }, v: { en: "long at $180", fr: "long à 180 $" } },
        { k: { en: "Initial stop", fr: "Stop initial" }, v: { en: "$171 (−5%, under higher low)", fr: "171 $ (−5 %, sous le creux plus haut)" } },
        { k: { en: "Trail stop up", fr: "Trailing du stop" }, v: { en: "$192, then $210 under each higher low", fr: "192 $, puis 210 $ sous chaque creux plus haut" } },
        { k: { en: "Structure breaks, exit", fr: "La structure casse, sortie" }, v: { en: "stopped at $228", fr: "stoppé à 228 $" } },
        { k: { en: "Result", fr: "Résultat" }, v: { en: "+$48 per unit (+26.7%) vs 5% risked", fr: "+48 $ par unité (+26,7 %) pour 5 % risqués" } },
      ],
    },
    {
      type: "h",
      text: { en: "Where trend following hurts", fr: "Là où le suivi de tendance fait mal" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Chop / ranges** — the killer. A sideways market whipsaws you in and out for a string of small losses. Sit out when there's no staircase.",
          fr: "**Le plat / les ranges** — le tueur. Un marché sans direction te balade en entrées-sorties pour une série de petites pertes. Reste sur la touche s'il n'y a pas d'escalier.",
        },
        {
          en: "**Late entries** — MAs lag, so you're never at the exact bottom. That's fine; you're paid on the middle of the move, not the turn.",
          fr: "**Entrées tardives** — les MA sont en retard, tu n'es jamais pile au creux. C'est normal ; tu es payé sur le milieu du mouvement, pas sur le retournement.",
        },
        {
          en: "**Low win rate** — expect to be wrong more often than right. A few runners have to pay for many paper-cuts, so never oversize.",
          fr: "**Faible taux de réussite** — attends-toi à avoir tort plus souvent que raison. Quelques gros trades doivent payer beaucoup de micro-pertes, donc ne surdimensionne jamais.",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "You can drill trend following long *or* short in **Paper** mode, with simulated perp and up to **100x** leverage — but that leverage is simulated, isolated margin, no borrowed money. There's **no server-side auto-liquidation**: realized PnL is floored at **−margin** only when you close. Your **TP/SL and trailing stop are client-side triggers** — the browser tab must stay open for them to fire, and only the execution is reported to the backend. Fees at open are **maker 0.02% / taker 0.06%**. **Live** mode is real spot only (XRP vs RLUSD, non-custodial via Xaman or GemWallet) — no leverage there.",
        fr: "Tu peux travailler le suivi de tendance en long *ou* en short en mode **Paper**, avec un perp simulé et jusqu'à **100x** de levier — mais ce levier est simulé, marge isolée, aucun argent emprunté. **Pas de liquidation auto côté serveur** : le PnL réalisé est plafonné à **−marge** uniquement à la fermeture. Tes **TP/SL et ton trailing stop sont des déclencheurs côté client** — l'onglet du navigateur doit rester ouvert pour qu'ils se déclenchent, et seule l'exécution remonte au backend. Frais à l'ouverture : **maker 0,02 % / taker 0,06 %**. Le mode **Live** est du spot réel uniquement (XRP contre RLUSD, non-custodial via Xaman ou GemWallet) — pas de levier là-dedans.",
      },
    },
    {
      type: "h",
      text: { en: "Practice this on Tide", fr: "Entraîne-toi sur Tide" },
    },
    {
      type: "p",
      text: {
        en: "Trend following is a pattern-recognition skill, and patterns only lock in through reps. Tide gives you the top 250 crypto markets on live data and virtual capital — the perfect lab to fail cheaply until the structure jumps out at you.",
        fr: "Le suivi de tendance est une compétence de reconnaissance de motifs, et les motifs ne s'ancrent que par la répétition. Tide te donne les 250 plus gros marchés crypto en données live et un capital virtuel — le labo parfait pour échouer sans douleur jusqu'à ce que la structure te saute aux yeux.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Practice read", fr: "Lecture d'entraînement" },
      text: {
        en: "Pull up a strong mover on the `4H` chart and mark the higher highs and higher lows by eye. Then drop to `15m` to time an entry on a pullback, and set a stop just under the last higher low. Doing this across dozens of paper trades trains you to see structure instantly.",
        fr: "Affiche un actif qui bouge fort en `4H` et repère à l'œil les sommets et creux plus hauts. Puis descends en `15m` pour caler une entrée sur un repli, et place un stop juste sous le dernier creux plus haut. Répète sur des dizaines de trades paper et tu verras la structure instantanément.",
      },
    },
    {
      type: "quote",
      text: {
        en: "The trend is your friend — until the bend at the end. Ride it, trail it, and let the market tell you when to get off.",
        fr: "La tendance est ton amie — jusqu'au virage final. Surfe-la, remonte ton stop, et laisse le marché te dire quand descendre.",
      },
    },
  ],
  related: ["reading-a-chart", "breakout-trading", "risk-management-101"],
};
