import { locale, type Locale } from "../i18n/locale";

const FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  fr: new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }),
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }),
};

function formatter(): Intl.NumberFormat {
  return FORMATTERS[locale.value];
}

/** Montant lisible (séparateurs selon la langue, 4 décimales max). */
export function formatAmount(value: number): string {
  return formatter().format(value);
}

/**
 * Valeur signée en achromatie : signe explicite (+ / − vrai moins), jamais de
 * couleur. Le signe et le poids typographique portent l'information.
 */
export function formatSigned(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${formatter().format(Math.abs(value))}`;
}
