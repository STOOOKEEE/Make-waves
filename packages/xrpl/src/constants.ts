/** Constantes XRPL et conventions de memos propres à Tide. */

/** Valeur maximale d'un SourceTag (champ uint32 du protocole XRPL). */
export const MAX_SOURCE_TAG = 0xffffffff;

/** MemoType identifiant une inscription à un tournoi Tide. */
export const MEMO_TYPE_JOIN = "tide/join";

/** MemoFormat par défaut pour nos memos textuels. */
export const MEMO_FORMAT_TEXT = "text/plain";

/**
 * Longueur max d'un competitionId (caractères). Garde-fou : la taille totale
 * des Memos d'une tx est bornée par le protocole (~1 KB) ; nos IDs sont courts.
 */
export const MAX_COMPETITION_ID_LENGTH = 128;

