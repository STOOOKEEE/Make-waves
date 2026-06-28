/* ===== TIDE — données d'affichage marchés & avoirs (mock) =====
 * Porté depuis design_site/dashboard.html (MARKETS) et portfolio.html (HOLD).
 * Illustratif : alimente le terminal et le portefeuille. Le vrai feed XRPL /
 * l'état Paper réel passent par les composables backend.
 */

export interface Market {
  s: string;
  full: string;
  pair: string;
  p: number;
  c: number;
  hi: number;
  lo: number;
}

export const MARKETS: Market[] = [
  { s: "SOL", full: "Solana", pair: "SOL / USDC", p: 184.2, c: 5.42, hi: 188.04, lo: 172.6 },
  { s: "BTC", full: "Bitcoin", pair: "BTC / USDC", p: 67412, c: 1.82, hi: 68120, lo: 65900 },
  { s: "ETH", full: "Ethereum", pair: "ETH / USDC", p: 3188, c: -0.62, hi: 3240, lo: 3140 },
  { s: "AVAX", full: "Avalanche", pair: "AVAX / USDC", p: 38.1, c: 2.2, hi: 39.4, lo: 36.8 },
  { s: "LINK", full: "Chainlink", pair: "LINK / USDC", p: 17.85, c: 3.04, hi: 18.2, lo: 16.9 },
  { s: "ARB", full: "Arbitrum", pair: "ARB / USDC", p: 1.042, c: -1.1, hi: 1.08, lo: 1.01 },
  { s: "DOGE", full: "Dogecoin", pair: "DOGE / USDC", p: 0.158, c: 6.71, hi: 0.163, lo: 0.147 },
  { s: "OP", full: "Optimism", pair: "OP / USDC", p: 2.31, c: -0.41, hi: 2.39, lo: 2.27 },
];

export interface Holding {
  s: string;
  full: string;
  col: string;
  qty: string;
  avg: string;
  val: number;
  pnl: number;
  pnlp: number;
  alloc: number;
}

export const HOLDINGS: Holding[] = [
  { s: "SOL", full: "Solana", col: "#9d7bff", qty: "820", avg: "$156.40", val: 151008, pnl: 22796, pnlp: 17.8, alloc: 43 },
  { s: "BTC", full: "Bitcoin", col: "#F7931A", qty: "0.62", avg: "$59,900", val: 41795, pnl: 9315, pnlp: 12.5, alloc: 24 },
  { s: "DOGE", full: "Dogecoin", col: "#C2A633", qty: "62,000", avg: "$0.142", val: 9796, pnl: 992, pnlp: 11.3, alloc: 11 },
  { s: "ETH", full: "Ethereum", col: "#627EEA", qty: "14", avg: "$3,090", val: 44632, pnl: -2744, pnlp: -3.1, alloc: 13 },
  { s: "AVAX", full: "Avalanche", col: "#E84142", qty: "240", avg: "$34.10", val: 9144, pnl: 960, pnlp: 11.7, alloc: 9 },
];

/** Palette d'allocation (donut, barres) — réutilisée pour leaders/avoirs. */
export const ALLOC_PALETTE = ["#BFF6CE", "#4F6AFF", "#FFD66B", "#FFB9AC", "#9d7bff"];

/** Formatte un nombre façon terminal (séparateurs, décimales adaptatives). */
export function fmtNum(n: number): string {
  return n >= 1000
    ? n.toLocaleString("en-US", { maximumFractionDigits: n >= 10000 ? 0 : 2 })
    : n.toFixed(n < 1 ? 3 : 2);
}
