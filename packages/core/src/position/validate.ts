import { MAX_PAPER_LEVERAGE } from "../constants";
import { InvalidPositionError } from "../errors";
import type { OpenPositionInput } from "./types";

/**
 * Valide les paramètres d'ouverture d'une position. Lève `InvalidPositionError`
 * au moindre paramètre incohérent : on ne fait jamais confiance aux montants,
 * prix et leviers reçus du client.
 */
export function validateOpenPosition(input: OpenPositionInput): void {
  const { product, symbol, side, qty, entry, leverage, margin, fee } = input;

  if (product !== "spot" && product !== "perp") {
    throw new InvalidPositionError(`Produit invalide: ${String(product)}`);
  }
  if (symbol.trim() === "") {
    throw new InvalidPositionError("Symbole invalide: devise vide");
  }
  if (side !== "long" && side !== "short") {
    throw new InvalidPositionError(`Sens invalide: ${String(side)}`);
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new InvalidPositionError(`Quantité invalide: ${String(qty)}`);
  }
  if (!Number.isFinite(entry) || entry <= 0) {
    throw new InvalidPositionError(`Prix d'entrée invalide: ${String(entry)}`);
  }
  if (!Number.isFinite(leverage) || leverage < 1 || leverage > MAX_PAPER_LEVERAGE) {
    throw new InvalidPositionError(
      `Levier invalide: ${String(leverage)} (attendu 1..${String(MAX_PAPER_LEVERAGE)})`,
    );
  }
  if (!Number.isFinite(margin) || margin <= 0) {
    throw new InvalidPositionError(`Marge invalide: ${String(margin)}`);
  }
  if (!Number.isFinite(fee) || fee < 0) {
    throw new InvalidPositionError(`Frais invalides: ${String(fee)}`);
  }
}
