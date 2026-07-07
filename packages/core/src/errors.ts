/**
 * Erreurs typées du domaine. On ne lève jamais d'`Error` nue ni n'avale d'erreur :
 * chaque cas d'échec a un type explicite que l'appelant peut discriminer.
 */

/** Ordre mal formé (quantité/prix non finis ou ≤ 0, paire invalide, etc.). */
export class InvalidOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderError";
  }
}

/** Solde insuffisant pour exécuter l'ordre. */
export class InsufficientBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

/** Prix manquant pour valoriser une devise détenue. */
export class MissingPriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingPriceError";
  }
}

/** Prix présent mais aberrant (non fini ou ≤ 0) : on ne valorise jamais avec. */
export class InvalidPriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPriceError";
  }
}

/** Paramètre de compétition invalide (buy-in, rake, poids de répartition...). */
export class InvalidCompetitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCompetitionError";
  }
}

/** Paramètre de position invalide (quantité, entrée, levier, marge...). */
export class InvalidPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPositionError";
  }
}
