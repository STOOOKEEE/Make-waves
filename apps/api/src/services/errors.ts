/** Erreurs typées de la couche service (état applicatif). */

/** Identifiant d'utilisateur invalide (vide). */
export class InvalidUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserError";
  }
}

/** Compte déjà ouvert pour cet utilisateur. */
export class AccountExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountExistsError";
  }
}

/** Aucun compte pour cet utilisateur. */
export class AccountNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountNotFoundError";
  }
}

/** Capital de départ invalide (non fini ou ≤ 0). */
export class InvalidStartingEquityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStartingEquityError";
  }
}
