import { InsufficientBalanceError } from "../errors";
import { validateMarketOrder } from "./validate";
import type { Balances, Fill, MarketOrderInput } from "./types";

/** Solde d'une devise, 0 si absente du portefeuille. */
export function balanceOf(balances: Balances, currency: string): number {
  return balances[currency] ?? 0;
}

/**
 * Exécute un ordre marché paper au prix réel fourni (pas de slippage en MVP).
 *
 * Pur et immutable : ne modifie pas `balances`, retourne de nouveaux soldes et
 * le fill correspondant. Lève `InvalidOrderError` si l'ordre est mal formé,
 * `InsufficientBalanceError` si le solde ne couvre pas l'ordre.
 */
export function applyMarketOrder(
  balances: Balances,
  order: MarketOrderInput,
): { balances: Balances; fill: Fill } {
  validateMarketOrder(order);

  const { pair, side, amount, price } = order;
  // Montants en `number` JS (flottants) : dette de précision assumée pour le
  // paper trading, à reprendre côté mode Live taggé. Voir note dans equity.ts.
  const quoteAmount = amount * price;
  const baseBefore = balanceOf(balances, pair.base);
  const quoteBefore = balanceOf(balances, pair.quote);

  let baseAfter: number;
  let quoteAfter: number;

  if (side === "buy") {
    if (quoteBefore < quoteAmount) {
      throw new InsufficientBalanceError(
        `Solde ${pair.quote} insuffisant: ${String(quoteBefore)} < ${String(quoteAmount)}`,
      );
    }
    baseAfter = baseBefore + amount;
    quoteAfter = quoteBefore - quoteAmount;
  } else {
    if (baseBefore < amount) {
      throw new InsufficientBalanceError(
        `Solde ${pair.base} insuffisant: ${String(baseBefore)} < ${String(amount)}`,
      );
    }
    baseAfter = baseBefore - amount;
    quoteAfter = quoteBefore + quoteAmount;
  }

  return {
    balances: { ...balances, [pair.base]: baseAfter, [pair.quote]: quoteAfter },
    fill: { pair, side, amount, price, quoteAmount },
  };
}
