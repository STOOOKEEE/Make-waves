import type { RawArticle } from "../types";

/** Règles alignées sur le runtime réel : ticket XRP, pool vérifiée, un gagnant. */
export const winningCompetitions: RawArticle = {
  slug: "winning-competitions",
  category: "platform",
  difficulty: "beginner",
  minutes: 7,
  popular: true,
  updated: "2026-07-18",
  keywords: [
    "trading competition",
    "winner takes all",
    "xrp entry ticket",
    "paper trading contest",
    "xrpl prize pool",
  ],
  title: {
    en: "How Tide competitions work",
    fr: "Comment marchent les compétitions Tide",
  },
  seoTitle: {
    en: "Tide Trading Competitions: XRP Tickets & Winner-Takes-All",
    fr: "Compétitions Tide : tickets XRP & winner-takes-all",
  },
  seoDescription: {
    en: "The real Tide competition flow: signed XRP entry tickets, verified pool, return-based ranking and a winner-takes-all multisig payout.",
    fr: "Le vrai parcours des compétitions Tide : ticket XRP signé, pool vérifiée, classement au rendement et payout multisig winner-takes-all.",
  },
  dek: {
    en: "One signed ticket, one verified pool, one winner. No fictional pot and no hidden cut.",
    fr: "Un ticket signé, une pool vérifiée, un gagnant. Aucune cagnotte fictive ni prélèvement caché.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "A Tide competition is no longer a presentation catalogue filled with sample players. Every competition shown by the app exists in the backend database. Every participant has paid the exact **XRP entry ticket**, and every row in the leaderboard is calculated from the participant's real persisted trading account.",
        fr: "Une compétition Tide n'est plus un catalogue de présentation rempli de joueurs d'exemple. Chaque compétition affichée existe dans la base du backend. Chaque participant a payé le **ticket d'entrée en XRP** exact, et chaque ligne du classement est calculée depuis son vrai compte de trading persisté.",
      },
    },
    {
      type: "h",
      text: { en: "The ticket and the pool", fr: "Le ticket et la pool" },
    },
    {
      type: "p",
      text: {
        en: "The pool follows one transparent equation: `pool = XRP ticket × verified entries`. Tide does not accept a participant count from the browser. It counts only entry payments that the server can find in a validated XRPL ledger with `tesSUCCESS`, the expected prize-pool destination, amount, SourceTag and competition memo.",
        fr: "La pool suit une équation transparente : `pool = ticket XRP × entrées vérifiées`. Tide n'accepte jamais un nombre de participants envoyé par le navigateur. Le serveur compte uniquement les paiements retrouvés dans un ledger XRPL validé avec `tesSUCCESS`, la bonne destination, le bon montant, le SourceTag et le mémo de la compétition.",
      },
    },
    {
      type: "example",
      title: { en: "A real 50-player pool", fr: "Une vraie pool de 50 joueurs" },
      rows: [
        { k: { en: "Entry ticket", fr: "Ticket d'entrée" }, v: { en: "0.01 XRP", fr: "0,01 XRP" } },
        { k: { en: "Verified entries", fr: "Entrées vérifiées" }, v: { en: "50", fr: "50" } },
        { k: { en: "Prize pool", fr: "Cagnotte" }, v: { en: "0.50 XRP", fr: "0,50 XRP" } },
        { k: { en: "Platform rake", fr: "Rake plateforme" }, v: { en: "0 XRP", fr: "0 XRP" } },
        { k: { en: "Winner payout", fr: "Payout gagnant" }, v: { en: "0.50 XRP", fr: "0,50 XRP" } },
      ],
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "You sign the ticket", fr: "Tu signes le ticket" },
      text: {
        en: "The browser cannot choose the amount or the prize-pool address. The server builds the exact Payment, then you approve or reject it in Xaman or GemWallet. A signed transaction is still not enough: Tide waits for validated-ledger proof before enrolling you.",
        fr: "Le navigateur ne peut choisir ni le montant ni l'adresse du prize pool. Le serveur construit le Payment exact, puis tu l'acceptes ou le refuses dans Xaman ou GemWallet. Une transaction signée ne suffit pas : Tide attend sa preuve dans un ledger validé avant de t'inscrire.",
      },
    },
    {
      type: "h",
      text: { en: "How the Paper ranking works", fr: "Comment fonctionne le classement Paper" },
    },
    {
      type: "p",
      text: {
        en: "At entry, Tide records your current Paper equity. Your score is the percentage return from that snapshot: `(current equity − entry equity) / entry equity`. Spot holdings and open Paper perp PnL are valued with current server prices. This normalizes accounts of different sizes without pretending everyone was reset to a fictional portfolio.",
        fr: "À l'inscription, Tide enregistre ton equity Paper courante. Ton score est le rendement en pourcentage depuis ce snapshot : `(equity courante − equity d'entrée) / equity d'entrée`. Les avoirs spot et le PnL des perps Paper ouverts sont valorisés aux prix serveur. Cela normalise des comptes de tailles différentes sans prétendre que tout le monde a été remis à zéro sur un portefeuille fictif.",
      },
    },
    {
      type: "list",
      items: [
        {
          en: "**Persisted trades only** — refreshing the browser does not reset the account or the ranking.",
          fr: "**Trades persistés uniquement** — rafraîchir le navigateur ne remet ni le compte ni le classement à zéro.",
        },
        {
          en: "**Server prices** — the client cannot submit an equity or a final score.",
          fr: "**Prix serveur** — le client ne peut envoyer ni equity ni score final.",
        },
        {
          en: "**Deterministic tie-break** — equal returns are ordered by the earliest verified entry, then by account id.",
          fr: "**Départage déterministe** — à rendement égal, la première entrée vérifiée passe devant, puis l'identifiant de compte départage.",
        },
      ],
    },
    {
      type: "callout",
      variant: "info",
      title: { en: "Live competitions fail closed", fr: "Les compétitions Live échouent proprement" },
      text: {
        en: "A Live competition needs a real on-chain PnL indexer. If that provider is not configured, Tide displays no Paper substitute and returns an explicit unavailable state. It never fills a Live leaderboard with simulated results.",
        fr: "Une compétition Live a besoin d'un vrai indexeur de PnL on-chain. S'il n'est pas configuré, Tide n'affiche aucun substitut Paper et renvoie un état indisponible explicite. Un classement Live n'est jamais rempli avec des résultats simulés.",
      },
    },
    {
      type: "h",
      text: { en: "Winner takes all", fr: "Le gagnant prend tout" },
    },
    {
      type: "p",
      text: {
        en: "At the configured end time, the operator closes the competition. Rank #1 receives **100% of the entry-ticket pool**. There is no rake and no multi-tier payout. The backend prepares one tagged XRP Payment from the prize-pool account to the winner's verified entry wallet.",
        fr: "À l'heure de fin configurée, l'opérateur clôture la compétition. Le rang #1 reçoit **100 % de la pool des tickets d'entrée**. Il n'y a ni rake ni paiement multi-paliers. Le backend prépare un seul Payment XRP taggé depuis le prize pool vers le wallet d'entrée vérifié du gagnant.",
      },
    },
    {
      type: "callout",
      variant: "warn",
      title: { en: "Multisig means an operator quorum", fr: "Multisig implique un quorum opérateur" },
      text: {
        en: "Closing computes the winner and prepares the exact payout transaction; it does not bypass custody controls. The prize pool is multisig, so the configured signer quorum must approve and submit the Payment. Until that happens, the UI must describe it as a prepared payout, not a completed transfer.",
        fr: "La clôture calcule le gagnant et prépare la transaction exacte ; elle ne contourne pas les contrôles de custody. Le prize pool est multisig : le quorum de signataires doit approuver et soumettre le Payment. Avant cela, l'UI doit parler de payout préparé, jamais de transfert terminé.",
      },
    },
    {
      type: "h",
      text: { en: "Playing winner-takes-all", fr: "Jouer en winner-takes-all" },
    },
    {
      type: "steps",
      items: [
        {
          en: "**Read the exact start and end times.** Only return after your verified entry counts.",
          fr: "**Lis les heures exactes de début et de fin.** Seul le rendement après ton entrée vérifiée compte.",
        },
        {
          en: "**Protect against ruin.** Second place and last place pay the same: zero. Survival still matters because a blown-up account cannot recover rank.",
          fr: "**Protège-toi de la ruine.** Deuxième et dernier paient pareil : zéro. Survivre compte quand même, car un compte explosé ne remonte plus.",
        },
        {
          en: "**Watch rank #1, not a fictional target.** The leaderboard is live data from the actual paid field.",
          fr: "**Surveille le rang #1, pas une cible fictive.** Le classement vient en direct des vrais participants payés.",
        },
      ],
    },
    {
      type: "quote",
      text: {
        en: "A prize pool is credible only when every entry and every payout can be reconciled.",
        fr: "Une cagnotte n'est crédible que si chaque entrée et chaque payout peuvent être réconciliés.",
      },
    },
  ],
  related: ["how-tide-works", "trading-psychology", "on-chain-track-record"],
};
