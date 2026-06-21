import { InvalidPriceError, MissingPriceError } from "../errors";
import type { Balances, PriceMap } from "./types";

// Note précision : les montants sont des `number` JS (flottants binaires).
// Acceptable pour le paper trading (pas d'argent réel, pas de règlement on-chain
// ici). À reprendre côté mode Live taggé, où les drops XRP sont des entiers et
// les tokens ont une précision fixe. Voir docs/DEVLOG.md.

/**
 * Valeur totale d'un portefeuille exprimée dans la devise de référence `quote`.
 * La devise de référence vaut 1 par définition.
 *
 * Lève `MissingPriceError` si une devise détenue (≠ quote) n'a pas de prix, et
 * `InvalidPriceError` si le prix fourni est aberrant (non fini ou ≤ 0) : on ne
 * valorise jamais à l'aveugle ni avec un prix qui produirait un montant faux.
 */
export function equity(
  balances: Balances,
  prices: PriceMap,
  quote: string,
): number {
  let total = 0;
  for (const [currency, amount] of Object.entries(balances)) {
    if (currency === quote) {
      total += amount;
      continue;
    }
    const price = prices[currency];
    if (price === undefined) {
      throw new MissingPriceError(`Prix manquant pour ${currency}`);
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new InvalidPriceError(`Prix invalide pour ${currency}: ${String(price)}`);
    }
    total += amount * price;
  }
  return total;
}

/** PnL absolu = equity courante - equity de départ. */
export function pnl(currentEquity: number, startingEquity: number): number {
  return currentEquity - startingEquity;
}

/** PnL relatif (fraction) par rapport au capital de départ. */
export function pnlRatio(currentEquity: number, startingEquity: number): number {
  if (startingEquity <= 0) {
    return 0;
  }
  return (currentEquity - startingEquity) / startingEquity;
}
