import type { Amount } from "xrpl";
import { assertValidAmount } from "../tx/amount";
import { DROPS_PER_XRP } from "../constants";

/**
 * Convertit un montant XRPL en quantité numérique de l'actif :
 * - XRP (drops, string) -> XRP (`drops / 1e6`) ;
 * - token émis (objet) -> sa `value`.
 *
 * Valide le montant au passage (> 0). Le résultat est un `number` : suffisant
 * pour un prix indicatif, pas pour un règlement (cf. dette drops, DEVLOG).
 */
export function amountToQuantity(amount: Amount, label = "amount"): number {
  assertValidAmount(amount, label);
  if (typeof amount === "string") {
    return Number(amount) / DROPS_PER_XRP;
  }
  return Number(amount.value);
}
