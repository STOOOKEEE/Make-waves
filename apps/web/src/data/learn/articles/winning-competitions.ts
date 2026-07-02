import type { RawArticle } from "../types";

/* Platform — cagnotte, rake, classement, split-pot. Exactitude : pool =
 * buy-in × participants ; rake = pool × ratio ; distribuable = pool − rake ;
 * split-pot en cas d'ex-aequo ; payout par poids ; versement on-chain multisig. */
export const winningCompetitions: RawArticle = {
  slug: "winning-competitions",
  category: "platform",
  difficulty: "beginner",
  minutes: 6,
  title: {
    en: "How Tide competitions work",
    fr: "Comment marchent les compétitions Tide",
  },
  dek: {
    en: "Same capital, same markets, one leaderboard. Here's how prize pools, ranking and payouts actually work.",
    fr: "Même capital, mêmes marchés, un seul classement. Voici comment fonctionnent vraiment cagnottes, classement et paiements.",
  },
  blocks: [
    {
      type: "p",
      text: {
        en: "Competitions turn practice into a game with stakes. Everyone starts a season or tournament with the **same virtual capital**, trades the same live markets, and is ranked by net return. It's the fairest possible test of skill — no one has more money or better fills than you.",
        fr: "Les compétitions transforment l'entraînement en jeu à enjeux. Chacun démarre une saison ou un tournoi avec le **même capital virtuel**, trade les mêmes marchés live, et est classé au rendement net. Le test de compétence le plus juste possible — personne n'a plus d'argent ni de meilleures exécutions que toi.",
      },
    },
    {
      type: "h",
      text: { en: "The prize pool & the rake", fr: "La cagnotte & le rake" },
    },
    {
      type: "p",
      text: {
        en: "When a competition has a buy-in, every entry adds to the **prize pool**: `pool = buy-in × participants`. Tide takes a small, poker-style cut called the **rake** to run the platform, and the rest — the **distributable** pool — is paid out to winners. Crucially, Tide charges *no fee on your trades*: the rake on tournament entry is the model, not a tax on every swap.",
        fr: "Quand une compétition a un buy-in, chaque inscription grossit la **cagnotte** : `cagnotte = buy-in × participants`. Tide prélève une petite part façon poker, le **rake**, pour faire tourner la plateforme, et le reste — la cagnotte **distribuable** — va aux gagnants. Point clé : Tide ne prend *aucun frais sur tes trades* : le rake à l'inscription est le modèle, pas une taxe sur chaque swap.",
      },
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
          en: "**Paid on-chain** — when rewards are enabled, prizes are sent as XRPL payments from a multisig operator account at the close. Verifiable, not a promise.",
          fr: "**Versé on-chain** — quand les récompenses sont activées, les prix sont envoyés en paiements XRPL depuis un compte opérateur multisig à la clôture. Vérifiable, pas une promesse.",
        },
      ],
    },
    {
      type: "h",
      text: { en: "Playing to win a season", fr: "Jouer pour gagner une saison" },
    },
    {
      type: "p",
      text: {
        en: "Long competitions reward consistency over hero trades. Since ranking is by net return, protecting your capital in bad conditions often beats swinging for the fences — a blown account scores zero for the rest of the season. The traders who compound steadily and avoid the big drawdown tend to finish on the podium.",
        fr: "Les longues compétitions récompensent la régularité plus que les coups d'éclat. Le classement étant au rendement net, préserver ton capital dans les mauvaises conditions bat souvent le tout-pour-le-tout — un compte explosé marque zéro pour le reste de la saison. Ceux qui composent régulièrement et évitent le gros drawdown finissent souvent sur le podium.",
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
