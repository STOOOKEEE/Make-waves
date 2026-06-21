const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 4,
});

/** Montant lisible (séparateurs fr, 4 décimales max). */
export function formatAmount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/**
 * Valeur signée en achromatie : signe explicite (+ / − vrai moins), jamais de
 * couleur. Le signe et le poids typographique portent l'information.
 */
export function formatSigned(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${NUMBER_FORMAT.format(Math.abs(value))}`;
}
