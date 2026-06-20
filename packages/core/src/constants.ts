/**
 * Constantes du domaine (pas de valeurs magiques disséminées dans le code).
 */

/** Devise de référence dans laquelle on valorise les portefeuilles (quote). */
export const QUOTE_CURRENCY = "RLUSD";

/** Capital virtuel de départ d'un portefeuille paper, en devise de référence. */
export const PAPER_STARTING_EQUITY = 10_000;

/** Tolérance pour la somme des poids de répartition des gains (flottants). */
export const WEIGHT_SUM_EPSILON = 1e-9;
