import { InvalidPriceError } from "../errors";
import type { Position } from "./types";

/**
 * PnL d'une position au prix de marché fourni, en devise de quote.
 *
 * Frais d'ouverture exclus (déjà débités du cash au moment de l'ouverture).
 * Utilisée à la fois pour le PnL *non réalisé* (mark price courant) et le PnL
 * *réalisé* (prix de sortie). Lève `InvalidPriceError` si le prix est aberrant :
 * on ne valorise jamais une position avec un prix faux.
 */
export function positionPnl(position: Position, markPrice: number): number {
  if (!Number.isFinite(markPrice) || markPrice <= 0) {
    throw new InvalidPriceError(
      `Prix invalide pour ${position.symbol}: ${String(markPrice)}`,
    );
  }
  const direction = position.side === "long" ? 1 : -1;
  return (markPrice - position.entry) * position.qty * direction;
}
