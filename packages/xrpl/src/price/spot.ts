import type { Amount } from "xrpl";
import { amountToQuantity } from "./quantity";
import { InvalidPriceError } from "../errors";

/** Valide un prix scalaire (fini et strictement positif). */
export function assertValidPrice(price: number, label: string): void {
  if (!Number.isFinite(price) || price <= 0) {
    throw new InvalidPriceError(`Prix ${label} invalide: ${String(price)}`);
  }
}

/**
 * Prix spot d'un pool AMM : combien d'unités de `quote` pour 1 unité de `base`,
 * à partir des réserves du pool (les deux montants détenus par l'AMM). C'est le
 * prix instantané (ratio des réserves), hors frais de trading.
 *
 * Les deux montants sont validés (> 0) ; la division est donc sûre.
 */
export function ammSpotPrice(base: Amount, quote: Amount): number {
  const baseQty = amountToQuantity(base, "base");
  const quoteQty = amountToQuantity(quote, "quote");
  return quoteQty / baseQty;
}

/** Prix milieu entre meilleur bid et meilleur ask (carnet d'ordres). */
export function midPrice(bid: number, ask: number): number {
  assertValidPrice(bid, "bid");
  assertValidPrice(ask, "ask");
  return (bid + ask) / 2;
}

/**
 * Spread relatif `(ask - bid) / mid`. Lève si le carnet est croisé (`ask < bid`),
 * signe d'une donnée incohérente.
 */
export function relativeSpread(bid: number, ask: number): number {
  assertValidPrice(bid, "bid");
  assertValidPrice(ask, "ask");
  if (ask < bid) {
    throw new InvalidPriceError(
      `Carnet croisé: ask (${String(ask)}) < bid (${String(bid)})`,
    );
  }
  return (ask - bid) / midPrice(bid, ask);
}
