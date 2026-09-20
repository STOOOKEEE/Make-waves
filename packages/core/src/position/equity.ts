import { MissingPriceError } from "../errors";
import { equity } from "../paper/equity";
import { positionPnl } from "./pnl";
import type { Balances, PriceMap } from "../paper/types";
import type { Position } from "./types";

/**
 * Equity totale d'un compte = soldes spot valorisés + PnL non réalisé des
 * positions ouvertes.
 *
 * La marge des positions reste comptée dans les soldes (cash), donc seul le PnL
 * non réalisé vient s'ajouter — pas de double comptage. Réutilise `equity` pour
 * la partie soldes. Lève `MissingPriceError` si une position porte sur une
 * devise sans prix (on ne classe jamais à l'aveugle), `InvalidPriceError` via
 * `positionPnl` si le prix est aberrant.
 */
export function equityWithPositions(
  balances: Balances,
  positions: readonly Position[],
  prices: PriceMap,
  quote: string,
): number {
  let total = equity(balances, prices, quote);
  for (const position of positions) {
    const mark = prices[position.symbol];
    if (mark === undefined) {
      throw new MissingPriceError(`Prix manquant pour ${position.symbol}`);
    }
    total += positionPnl(position, mark);
  }
  return total;
}

/** Marge totale immobilisée par les positions ouvertes (devise de quote). */
export function reservedMargin(positions: readonly Position[]): number {
  return positions.reduce((sum, position) => sum + position.margin, 0);
}

/**
 * Cash disponible pour ouvrir de nouvelles positions : solde de quote moins la
 * marge déjà immobilisée. Jamais négatif.
 */
export function availableMargin(
  balances: Balances,
  positions: readonly Position[],
  quote: string,
): number {
  const cash = balances[quote] ?? 0;
  return Math.max(0, cash - reservedMargin(positions));
}
