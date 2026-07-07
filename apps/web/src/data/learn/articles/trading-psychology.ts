import type { RawArticle } from "../types";

/* Strategies — trading psychology : discipline, biais, revenge trading, tilt.
 * Profondeur GOLD STANDARD (cf. what-is-trading) : ~20+ blocs, sections H2,
 * exemples chiffrés, callout « sur Tide », SEO complet. Ton « tu », honnête. */
export const tradingPsychology: RawArticle = {
  slug: "trading-psychology",
  category: "strategies",
  difficulty: "beginner",
  minutes: 9,
  popular: false,
  updated: "2026-07-02",
  keywords: [
    "trading psychology",
    "revenge trading",
    "fomo trading",
    "trading discipline",
    "emotional trading",
    "trading tilt",
    "fear and greed",
  ],
  title: {
    en: "Trading psychology: your real opponent",
    fr: "Psychologie du trading : ton vrai adversaire",
  },
  seoTitle: {
    en: "Trading Psychology: Master Your Mind Before the Market",
    fr: "Psychologie du trading : maîtrise ton mental avant le marché",
  },
  seoDescription: {
    en: "Trading psychology decoded: why fear, greed and revenge trading blow up accounts, and how to build discipline with a process you can practise on Tide.",
    fr: "La psychologie du trading décodée : pourquoi peur, avidité et revenge trading font sauter les comptes, et comment bâtir ta discipline sur Tide.",
  },
  dek: {
    en: "Two traders, same strategy, opposite results. The difference is never the chart — it's the person reading it.",
    fr: "Deux traders, même stratégie, résultats opposés. La différence n'est jamais le graphique — c'est la personne qui le lit.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "**Trading psychology** is the part of the game nobody sells you a course on, yet it decides who survives. You can know every pattern and still lose, because the market is an emotional machine and you're plugged straight into it. Fear, greed and ego quietly overrule your plan at exactly the wrong moments. This guide is about the real opponent on the other side of the screen: not the whales, not the algos — **you**.",
        fr: "La **psychologie du trading**, c'est la partie du jeu que personne ne te vend en formation, et pourtant c'est elle qui décide qui survit. Tu peux connaître toutes les figures et perdre quand même, parce que le marché est une machine émotionnelle et que tu y es branché en direct. Peur, avidité et ego contournent en douce ton plan aux pires moments. Ce guide parle du vrai adversaire de l'autre côté de l'écran : ni les baleines, ni les algos — **toi**.",
      },
    },
    {
      type: "h",
      text: { en: "Why your brain is wired to lose", fr: "Pourquoi ton cerveau est câblé pour perdre" },
    },
    {
      type: "p",
      text: {
        en: "The instincts that kept your ancestors alive are terrible at trading. Loss hurts about twice as much as an equal gain feels good, so you cut winners early and let losers run — the exact opposite of what works. Your brain also craves certainty in a game that is pure probability. Understanding these wiring bugs is step one of trading psychology: you can't disarm a bias you can't name.",
        fr: "Les instincts qui ont gardé tes ancêtres en vie sont catastrophiques en trading. Une perte fait environ deux fois plus mal qu'un gain équivalent ne fait plaisir, donc tu coupes tes gagnants trop tôt et tu laisses courir tes perdants — exactement l'inverse de ce qui marche. Ton cerveau réclame aussi de la certitude dans un jeu qui n'est que probabilité. Comprendre ces bugs de câblage, c'est l'étape un : impossible de désamorcer un biais que tu ne sais pas nommer.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Loss aversion** — you hold losers hoping they \"come back\" and snatch tiny profits out of fear. Result: small wins, big losses.",
          fr: "**Aversion à la perte** — tu gardes tes perdants en espérant que « ça revienne » et tu attrapes de minuscules profits par peur. Résultat : petits gains, grosses pertes.",
        },
        {
          en: "**Recency bias** — the last trade colours the next. Three wins and you feel invincible; three losses and you can't pull the trigger.",
          fr: "**Biais de récence** — le dernier trade colore le suivant. Trois gains et tu te sens invincible ; trois pertes et tu n'arrives plus à cliquer.",
        },
        {
          en: "**Confirmation bias** — once you're in, you only read the chart and the news that agree with you.",
          fr: "**Biais de confirmation** — une fois entré, tu ne lis plus que le graphique et les news qui te donnent raison.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "The classic traps", fr: "Les pièges classiques" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Revenge trading** — you take a loss, get angry, and immediately jump into a bigger, unplanned trade to \"win it back.\" This is how small losses become disasters.",
          fr: "**Revenge trading** — tu prends une perte, tu t'énerves, et tu sautes aussitôt dans un trade plus gros et non planifié pour « te refaire ». C'est ainsi que les petites pertes deviennent des désastres.",
        },
        {
          en: "**FOMO** — chasing a candle that already ran because you can't stand missing out, buying exactly where you should be taking profit.",
          fr: "**FOMO** — courir après une bougie déjà partie parce que tu ne supportes pas de rater, en achetant précisément là où tu devrais prendre des profits.",
        },
        {
          en: "**Moving your stop** — widening a stop-loss as price approaches it, turning a planned small loss into an unplanned big one.",
          fr: "**Décaler son stop** — élargir un stop-loss quand le prix s'en approche, transformant une petite perte planifiée en grosse perte non planifiée.",
        },
        {
          en: "**Overtrading** — confusing activity with progress, taking trades out of boredom rather than edge.",
          fr: "**Overtrading** — confondre activité et progrès, prendre des trades par ennui plutôt que par edge.",
        },
        {
          en: "**Adding to a loser** — averaging down on a losing position \"to lower your entry,\" quietly doubling the risk you already got wrong.",
          fr: "**Charger un perdant** — moyenner à la baisse sur une position perdante « pour baisser ton prix d'entrée », en doublant en douce le risque que tu as déjà mal évalué.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Tilt: the loss spiral, quantified", fr: "Le tilt : la spirale de perte, chiffrée" },
    },
    {
      type: "p",
      text: {
        en: "Poker players call it **tilt**: emotion hijacks decision-making after a bad beat, and each reaction makes the next worse. In trading, tilt turns one disciplined loss into a session-ending hole. Watch how fast the math runs away when revenge sizing kicks in.",
        fr: "Les joueurs de poker appellent ça le **tilt** : l'émotion prend le contrôle après un mauvais coup, et chaque réaction empire la suivante. En trading, le tilt transforme une perte disciplinée en trou qui clôt la session. Regarde à quelle vitesse le calcul dérape quand le sizing de revanche s'en mêle.",
      },
    },
    {
      type: "example",
      title: { en: "How tilt compounds a single loss", fr: "Comment le tilt fait boule de neige" },
      rows: [
        { k: { en: "Start of session", fr: "Début de session" }, v: { en: "$10,000", fr: "10 000 $" } },
        { k: { en: "Trade 1 — planned loss (1% risk)", fr: "Trade 1 — perte planifiée (1 % de risque)" }, v: { en: "−$100 → $9,900", fr: "−100 $ → 9 900 $" } },
        { k: { en: "Trade 2 — revenge, 3x size", fr: "Trade 2 — revanche, taille x3" }, v: { en: "−$300 → $9,600", fr: "−300 $ → 9 600 $" } },
        { k: { en: "Trade 3 — all-in to \"get flat\"", fr: "Trade 3 — all-in pour « revenir à zéro »" }, v: { en: "−$960 → $8,640", fr: "−960 $ → 8 640 $" } },
        { k: { en: "Damage vs the one clean loss", fr: "Dégâts vs la seule perte propre" }, v: { en: "−$1,360 instead of −$100", fr: "−1 360 $ au lieu de −100 $" } },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "The one that hides in leverage", fr: "Celui qui se cache dans le levier" },
      text: {
        en: "Emotion and leverage are a detonator. When you're on tilt, cranking size or leverage feels like the fast way back — it's actually the fast way to zero. A 100x position needs only a ~1% move against you to erase the whole margin. Revenge + leverage is the single most common way beginners nuke an account. Cut size when you're hot, don't multiply it.",
        fr: "L'émotion et le levier, c'est un détonateur. Sur tilt, augmenter la taille ou le levier ressemble au chemin rapide pour revenir — c'est en fait le chemin rapide vers zéro. Une position à 100x n'a besoin que d'un mouvement d'environ 1 % contre toi pour effacer toute la marge. Revanche + levier, c'est la façon numéro un dont les débutants font sauter un compte. Coupe la taille quand tu es chaud, ne la multiplie pas.",
      },
    },
    {
      type: "h",
      text: { en: "Build a process, not a mood", fr: "Construis un process, pas une humeur" },
    },
    {
      type: "p",
      text: {
        en: "The antidote to emotion is a written plan you follow mechanically: **entry reason, stop, target, size** — decided before you click, when your money isn't on the line and your head is clear. A trade you can't describe in one sentence is a trade you shouldn't take. The plan isn't there to make you money on any single trade; it's there to keep your worst self from touching the mouse.",
        fr: "L'antidote à l'émotion, c'est un plan écrit que tu suis mécaniquement : **raison d'entrée, stop, cible, taille** — décidés avant de cliquer, quand ton argent n'est pas en jeu et que ta tête est claire. Un trade que tu ne peux pas décrire en une phrase est un trade que tu ne devrais pas prendre. Le plan n'est pas là pour te faire gagner sur un trade donné ; il est là pour empêcher ta pire version de toucher la souris.",
      },
    },
    {
      type: "steps",
      items: [
        {
          en: "Before entry, write one sentence: why you're in, where you're wrong, where you take profit.",
          fr: "Avant d'entrer, écris une phrase : pourquoi tu entres, où tu as tort, où tu prends le profit.",
        },
        {
          en: "Set your stop and target *at the same time as the entry* — never later, never wider.",
          fr: "Pose ton stop et ta cible *en même temps que l'entrée* — jamais après, jamais plus large.",
        },
        {
          en: "Fix a daily loss limit (e.g. 3% of capital). Hit it and you're done for the day — no exceptions.",
          fr: "Fixe une limite de perte journalière (ex. 3 % du capital). Atteinte, tu t'arrêtes pour la journée — sans exception.",
        },
        {
          en: "After the trade, log the outcome and whether you followed the plan — separate the two, they're different scores.",
          fr: "Après le trade, note le résultat *et* si tu as suivi le plan — sépare les deux, ce sont deux notes différentes.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Score the decision, not the outcome", fr: "Note la décision, pas le résultat" },
    },
    {
      type: "p",
      text: {
        en: "This is the mental shift that separates pros from gamblers. A good decision can lose and a bad decision can win — that's variance. If you judge yourself only by PnL, you'll learn the wrong lessons: get rewarded for reckless trades that happened to work, and punished for disciplined ones that happened to lose. Grade every trade on **process** (did you follow the plan?) instead. Do that long enough and the money follows.",
        fr: "C'est le déclic mental qui sépare les pros des joueurs de casino. Une bonne décision peut perdre et une mauvaise peut gagner — c'est la variance. Si tu te juges seulement au PnL, tu apprends les mauvaises leçons : récompensé pour des trades imprudents qui ont marché par hasard, puni pour des trades disciplinés qui ont perdu. Note plutôt chaque trade sur le **process** (as-tu suivi le plan ?). Fais-le assez longtemps et l'argent suit.",
      },
    },
    {
      type: "example",
      title: { en: "Two traders, one week", fr: "Deux traders, une semaine" },
      rows: [
        { k: { en: "Trader A — plan followed", fr: "Trader A — plan suivi" }, v: { en: "8 / 10 trades", fr: "8 / 10 trades" } },
        { k: { en: "Trader A — week result", fr: "Trader A — résultat semaine" }, v: { en: "−$40 (variance)", fr: "−40 $ (variance)" } },
        { k: { en: "Trader B — plan followed", fr: "Trader B — plan suivi" }, v: { en: "2 / 10 trades", fr: "2 / 10 trades" } },
        { k: { en: "Trader B — week result", fr: "Trader B — résultat semaine" }, v: { en: "+$220 (lucky)", fr: "+220 $ (chance)" } },
        { k: { en: "Who survives month 3?", fr: "Qui survit au 3ᵉ mois ?" }, v: { en: "Trader A", fr: "Trader A" } },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Small rituals that kill tilt", fr: "Petits rituels qui tuent le tilt" },
      text: {
        en: "Name the emotion out loud (\"I'm angry, that's revenge\") and it loses half its grip. Step away after two losses in a row. Trade a size small enough that a loss makes you shrug, not sweat. And define, in advance, the one thing that ends your session — hit your daily stop and close the tab, win or lose.",
        fr: "Nomme l'émotion à voix haute (« je suis énervé, c'est de la revanche ») et elle perd la moitié de sa prise. Éloigne-toi après deux pertes d'affilée. Trade une taille assez petite pour qu'une perte te fasse hausser les épaules, pas transpirer. Et définis à l'avance la seule chose qui clôt ta session — stop journalier atteint, tu fermes l'onglet, gagnant ou perdant.",
      },
    },
    {
      type: "h",
      text: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "Discipline the simulator can't enforce for you", fr: "La discipline que le simulateur ne fait pas à ta place" },
      text: {
        en: "On Tide, perp trading is **simulated in Paper** with virtual capital — no borrowed money, no real leverage. Two things matter for your psychology: leverage goes up to **100x isolated**, and there is **no server-side auto-liquidation** — your realized PnL is simply floored at −margin when *you* close. Nothing stops you from riding a losing position into the ground. And your **TP/SL and limit orders are client-side triggers**: they only fire while the browser tab is open. Emotional discipline isn't optional here — the guardrails you imagine don't exist.",
        fr: "Sur Tide, le perp est **simulé en Paper** avec du capital virtuel — pas d'argent emprunté, pas de vrai levier. Deux choses comptent pour ta psychologie : le levier monte jusqu'à **100x en isolé**, et il n'y a **aucune liquidation auto côté serveur** — ton PnL réalisé est simplement plafonné à −marge quand *toi* tu fermes. Rien ne t'empêche d'accompagner une position perdante jusqu'au fond. Et tes **ordres TP/SL et limit sont des déclencheurs côté client** : ils ne se déclenchent que si l'onglet du navigateur est ouvert. La discipline émotionnelle n'est pas optionnelle ici — les garde-fous que tu imagines n'existent pas.",
      },
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Why paper trading builds real skill", fr: "Pourquoi le paper trading forge une vraie compétence" },
      text: {
        en: "Tide competitions give you real stakes — rank, pride, a leaderboard full of rivals — without the account-blowing fear that makes beginners panic. That's the ideal lab for emotional discipline: pressure to perform, but room to make mistakes. Build the habits here, then carry them into Live spot, not the other way around.",
        fr: "Les compétitions Tide te donnent de vrais enjeux — classement, fierté, un leaderboard plein de rivaux — sans la peur de faire sauter son compte qui fait paniquer les débutants. C'est le labo idéal pour la discipline émotionnelle : la pression de performer, mais le droit à l'erreur. Bâtis les habitudes ici, puis emporte-les vers le Live spot, pas l'inverse.",
      },
    },
    {
      type: "h",
      text: { en: "Your psychology checklist", fr: "Ta checklist psychologie" },
    },
    {
      type: "list",
      items: [
        {
          en: "One sentence per trade before you enter, or you don't enter.",
          fr: "Une phrase par trade avant d'entrer, sinon tu n'entres pas.",
        },
        {
          en: "A daily loss limit that closes the tab automatically in your head.",
          fr: "Une limite de perte journalière qui ferme l'onglet automatiquement dans ta tête.",
        },
        {
          en: "A journal that records *why*, not just the result.",
          fr: "Un journal qui note le *pourquoi*, pas seulement le résultat.",
        },
        {
          en: "Size small enough that no single trade can put you on tilt.",
          fr: "Une taille assez petite pour qu'aucun trade seul ne puisse te mettre sur tilt.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "The goal of a successful trader is to make the best trades. Money is secondary.",
        fr: "Le but d'un trader qui réussit, c'est de faire les meilleurs trades. L'argent est secondaire.",
      },
    },
  ],
  related: ["risk-management-101", "take-profit-stop-loss", "winning-competitions"],
};
