import { InvalidAmountError } from "../errors";

/**
 * Répartit des montants fractionnaires en **unités entières** (ex. drops XRP) par
 * la **méthode du plus grand reste**, de sorte que la somme des unités égale
 * exactement `round(Σ montants × unitsPerWhole)`.
 *
 * Résout la dette tracée au DEVLOG : convertir des payouts en `number` vers des
 * drops entiers sans dérive (sinon `Σ versé ≠ distribuable arrondi` de quelques
 * drops). On plancherise chacun, puis on distribue le reliquat aux plus grandes
 * parties fractionnaires (et, cas rare d'arrondi négatif, on retire aux plus
 * petites). Garantit la conservation à l'unité près.
 *
 * @param amounts montants (≥ 0) dans l'unité « entière » (ex. XRP).
 * @param unitsPerWhole nombre d'unités atomiques par unité entière (ex. 1e6 pour XRP).
 */
export function allocateLargestRemainder(
  amounts: readonly number[],
  unitsPerWhole: number,
): number[] {
  if (!Number.isInteger(unitsPerWhole) || unitsPerWhole <= 0) {
    throw new InvalidAmountError(
      `unitsPerWhole doit être un entier > 0: ${String(unitsPerWhole)}`,
    );
  }
  for (const amount of amounts) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new InvalidAmountError(`Montant à répartir invalide: ${String(amount)}`);
    }
  }
  if (amounts.length === 0) {
    return [];
  }

  const scaled = amounts.map((amount) => amount * unitsPerWhole);
  const total = scaled.reduce((sum, value) => sum + value, 0);
  const targetUnits = Math.round(total);

  // Au-delà de 2^53, un `number` ne représente plus les unités entières
  // exactement → répartition non fiable. On refuse plutôt que de dériver
  // silencieusement (à lever avec la migration `number` → BigInt, cf. DEVLOG).
  if (targetUnits > Number.MAX_SAFE_INTEGER) {
    throw new InvalidAmountError(
      "Total à répartir trop grand pour une répartition exacte en number (passer en BigInt)",
    );
  }

  const floors = scaled.map((value) => Math.floor(value));
  const result = [...floors];
  const sumFloors = floors.reduce((sum, value) => sum + value, 0);
  // `remainder = round(total) − Σfloors ≥ 0` toujours (round(x) ≥ x ≥ Σfloors) :
  // on distribue le reliquat aux plus grandes parties fractionnaires.
  const remainder = targetUnits - sumFloors;

  const byFracDesc = scaled
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < remainder && k < byFracDesc.length; k += 1) {
    const target = byFracDesc[k];
    if (target !== undefined) {
      result[target.index] = (result[target.index] ?? 0) + 1;
    }
  }

  return result;
}
