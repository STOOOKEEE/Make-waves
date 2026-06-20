import { InvalidOrderError } from "../errors";
import type { MarketOrderInput } from "./types";

/**
 * Valide un ordre marché avant exécution. Lève `InvalidOrderError` au moindre
 * paramètre incohérent (entrée critique : on ne fait jamais confiance au montant
 * ou au prix reçus).
 */
export function validateMarketOrder(order: MarketOrderInput): void {
  const { amount, price, pair, side } = order;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new InvalidOrderError(`Quantité invalide: ${String(amount)}`);
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new InvalidOrderError(`Prix invalide: ${String(price)}`);
  }
  if (pair.base.trim() === "" || pair.quote.trim() === "") {
    throw new InvalidOrderError("Paire invalide: devise vide");
  }
  if (pair.base === pair.quote) {
    throw new InvalidOrderError(
      `Paire invalide: base et quote identiques (${pair.base})`,
    );
  }
  if (side !== "buy" && side !== "sell") {
    throw new InvalidOrderError(`Sens invalide: ${String(side)}`);
  }
}
