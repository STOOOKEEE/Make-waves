import type { Amount } from "xrpl";
import { assertValidAddress } from "./address";
import { InvalidAmountError } from "../errors";

/** Drops XRP : suite de chiffres uniquement (entier, pas de signe ni point). */
const DROPS_PATTERN = /^[0-9]+$/;

/** Réserve totale XRP = 10^11 XRP = 10^17 drops : borne haute du protocole. */
const MAX_XRP_DROPS = 100_000_000_000_000_000n;

/** Value IOU : décimal positif SANS signe ni exposant (rippled refuse `1e+21`). */
const IOU_VALUE_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

/** Précision max d'un montant IOU XRPL (mantisse). */
const MAX_IOU_SIGNIFICANT_DIGITS = 15;

/** Nombre de chiffres significatifs d'une value décimale (hors zéros de cadrage). */
function significantDigits(decimal: string): number {
  return decimal.replace(".", "").replace(/^0+/, "").replace(/0+$/, "").length;
}

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
    const drops = BigInt(amount);
    if (drops <= 0n) {
      throw new InvalidAmountError(`Montant ${label} doit être > 0: ${amount}`);
    }
    if (drops > MAX_XRP_DROPS) {
      throw new InvalidAmountError(
        `Montant ${label} dépasse la réserve totale XRPL (${amount} > ${String(MAX_XRP_DROPS)} drops)`,
      );
    }
    return;
  }

  if (amount.currency.trim() === "") {
    throw new InvalidAmountError(`Montant ${label}: currency vide`);
  }
  assertValidAddress(amount.issuer, `${label}.issuer`);

  // value décimale stricte : pas d'exposant (`1e+21`) ni de mantisse > 15 chiffres,
  // sinon la tx est rejetée par le réseau ou tronque silencieusement la value.
  if (!IOU_VALUE_PATTERN.test(amount.value)) {
    throw new InvalidAmountError(
      `Montant ${label}: value IOU non décimale (exposant/signe interdit): ${amount.value}`,
    );
  }
  if (significantDigits(amount.value) > MAX_IOU_SIGNIFICANT_DIGITS) {
    throw new InvalidAmountError(
      `Montant ${label}: value IOU > ${String(MAX_IOU_SIGNIFICANT_DIGITS)} chiffres significatifs: ${amount.value}`,
    );
  }
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
