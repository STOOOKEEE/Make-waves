/* Types et état de démarrage du terminal. Le prix nul est volontaire : aucune
 * cotation n'est affichée ni tradable avant la réponse du feed backend. */

export interface Market {
  id?: string;
  s: string;
  full: string;
  pair: string;
  p: number;
  c: number;
  hi: number;
  lo: number;
}

export const MARKETS: Market[] = [
  { s: "XRP", full: "XRP", pair: "XRP / RLUSD", p: 0, c: 0, hi: 0, lo: 0 },
];

/** Palette d'allocation (donut, barres) — réutilisée pour leaders/avoirs. */
export const ALLOC_PALETTE = ["#BFF6CE", "#4F6AFF", "#FFD66B", "#FFB9AC", "#9d7bff"];

/** Formatte un nombre façon terminal (séparateurs, décimales adaptatives). */
export function fmtNum(n: number): string {
  return n >= 1000
    ? n.toLocaleString("en-US", { maximumFractionDigits: n >= 10000 ? 0 : 2 })
    : n.toFixed(n < 1 ? 3 : 2);
}
