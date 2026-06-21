import type { Amount } from "xrpl";
import { assertValidAddress } from "./address";
import { InvalidAmountError } from "../errors";

/** Drops XRP : suite de chiffres uniquement (entier, pas de signe ni point). */
const DROPS_PATTERN = /^[0-9]+$/;

/**
 * Valide un montant XRPL avant de l'insérer dans une tx que l'user signera.
 * C'est le champ qui porte la valeur : une erreur ici = tx qui échoue après
 * signature, ou pire, montant erroné signé sans s'en rendre compte.
 *
 * - XRP (string drops) : chiffres uniquement et strictement positif.
 * - Token émis (objet) : `value` fini > 0, `currency` non vide, `issuer` valide.
 */
export function assertValidAmount(amount: Amount, label: string): void {
  if (typeof amount === "string") {
    if (!DROPS_PATTERN.test(amount)) {
      throw new InvalidAmountError(
        `Montant ${label} invalide (drops XRP = entier positif): ${amount}`,
      );
    }
    if (BigInt(amount) <= 0n) {
      throw new InvalidAmountError(`Montant ${label} doit être > 0: ${amount}`);
    }
    return;
  }

  if (amount.currency.trim() === "") {
    throw new InvalidAmountError(`Montant ${label}: currency vide`);
  }
  assertValidAddress(amount.issuer, `${label}.issuer`);

  const value = Number(amount.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidAmountError(
      `Montant ${label}: value invalide (${amount.value})`,
    );
  }
}

/** Égalité structurelle de deux montants (pour détecter une offre triviale). */
export function amountsEqual(a: Amount, b: Amount): boolean {
  if (typeof a === "string" || typeof b === "string") {
    return a === b;
  }
  return (
    a.currency === b.currency && a.issuer === b.issuer && a.value === b.value
  );
}
