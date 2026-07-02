import type { RawArticle } from "../types";

/* Strategies — le pilier du cursus : position sizing, règle du 1 %, R:R,
 * espérance, drawdown, corrélation. Profondeur GOLD STANDARD alignée sur
 * what-is-trading. Ton « tu », honnête, avec caveats Tide (perp simulé,
 * TP/SL client-side, plancher -marge, pas de liquidation serveur). */
export const riskManagement101: RawArticle = {
  slug: "risk-management-101",
  category: "strategies",
  difficulty: "intermediate",
  minutes: 9,
  featured: false,
  popular: true,
  updated: "2026-07-02",
  keywords: [
    "risk management",
    "position sizing",
    "risk reward ratio",
    "stop loss",
    "1% rule",
    "trading expectancy",
    "drawdown",
    "crypto risk management",
  ],
  title: {
    en: "Risk management 101: position sizing & R:R",
    fr: "Gestion du risque 101 : sizing & R:R",
  },
  seoTitle: {
    en: "Risk Management 101: Position Sizing & Risk-Reward",
    fr: "Gestion du risque 101 : position sizing & risque-gain",
  },
  seoDescription: {
    en: "Risk management for traders: the 1% rule, position sizing, risk-reward ratios, expectancy and drawdown — with worked examples you can drill on Tide.",
    fr: "La gestion du risque pour traders : règle du 1 %, position sizing, ratios risque-gain, espérance et drawdown — avec des exemples chiffrés à répéter sur Tide.",
  },
  dek: {
    en: "You can be right less than half the time and still win. The secret isn't prediction — it's math you decide in advance.",
    fr: "Tu peux avoir raison moins d'une fois sur deux et gagner quand même. Le secret n'est pas la prédiction — c'est un calcul que tu décides à l'avance.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Ask a pro what they actually do and most say the same thing: **risk management**. Entries are guesses; risk is a decision you get to make before the market can hurt you. This is the one lesson that keeps you in the game long enough for a good strategy to pay off — master position sizing and risk-reward and you turn trading from a coin-flip into a business with an edge.",
        fr: "Demande à un pro ce qu'il fait vraiment, la plupart répondent pareil : **la gestion du risque**. Les entrées sont des paris ; le risque, lui, est une décision que tu prends avant que le marché ne puisse te faire mal. C'est la leçon qui te maintient en jeu assez longtemps pour qu'une bonne stratégie porte ses fruits — maîtrise le position sizing et le risque-gain et tu transformes le trading d'un pile ou face en un business avec un edge.",
      },
    },
    {
      type: "p",
      text: {
        en: "Here's the uncomfortable truth: most accounts don't blow up because of bad entries. They blow up because one oversized trade, held too long without a stop, erases fifty good ones. Risk management is the discipline that makes that impossible by design — not by willpower in the moment.",
        fr: "Voici la vérité qui dérange : la plupart des comptes n'explosent pas à cause de mauvaises entrées. Ils explosent parce qu'un trade trop gros, gardé trop longtemps sans stop, efface cinquante bons trades. La gestion du risque, c'est la discipline qui rend ça impossible par construction — pas par volonté sur le moment.",
      },
    },
    {
      type: "h",
      text: { en: "The 1% rule", fr: "La règle du 1 %" },
    },
    {
      type: "p",
      text: {
        en: "Never risk more than a small, fixed slice of your account on a single trade — a common floor is **1%**. Risk here means the distance from your entry to your stop-loss, *not* the position size. With a $10,000 account, 1% is $100 of risk per trade. Lose ten in a row — rare if you have any edge — and you're down about 10%, bruised but very much alive.",
        fr: "Ne risque jamais plus qu'une petite fraction fixe de ton compte sur un seul trade — un plancher courant est **1 %**. Le risque ici, c'est la distance entre ton entrée et ton stop-loss, *pas* la taille de la position. Avec un compte de 10 000 $, 1 % = 100 $ de risque par trade. Perds dix fois de suite — rare si tu as un edge — et tu es à environ −10 %, amoché mais bien vivant.",
      },
    },
    {
      type: "p",
      text: {
        en: "The magic of a fixed percentage is that it's **self-correcting**. When you're winning, 1% is a bigger dollar amount, so you press the advantage. When you're losing, each 1% is smaller, so the account bleeds slower and gives you room to recover. Your size breathes with your equity automatically.",
        fr: "La force d'un pourcentage fixe, c'est qu'il est **auto-correcteur**. Quand tu gagnes, 1 % représente plus de dollars, donc tu appuies sur ton avantage. Quand tu perds, chaque 1 % est plus petit, donc le compte saigne plus lentement et te laisse de la marge pour revenir. Ta taille respire avec ton equity, automatiquement.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Aggressive** — 2% per trade. Faster growth, deeper drawdowns. Only once you're consistently profitable.",
          fr: "**Agressif** — 2 % par trade. Croissance plus rapide, drawdowns plus profonds. Seulement une fois régulièrement profitable.",
        },
        {
          en: "**Standard** — 1% per trade. The reference for most disciplined traders.",
          fr: "**Standard** — 1 % par trade. La référence pour la plupart des traders disciplinés.",
        },
        {
          en: "**Conservative** — 0.5% per trade. Slower, but it survives brutal losing streaks and keeps your head clear.",
          fr: "**Prudent** — 0,5 % par trade. Plus lent, mais survit aux séries perdantes brutales et garde la tête froide.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Position sizing: work backwards", fr: "Position sizing : remonte le calcul" },
    },
    {
      type: "p",
      text: {
        en: "This is the mistake almost every beginner makes: they pick a size first (\"I'll buy $2,000 of this\") and *then* look for a stop. Reverse it. Your **stop distance decides your size**, never the other way around. The formula is one line: `size = risk amount ÷ stop distance`. A tight stop lets you take a bigger position for the same $100 of risk; a wide stop forces a smaller one.",
        fr: "C'est l'erreur que fait presque tout débutant : il choisit d'abord une taille (« j'achète pour 2 000 $ ») *puis* cherche un stop. Inverse. C'est ta **distance de stop qui décide ta taille**, jamais l'inverse. La formule tient en une ligne : `taille = montant risqué ÷ distance du stop`. Un stop serré t'autorise une position plus grosse pour les mêmes 100 $ de risque ; un stop large en impose une plus petite.",
      },
    },
    {
      type: "example",
      title: { en: "Sizing a trade", fr: "Dimensionner un trade" },
      rows: [
        { k: { en: "Account", fr: "Compte" }, v: { en: "$10,000", fr: "10 000 $" } },
        { k: { en: "Risk per trade (1%)", fr: "Risque/trade (1 %)" }, v: { en: "$100", fr: "100 $" } },
        { k: { en: "Entry / stop", fr: "Entrée / stop" }, v: { en: "$100 / $95", fr: "100 $ / 95 $" } },
        { k: { en: "Stop distance", fr: "Distance du stop" }, v: { en: "$5 (5%)", fr: "5 $ (5 %)" } },
        { k: { en: "Position size", fr: "Taille" }, v: { en: "$100 ÷ $5 = 20 units", fr: "100 $ ÷ 5 $ = 20 unités" } },
        { k: { en: "Capital deployed", fr: "Capital engagé" }, v: { en: "20 × $100 = $2,000", fr: "20 × 100 $ = 2 000 $" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "Notice you deployed $2,000 of capital but only ever risked $100. If the stop hits, you lose $100 — 1% of the account — even though a fifth of your money was on the table. That gap between *capital deployed* and *capital at risk* is the whole trick. Learn to think in risk, not in position size.",
        fr: "Remarque : tu as engagé 2 000 $ de capital mais tu n'as jamais risqué que 100 $. Si le stop saute, tu perds 100 $ — 1 % du compte — alors même qu'un cinquième de ton argent était sur la table. Cet écart entre *capital engagé* et *capital à risque*, c'est tout le truc. Apprends à raisonner en risque, pas en taille de position.",
      },
    },
    {
      type: "h",
      text: { en: "Risk-to-reward (R:R)", fr: "Risque-sur-gain (R:R)" },
    },
    {
      type: "p",
      text: {
        en: "Before entering, compare what you risk to what you realistically aim to make. Risk $100 to make $200 and that's a **2:1** trade. R:R is powerful because it decouples profit from being right: at 2:1 you only need to win about **1 time in 3** just to break even. Clear that bar and you're printing. This is precisely why a trader who loses more than half their trades can still be very profitable — the winners are simply bigger than the losers.",
        fr: "Avant d'entrer, compare ce que tu risques à ce que tu vises réellement. Risquer 100 $ pour en gagner 200, c'est un trade **2:1**. Le R:R est puissant parce qu'il découple le profit du fait d'avoir raison : à 2:1 tu n'as besoin de gagner qu'environ **une fois sur trois** juste pour être à l'équilibre. Passe ce seuil et tu imprimes. C'est exactement pour ça qu'un trader perdant plus d'une fois sur deux peut rester très profitable — ses gains sont simplement plus gros que ses pertes.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**1:1** — you need to win **50%+** just to break even. Rarely worth it.",
          fr: "**1:1** — il te faut gagner **50 %+** juste pour l'équilibre. Rarement rentable.",
        },
        {
          en: "**2:1** — break-even at a **33%** win rate. The classic sweet spot.",
          fr: "**2:1** — équilibre à **33 %** de réussite. Le sweet spot classique.",
        },
        {
          en: "**3:1** — break-even at just **25%**. Fewer of these set up, but they carry a portfolio.",
          fr: "**3:1** — équilibre à seulement **25 %**. Plus rares, mais ils portent un portefeuille.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Expectancy: the number that pays you", fr: "L'espérance : le chiffre qui te paie" },
    },
    {
      type: "p",
      text: {
        en: "Win rate and R:R only mean something when you multiply them together. That product is **expectancy** — your average profit or loss per trade over a large sample. The formula: `expectancy = (win rate × average win) − (loss rate × average loss)`. A positive number means the more you trade, the more you make. A negative number means volume just accelerates the bleed.",
        fr: "Le taux de réussite et le R:R ne veulent rien dire tant que tu ne les multiplies pas. Ce produit, c'est l'**espérance** — ton gain ou perte moyen par trade sur un grand échantillon. La formule : `espérance = (taux de gain × gain moyen) − (taux de perte × perte moyenne)`. Un chiffre positif veut dire que plus tu trades, plus tu gagnes. Un chiffre négatif veut dire que le volume ne fait qu'accélérer l'hémorragie.",
      },
    },
    {
      type: "example",
      title: { en: "A losing majority that still wins", fr: "Une majorité perdante qui gagne quand même" },
      rows: [
        { k: { en: "Win rate", fr: "Taux de réussite" }, v: { en: "40% (4 wins / 10)", fr: "40 % (4 gains / 10)" } },
        { k: { en: "Average win", fr: "Gain moyen" }, v: { en: "+$200", fr: "+200 $" } },
        { k: { en: "Average loss", fr: "Perte moyenne" }, v: { en: "−$100", fr: "−100 $" } },
        { k: { en: "Expectancy / trade", fr: "Espérance / trade" }, v: { en: "(0.4×200) − (0.6×100) = +$20", fr: "(0,4×200) − (0,6×100) = +20 $" } },
        { k: { en: "Net over 100 trades", fr: "Net sur 100 trades" }, v: { en: "+$2,000", fr: "+2 000 $" } },
      ],
    },
    {
      type: "p",
      text: {
        en: "Six losses out of ten and the account still climbs. That's the whole point of risk management: you stop chasing a high win rate and start engineering a **positive expectancy** you can repeat. Track yours on Tide's leaderboard and let a big sample tell you the truth about your edge.",
        fr: "Six pertes sur dix et le compte monte quand même. C'est tout l'intérêt de la gestion du risque : tu arrêtes de courir après un taux de réussite élevé et tu commences à fabriquer une **espérance positive** que tu peux répéter. Suis la tienne sur le leaderboard de Tide et laisse un grand échantillon te dire la vérité sur ton edge.",
      },
    },
    {
      type: "h",
      text: { en: "Drawdown and the math of recovery", fr: "Drawdown et la maths de la remontée" },
    },
    {
      type: "p",
      text: {
        en: "Losses hurt more than the symmetric gain suggests, because you recover on a smaller base. Lose 10% and you need +11% to get back. Lose 50% and you need a brutal **+100%** just to break even. This asymmetry is why capping risk per trade matters so much: protecting the downside isn't caution for its own sake — it's protecting your ability to compound.",
        fr: "Les pertes font plus mal que le gain symétrique ne le laisse croire, parce que tu remontes sur une base plus petite. Perds 10 % et il te faut +11 % pour revenir. Perds 50 % et il te faut un brutal **+100 %** juste pour l'équilibre. Cette asymétrie explique pourquoi plafonner le risque par trade compte autant : protéger le downside n'est pas de la prudence gratuite — c'est protéger ta capacité à composer.",
      },
    },
    {
      type: "example",
      title: { en: "The cost of a drawdown", fr: "Le coût d'un drawdown" },
      rows: [
        { k: { en: "Drawdown −10%", fr: "Drawdown −10 %" }, v: { en: "need +11% back", fr: "besoin de +11 %" } },
        { k: { en: "Drawdown −25%", fr: "Drawdown −25 %" }, v: { en: "need +33% back", fr: "besoin de +33 %" } },
        { k: { en: "Drawdown −50%", fr: "Drawdown −50 %" }, v: { en: "need +100% back", fr: "besoin de +100 %" } },
        { k: { en: "Drawdown −75%", fr: "Drawdown −75 %" }, v: { en: "need +300% back", fr: "besoin de +300 %" } },
      ],
    },
    {
      type: "h",
      text: { en: "Leverage multiplies the risk, not just the reward", fr: "Le levier multiplie le risque, pas que le gain" },
    },
    {
      type: "p",
      text: {
        en: "Leverage lets you control a bigger position than your cash. It scales your P&L in *both* directions — a 5x long doubles your money on a +20% move and erases your margin on a −20% move. Leverage never changes your risk *rule*; it just makes a wide stop and an oversized position far more lethal. Size from your stop first, then decide if leverage is even needed.",
        fr: "Le levier te laisse contrôler une position plus grosse que ton cash. Il multiplie ton P&L dans les *deux* sens — un long 5x double ta mise sur un mouvement de +20 % et efface ta marge sur un −20 %. Le levier ne change jamais ta *règle* de risque ; il rend juste un stop large et une position surdimensionnée bien plus létaux. Dimensionne d'abord depuis ton stop, puis demande-toi si le levier est même utile.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How leverage works on Tide", fr: "Comment marche le levier sur Tide" },
      text: {
        en: "Perp on Tide is **simulated in Paper only** — no real leverage, no borrowed money. Leverage goes up to **100x** on **isolated margin**, and there is **no server-side auto-liquidation**: your realized loss is simply **floored at your margin** when you close. Your **TP and SL are client-side triggers** — the browser tab has to stay open for them to fire, and only the resulting execution is reported to the backend. Treat it as a place to drill risk math consequence-free, not as a live liquidation engine.",
        fr: "Le perp sur Tide est **simulé en Paper uniquement** — pas de vrai levier, pas d'argent emprunté. Le levier monte jusqu'à **100x** en **marge isolée**, et il n'y a **aucune liquidation auto côté serveur** : ta perte réalisée est simplement **plafonnée à ta marge** à la fermeture. Tes **TP et SL sont des déclencheurs côté client** — l'onglet du navigateur doit rester ouvert pour qu'ils partent, et seule l'exécution qui en résulte remonte au backend. Vois-le comme un terrain pour répéter la maths du risque sans conséquence, pas comme un moteur de liquidation live.",
      },
    },
    {
      type: "h",
      text: { en: "Don't forget correlation and fees", fr: "N'oublie ni la corrélation ni les frais" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Correlation** — five long altcoins isn't five 1% trades, it's one 5% bet in disguise. When BTC dumps, they all dump together. Count correlated positions as one risk.",
          fr: "**Corrélation** — cinq altcoins en long, ce n'est pas cinq trades à 1 %, c'est un pari à 5 % déguisé. Quand BTC plonge, ils plongent tous ensemble. Compte les positions corrélées comme un seul risque.",
        },
        {
          en: "**Fees eat the edge** — on Tide, opening a perp costs **maker 0.02% / taker 0.06%**. Small per trade, but they compound; bake them into your R:R so a 1.1:1 setup isn't secretly break-even.",
          fr: "**Les frais grignotent l'edge** — sur Tide, ouvrir un perp coûte **maker 0,02 % / taker 0,06 %**. Petit par trade, mais ça s'accumule ; intègre-les à ton R:R pour qu'un setup à 1,1:1 ne soit pas secrètement à l'équilibre.",
        },
        {
          en: "**Total heat** — cap the sum of all open risk (say 3–5% of the account) so a bad day can't cascade.",
          fr: "**Chaleur totale** — plafonne la somme de tout le risque ouvert (disons 3 à 5 % du compte) pour qu'une mauvaise journée ne fasse pas boule de neige.",
        },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: { en: "Where Tide is perfect for this", fr: "Là où Tide est parfait pour ça" },
      text: {
        en: "Risk rules are boring until they save you — and brutal to learn with real money. Practice sizing every single trade on the Paper terminal, on real top-250 crypto prices, until the math is a reflex. Over a full season the competition leaderboard quietly rewards the disciplined, not the lucky. Nail your process here for free, then carry a proven track record into Live spot.",
        fr: "Les règles de risque sont ennuyeuses jusqu'à ce qu'elles te sauvent — et brutales à apprendre avec de l'argent réel. Entraîne-toi à dimensionner chaque trade sur le terminal Paper, sur les vrais prix du top 250 crypto, jusqu'à ce que le calcul soit un réflexe. Sur une saison entière, le leaderboard récompense discrètement les disciplinés, pas les chanceux. Rode ton process ici gratuitement, puis emporte un track record prouvé vers le Live spot.",
      },
    },
    {
      type: "h",
      text: { en: "Your risk checklist before every click", fr: "Ta checklist risque avant chaque clic" },
    },
    {
      type: "steps",
      items: [
        {
          en: "Decide your **stop-loss** first — the price that proves the idea wrong.",
          fr: "Décide ton **stop-loss** en premier — le prix qui prouve que l'idée est fausse.",
        },
        {
          en: "Set risk at **1%** of the account and compute size with `risk ÷ stop distance`.",
          fr: "Fixe le risque à **1 %** du compte et calcule la taille avec `risque ÷ distance du stop`.",
        },
        {
          en: "Check the target gives you at least **2:1** R:R after fees — if not, skip the trade.",
          fr: "Vérifie que la cible offre au moins **2:1** de R:R après frais — sinon, passe ton tour.",
        },
        {
          en: "Confirm it isn't correlated with positions you already hold.",
          fr: "Confirme qu'il n'est pas corrélé à des positions que tu tiens déjà.",
        },
        {
          en: "Log *why* you entered, then let a large sample judge your expectancy.",
          fr: "Note *pourquoi* tu es entré, puis laisse un grand échantillon juger ton espérance.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "Take care of the losses and the profits will take care of themselves.",
        fr: "Occupe-toi des pertes, les profits s'occuperont d'eux-mêmes.",
      },
    },
  ],
  related: ["leverage-and-margin", "take-profit-stop-loss", "trading-psychology"],
};
