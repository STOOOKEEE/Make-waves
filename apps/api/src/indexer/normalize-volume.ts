import type { PriceMap } from "@tide/core";
import type { Amount, TaggedTx } from "@tide/xrpl";
import { amountToQuantity } from "@tide/xrpl";
import { PriceFeedError } from "../feed/errors";

function priceOf(symbol: string, prices: PriceMap, reference: string): number {
  if (symbol === reference) {
    return 1;
  }
  const price = prices[symbol];
  if (price === undefined || !Number.isFinite(price) || price <= 0) {
    throw new PriceFeedError(
      `Prix manquant/aberrant pour ${symbol} (normalisation du volume)`,
    );
  }
  return price;
}

function amountToReference(
  amount: Amount,
  prices: PriceMap,
  reference: string,
): number {
  // amountToQuantity : drops/1e6 (XRP) ou value (IOU), avec validation > 0.
  const quantity = amountToQuantity(amount);
  const symbol = typeof amount === "string" ? "XRP" : amount.currency;
  return quantity * priceOf(symbol, prices, reference);
}

/**
 * POINT UNIQUE de normalisation du volume (la dette tracée au DEVLOG depuis
 * l'agrégateur). Convertit le montant échangé d'une tx taggée en devise de
 * référence via le feed de prix :
 * - `Payment` → `Amount` (buy-in / transfert) ;
 * - `OfferCreate` → côté fourni (`TakerGets`) ;
 * - toute autre tx taggée (sans montant valorisable) → 0 (le compte reste actif).
 *
 * Lève `PriceFeedError` si une devise impliquée n'a pas de prix de référence :
 * l'appelant (indexeur) décide alors d'un volume conservateur (0) en le
 * journalisant, plutôt que d'inventer un volume.
 */
export function normalizeVolume(
  tx: TaggedTx,
  prices: PriceMap,
  reference: string,
): number {
  if (tx.amount !== undefined) {
    return amountToReference(tx.amount, prices, reference);
  }
  if (tx.takerGets !== undefined) {
    return amountToReference(tx.takerGets, prices, reference);
  }
  return 0;
}
