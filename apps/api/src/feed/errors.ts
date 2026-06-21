/** Échec du feed de prix (réponse upstream malformée, prix aberrant, symbole inconnu). */
export class PriceFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceFeedError";
  }
}
