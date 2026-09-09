/*
 * Paramètres de la tombola AirPods Max.
 *
 * Une seule source pour la date : le compte à rebours, l'état « clos » et le
 * texte du règlement lisent tous cette constante. Changer la date ici suffit.
 */

/** Clôture des participations : 19 septembre 2026, 23:59 UTC. */
export const GIVEAWAY_CLOSES_AT = Date.UTC(2026, 8, 19, 23, 59, 0);

/*
 * Il n'y a volontairement PAS de date d'annonce du gagnant.
 * L'attribution dépend des résultats de Make Waves, dont l'Organisateur ne
 * maîtrise pas le calendrier : le règlement fixe un délai relatif (tirage sous
 * `DRAW_WINDOW_DAYS` jours après la publication officielle) plutôt qu'une date
 * qu'il faudrait corriger au premier décalage.
 */

/** Le hackathon dont dépend l'attribution du lot. */
export const MAKE_WAVES_NAME = "Make Waves";
export const MAKE_WAVES_ORGANISER = "XRPL Commons";
export const MAKE_WAVES_URL = "https://www.xrpl-commons.org";

/** Compte X de Tide (`growth/context/05-facts.md` § Access). */
export const GIVEAWAY_X_HANDLE = "tidetradexyz";
export const GIVEAWAY_X_URL = `https://x.com/${GIVEAWAY_X_HANDLE}`;

/** Identifiant du badge dont le mérite prouve le premier trade paper. */
export const FIRST_TRADE_BADGE_CODE = "first_trade";

/** Poids des règles, en entrées. */
export const GIVEAWAY_WEIGHTS = {
  wallet: 1,
  firstTrade: 3,
  referral: 2,
} as const;

/** Applications de wallet XRPL vers lesquelles la page envoie les nouveaux venus. */
export const XAMAN_URL = "https://xaman.app";
export const GEMWALLET_URL = "https://gemwallet.app";

/**
 * Réserve de base XRPL : un compte n'existe sur le registre qu'à partir de ce
 * solde. C'est le seul prérequis matériel pour créer un compte Tide.
 */
export const XRPL_BASE_RESERVE_XRP = 1;
