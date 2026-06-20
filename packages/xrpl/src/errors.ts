/**
 * Erreurs typées de la construction de transactions XRPL. On valide chaque
 * paramètre critique (adresse, SourceTag, memo) avant de produire une tx :
 * une tx malformée signée par l'user est un bug grave (fonds / attribution).
 */

/** Adresse XRPL invalide (ni un classic address valide). */
export class InvalidAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAddressError";
  }
}

/** SourceTag hors de l'intervalle uint32 attendu par le protocole. */
export class InvalidSourceTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSourceTagError";
  }
}

/** Donnée de memo invalide (vide ou trop longue). */
export class InvalidMemoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMemoError";
  }
}

/** Montant de transaction invalide (drops non entiers, valeur ≤ 0, issuer KO). */
export class InvalidAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAmountError";
  }
}

/** Donnée de métrique d'attribution invalide (volume aberrant, plage KO). */
export class InvalidMetricError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMetricError";
  }
}
