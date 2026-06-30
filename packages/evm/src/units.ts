import { SettlementError } from "./errors";

/**
 * Conversion montant décimal (JS `number`) → unités de base entières (`bigint`)
 * du token de collatéral, et inverse pour l'affichage.
 *
 * C'est le **point de règlement** où l'on quitte le `number` (flottant, dette
 * tracée) pour l'entier exact attendu par `MarginVault` on-chain. On évite
 * `amount * 10**decimals` (qui dépasse `MAX_SAFE_INTEGER` dès ~1e6 en 18 déc.)
 * en décomposant la représentation décimale en chaîne.
 *
 * Sémantique : **arrondi au plus proche** à `decimals` (ce que fait `toFixed`).
 * C'est le bon choix face au bruit flottant : une saisie « propre » comme 0,12
 * (stockée 0,1199999… en double) redonne bien 0,120000, pas 0,119999 ; l'écart
 * résiduel est ≤ 0,5 unité de base (symétrique, non biaisé). Le `MarginVault`
 * re-plafonne les pertes on-chain ; cet arrondi ne casse donc aucun invariant.
 *
 * `Number.prototype.toFixed` bascule en notation exponentielle dès 1e21 (et
 * `BigInt` rejette cette forme) : on borne l'entrée à `MAX_AMOUNT`, très en deçà.
 */

/** Décimales max raisonnables (ERC20 standards ≤ 18 ; marge de sécurité). */
const MAX_DECIMALS = 36;

/** Borne haute : au-delà, `toFixed` passe en exponentiel. Aucun collatéral réel n'approche 1e21. */
const MAX_AMOUNT = 1e21;

/**
 * Valide un nombre de décimales pour un token de collatéral (exporté pour
 * validation amont : on veut échouer au plus tôt, au constructeur de tout
 * consommateur, pas en deep stack au premier appel `toBaseUnits`).
 */
export function assertValidDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
    throw new SettlementError(`Décimales invalides: ${String(decimals)}`);
  }
}

/**
 * Arrondit `amount` (≥ 0, fini, < MAX_AMOUNT) à `decimals` places et renvoie les
 * unités de base. `toFixed(decimals)` rend exactement `decimals` décimales
 * (arrondi au plus proche) ; on concatène partie entière + fractionnaire en
 * `bigint` pour rester exact bien au-delà de `MAX_SAFE_INTEGER`.
 */
function scaleMagnitude(amount: number, decimals: number): bigint {
  const fixed = amount.toFixed(decimals); // amount < 1e21 → jamais exponentiel
  const dot = fixed.indexOf(".");
  const intPart = dot === -1 ? fixed : fixed.slice(0, dot);
  const fracPart = dot === -1 ? "" : fixed.slice(dot + 1); // exactement `decimals` chiffres
  const scale = 10n ** BigInt(decimals);
  return BigInt(intPart) * scale + (fracPart === "" ? 0n : BigInt(fracPart));
}

/** Convertit un montant décimal **non négatif** en unités de base (arrondi au plus proche). */
export function toBaseUnits(amount: number, decimals: number): bigint {
  assertValidDecimals(decimals);
  if (!Number.isFinite(amount) || amount < 0 || amount >= MAX_AMOUNT) {
    throw new SettlementError(`Montant invalide: ${String(amount)}`);
  }
  return scaleMagnitude(amount, decimals);
}

/** Convertit un montant **signé** (ex. PnL) en unités de base (arrondi au plus proche de la magnitude). */
export function signedToBaseUnits(amount: number, decimals: number): bigint {
  assertValidDecimals(decimals);
  if (!Number.isFinite(amount) || Math.abs(amount) >= MAX_AMOUNT) {
    throw new SettlementError(`Montant invalide: ${String(amount)}`);
  }
  const magnitude = scaleMagnitude(Math.abs(amount), decimals);
  return amount < 0 ? -magnitude : magnitude;
}

/** Formate des unités de base en chaîne décimale (affichage, sans perte de précision). */
export function fromBaseUnits(base: bigint, decimals: number): string {
  assertValidDecimals(decimals);
  const negative = base < 0n;
  const abs = negative ? -base : base;
  const scale = 10n ** BigInt(decimals);
  const intPart = abs / scale;
  const fracPart = abs % scale;
  const sign = negative ? "-" : "";
  if (decimals === 0) return `${sign}${intPart.toString()}`;
  const frac = fracPart.toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac === "" ? `${sign}${intPart.toString()}` : `${sign}${intPart.toString()}.${frac}`;
}
