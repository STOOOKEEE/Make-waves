import type { RawArticle } from "../types";

/* Platform — cagnotte, rake, classement, split-pot. Exactitude : pool =
 * buy-in × participants ; rake = pool × ratio ; distribuable = pool − rake ;
 * split-pot en cas d'ex-aequo ; payout par poids ; versement on-chain multisig.
 * GOLD-STANDARD de profondeur : ~20+ blocs, sections H2 riches, exemples chiffrés,
 * caveats produit Tide en callout « warn », SEO complet. Ton « tu », compétitif. */
export const winningCompetitions: RawArticle = {
  slug: "winning-competitions",
  category: "platform",
  difficulty: "beginner",
  minutes: 9,
  popular: true,
  updated: "2026-07-02",
  keywords: [
    "trading competitions",
    "how to win trading competitions",
    "prize pool",
    "leaderboard",
    "paper trading contest",
    "buy-in rake",
    "net return ranking",
    "tide competitions",
  ],
  title: {
    en: "How Tide competitions work",
    fr: "Comment marchent les compétitions Tide",
  },
  seoTitle: {
    en: "How to Win Trading Competitions: Prize Pools & Ranking",
    fr: "Gagner les compétitions de trading : cagnottes & classement",
  },
  seoDescription: {
    en: "How trading competitions work on Tide: prize pool math, the poker-style rake, net-return ranking, split-pot ties, on-chain payouts, and how to actually win.",
    fr: "Comment marchent les compétitions de trading sur Tide : calcul de la cagnotte, rake façon poker, classement au rendement net, split-pot, paiements on-chain, et comment gagner.",
  },
  dek: {
    en: "Same capital, same markets, one leaderboard. Here's how prize pools, ranking and payouts actually work — and how to finish on the podium.",
    fr: "Même capital, mêmes marchés, un seul classement. Voici comment fonctionnent vraiment cagnottes, classement et paiements — et comment monter sur le podium.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Trading competitions turn practice into a game with stakes. Everyone starts a season or tournament with the **same virtual capital**, trades the same live markets, and is ranked by net return. It's the fairest possible test of skill — nobody has more money, insider fills or a bigger account than you. Win a trading competition and you've proven your edge against a crowd, not against a backtest. This guide breaks down the mechanics, the money, and the mindset that gets you to the top.",
        fr: "Les compétitions de trading transforment l'entraînement en jeu à enjeux. Chacun démarre une saison ou un tournoi avec le **même capital virtuel**, trade les mêmes marchés live, et est classé au rendement net. Le test de compétence le plus juste possible — personne n'a plus d'argent, de meilleures exécutions ni un plus gros compte que toi. Gagner une compétition de trading, c'est prouver ton edge face à une foule, pas face à un backtest. Ce guide décortique la mécanique, l'argent, et le mindset qui te mène au sommet.",
      },
    },
    {
      type: "h",
      text: { en: "The prize pool & the rake", fr: "La cagnotte & le rake" },
    },
    {
      type: "p",
      text: {
        en: "When a competition has a buy-in, every entry adds to the **prize pool**: `pool = buy-in × participants`. Tide takes a small, poker-style cut called the **rake** to run the platform, and the rest — the **distributable** pool — is paid out to winners. Crucially, Tide charges *no fee on your swaps*: the rake on tournament entry is the entire business model, not a tax skimmed off every trade you make.",
        fr: "Quand une compétition a un buy-in, chaque inscription grossit la **cagnotte** : `cagnotte = buy-in × participants`. Tide prélève une petite part façon poker, le **rake**, pour faire tourner la plateforme, et le reste — la cagnotte **distribuable** — va aux gagnants. Point clé : Tide ne prend *aucun frais sur tes swaps* : le rake à l'inscription est tout le modèle économique, pas une taxe grattée sur chaque trade que tu passes.",
      },
    },
    {
      type: "example",
      title: { en: "Prize pool math", fr: "Le calcul de la cagnotte" },
      rows: [
        { k: { en: "Buy-in", fr: "Buy-in" }, v: { en: "$20 per entry", fr: "20 $ par inscription" } },
        { k: { en: "Participants", fr: "Participants" }, v: { en: "200", fr: "200" } },
        { k: { en: "Prize pool", fr: "Cagnotte" }, v: { en: "$4,000", fr: "4 000 $" } },
        { k: { en: "Rake (10%)", fr: "Rake (10 %)" }, v: { en: "−$400", fr: "−400 $" } },
        { k: { en: "Distributable", fr: "Distribuable" }, v: { en: "$3,600 to winners", fr: "3 600 $ aux gagnants" } },
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Free to start", fr: "Gratuit pour commencer" },
      text: {
        en: "Many Tide competitions are free to enter — you climb the leaderboard for rank and rewards with nothing at stake. Paid buy-ins, when enabled, are always requested as a separate, clearly-signed step. You never pay by accident.",
        fr: "Beaucoup de compétitions Tide sont gratuites — tu grimpes au classement pour le rang et les récompenses sans rien miser. Les buy-ins payants, quand ils sont activés, sont toujours demandés dans une étape séparée et clairement signée. Tu ne paies jamais par accident.",
      },
    },
    {
      type: "h",
      text: { en: "How you're ranked: net return", fr: "Comment tu es classé : le rendement net" },
    },
    {
      type: "p",
      text: {
        en: "The leaderboard sorts everyone by **net return** — how much your account grew or shrank in percentage terms over the competition window. Because everyone starts from the same virtual capital, a raw dollar figure and a percentage tell the same story, so the ranking is pure skill. Your PnL includes both your **spot** trades (settled to your cash balance) and your simulated **perp** positions (valued at the server price), so every kind of trade counts toward your rank.",
        fr: "Le classement trie tout le monde au **rendement net** — de combien ton compte a grossi ou fondu en pourcentage sur la fenêtre de la compétition. Comme chacun part du même capital virtuel, un montant brut en dollars et un pourcentage racontent la même histoire, donc le classement est de la pure compétence. Ton PnL inclut à la fois tes trades **spot** (réglés sur ton cash) et tes positions **perp** simulées (valorisées au prix serveur) — chaque type de trade compte pour ton rang.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Net return** — realized *and* unrealized PnL, so an open winner counts, but so does an open loser. There's nowhere to hide a bad position.",
          fr: "**Rendement net** — PnL réalisé *et* latent, donc un gagnant ouvert compte, mais un perdant ouvert aussi. Impossible de planquer une mauvaise position.",
        },
        {
          en: "**Same window for all** — the clock starts and ends at the same moment for every trader, so timing luck is minimized.",
          fr: "**Même fenêtre pour tous** — l'horloge démarre et s'arrête au même instant pour chaque trader, donc la chance du timing est réduite au minimum.",
        },
        {
          en: "**Live prices** — markets are the top 250 crypto by market cap on live data. Same fills, same spread, same slippage for everyone.",
          fr: "**Prix live** — les marchés sont les 250 plus grosses cryptos en capitalisation sur données live. Mêmes exécutions, même spread, même slippage pour tous.",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "How it works on Tide", fr: "Comment ça marche sur Tide" },
      text: {
        en: "Perp on Tide is **simulated in Paper only** — no real leverage, no borrowed money. Leverage is capped at **100x**, margin is **isolated**, and realized PnL is **floored at −margin** when you close. There is **no server-side auto-liquidation**: a losing perp keeps dragging your net return until you close it, at which point the loss can't exceed the margin you put up. Great for climbing fast; brutal if you leave a bad trade open.",
        fr: "Le perp sur Tide est **simulé en Paper uniquement** — pas de vrai levier, pas d'argent emprunté. Le levier est plafonné à **100x**, la marge est **isolée**, et le PnL réalisé est **plancher à −marge** quand tu fermes. Il n'y a **pas de liquidation auto côté serveur** : un perp perdant continue de plomber ton rendement net tant que tu ne le fermes pas, moment où la perte ne peut pas dépasser la marge engagée. Idéal pour grimper vite ; brutal si tu laisses un mauvais trade ouvert.",
      },
    },
    {
      type: "h",
      text: { en: "The costs that eat your edge", fr: "Les coûts qui grignotent ton edge" },
    },
    {
      type: "p",
      text: {
        en: "Even with no fee on swaps, competition trading isn't frictionless. When you open a position you pay a trading fee — **maker 0.02%, taker 0.06%** — and you cross the **spread** on every entry and exit. In a tight race decided by a fraction of a percent, over-trading is how you quietly hand your edge back to the market. Fewer, better trades usually out-rank a hundred nervous clicks.",
        fr: "Même sans frais sur les swaps, trader en compétition n'est pas sans friction. Quand tu ouvres une position tu paies un frais de trading — **maker 0,02 %, taker 0,06 %** — et tu franchis le **spread** à chaque entrée et sortie. Dans une course serrée qui se joue à une fraction de pour cent, sur-trader c'est rendre discrètement ton edge au marché. Moins de trades, mais meilleurs, classent souvent mieux que cent clics nerveux.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Maker 0.02%** — you post a resting limit order and add liquidity. Cheaper, but you might not get filled.",
          fr: "**Maker 0,02 %** — tu poses un ordre limit qui attend et apportes de la liquidité. Moins cher, mais tu risques de ne pas être exécuté.",
        },
        {
          en: "**Taker 0.06%** — you hit the market and take liquidity now. Instant fill, higher cost.",
          fr: "**Taker 0,06 %** — tu tapes au marché et prends la liquidité tout de suite. Exécution immédiate, coût plus élevé.",
        },
        {
          en: "**Spread** — the gap between best bid and best ask. On thin markets it can cost more than the fee itself.",
          fr: "**Spread** — l'écart entre meilleur achat et meilleure vente. Sur les marchés peu liquides, il peut coûter plus que le frais lui-même.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "How winners are paid", fr: "Comment les gagnants sont payés" },
    },
    {
      type: "list",
      items: [
        {
          en: "**Weighted payouts** — the pool is split by finishing position, more to the top ranks, tapering down through the paid places.",
          fr: "**Paiements pondérés** — la cagnotte est répartie selon la place finale, davantage vers le haut du classement, en dégradé jusqu'aux dernières places payées.",
        },
        {
          en: "**Split-pot on ties** — if traders tie on the same rank, they pool the tiers they cover and split them equally. No coin-flips, no ambiguity.",
          fr: "**Split-pot en cas d'ex-aequo** — si des traders sont à égalité sur un même rang, ils mettent en commun les tranches concernées et les partagent équitablement. Pas de pile ou face, pas d'ambiguïté.",
        },
        {
          en: "**Largest-remainder rounding** — leftover cents from splitting are handed out fairly, so the payouts always add up to the exact pool.",
          fr: "**Arrondi au plus grand reste** — les centimes résiduels du partage sont distribués équitablement, pour que les paiements totalisent exactement la cagnotte.",
        },
        {
          en: "**Paid on-chain** — when rewards are enabled, prizes are sent as XRPL payments from a multisig operator account at the close. Verifiable, not a promise.",
          fr: "**Versé on-chain** — quand les récompenses sont activées, les prix sont envoyés en paiements XRPL depuis un compte opérateur multisig à la clôture. Vérifiable, pas une promesse.",
        },
      ],
    },
    {
      type: "example",
      title: { en: "Splitting a $3,600 pool, top 3", fr: "Partage d'une cagnotte de 3 600 $, top 3" },
      rows: [
        { k: { en: "1st place (50%)", fr: "1re place (50 %)" }, v: { en: "$1,800", fr: "1 800 $" } },
        { k: { en: "2nd place (30%)", fr: "2e place (30 %)" }, v: { en: "$1,080", fr: "1 080 $" } },
        { k: { en: "3rd place (20%)", fr: "3e place (20 %)" }, v: { en: "$720", fr: "720 $" } },
        { k: { en: "Tie for 2nd (2 traders)", fr: "Ex-aequo 2e (2 traders)" }, v: { en: "split of 2nd+3rd = $900 each", fr: "partage 2e+3e = 900 $ chacun" } },
      ],
    },
    {
      type: "h",
      text: { en: "Sprints vs seasons: two different games", fr: "Sprints vs saisons : deux jeux différents" },
    },
    {
      type: "p",
      text: {
        en: "A short **sprint** (a few hours or a day) rewards aggression: you often need one or two high-conviction moves to leap the field, and playing it safe means finishing mid-pack. A long **season** rewards the opposite — consistency, small compounding gains, and dodging the account-ending drawdown. Read the format before you touch size. The trade that wins a sprint is exactly the trade that loses a season.",
        fr: "Un **sprint** court (quelques heures ou une journée) récompense l'agressivité : il te faut souvent un ou deux coups à forte conviction pour bondir devant le peloton, et jouer safe c'est finir dans le ventre mou. Une longue **saison** récompense l'inverse — la régularité, les petits gains qui composent, et éviter le drawdown qui tue le compte. Lis le format avant de toucher à ta taille. Le trade qui gagne un sprint est exactement celui qui perd une saison.",
      },
    },
    {
      type: "h",
      text: { en: "Playing to win", fr: "Jouer pour gagner" },
    },
    {
      type: "steps",
      items: [
        {
          en: "**Know the window and payout curve** before you enter. A winner-take-all sprint and a top-50 season demand completely different risk.",
          fr: "**Connais la fenêtre et la courbe de paiement** avant de t'inscrire. Un sprint winner-take-all et une saison payant le top 50 demandent un risque totalement différent.",
        },
        {
          en: "**Size for survival.** In a season, a blown account scores zero for every day that's left — protect the downside first, chase upside second.",
          fr: "**Dimensionne pour survivre.** En saison, un compte explosé marque zéro pour chaque jour restant — protège le downside d'abord, cours après l'upside ensuite.",
        },
        {
          en: "**Watch the gap to the ranks around you.** Near the end, matching the leader's exposure to hold your place beats gambling for one you can't reach.",
          fr: "**Surveille l'écart avec les rangs autour de toi.** Vers la fin, coller à l'exposition du leader pour tenir ta place bat le pari pour une place hors d'atteinte.",
        },
        {
          en: "**Close what you can't babysit.** No auto-liquidation means an open perp keeps moving your rank even while you sleep.",
          fr: "**Ferme ce que tu ne peux pas surveiller.** Pas de liquidation auto veut dire qu'un perp ouvert continue de bouger ton rang même pendant que tu dors.",
        },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "TP/SL are on your side of the screen", fr: "TP/SL sont de ton côté de l'écran" },
      text: {
        en: "On Tide, **take-profit, stop-loss and limit orders are client-side triggers** — they only fire while your browser tab is open. Close the tab and your safety net closes with it; only executions are reported to the backend. In a multi-day season, don't lean on an SL you left running overnight. Manage the position, or flatten it before you walk away.",
        fr: "Sur Tide, **take-profit, stop-loss et ordres limit sont des déclencheurs côté client** — ils ne se déclenchent que tant que ton onglet est ouvert. Ferme l'onglet et ton filet de sécurité se ferme avec ; seules les exécutions remontent au backend. Sur une saison de plusieurs jours, ne compte pas sur un SL laissé tourner la nuit. Gère la position, ou solde-la avant de partir.",
      },
    },
    {
      type: "h",
      text: { en: "From Paper podium to Live", fr: "Du podium Paper au Live" },
    },
    {
      type: "p",
      text: {
        en: "Competitions live entirely in Paper — that's where the leaderboard, the perp simulation and the prize logic run. When you're ready to trade for real, **Live mode** is a separate world: a real **spot** swap, **XRP against RLUSD only**, signed non-custodially with Xaman or GemWallet and tagged with a SourceTag. There's no leverage in Live and no perp — a competition record is proof of skill, and Live is where you put a hard-earned edge to work with your own money.",
        fr: "Les compétitions vivent entièrement en Paper — c'est là que tournent le classement, la simulation perp et la logique de cagnotte. Quand tu es prêt à trader pour de vrai, le **mode Live** est un autre monde : un vrai swap **spot**, **XRP contre RLUSD uniquement**, signé de façon non-custodiale avec Xaman ou GemWallet et taggé d'un SourceTag. Pas de levier en Live, pas de perp — un palmarès en compétition est une preuve de compétence, et le Live est là où tu mets un edge durement acquis au service de ton propre argent.",
      },
    },
    {
      type: "quote",
      text: {
        en: "You don't win a season on your best day. You win it by not losing it on your worst.",
        fr: "Tu ne gagnes pas une saison sur ton meilleur jour. Tu la gagnes en ne la perdant pas sur ton pire.",
      },
    },
  ],
  related: ["how-tide-works", "trading-psychology", "on-chain-track-record"],
};
