/** Erreur de conversion / calcul de settlement (entrée invalide). */
export class SettlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementError";
  }
}
