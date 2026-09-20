/* ===== Bac à sable — géométrie du graphique =====
 *
 * Fonction pure : bougies en entrée, primitives SVG en sortie. Le vrai terminal
 * construit une chaîne HTML injectée par `v-html` ; ici on rend des `v-for` sur
 * des objets, ce qui est à la fois plus sûr et testable sans DOM.
 */
import type { Candle } from "@tide/client";

export interface ChartBar {
  readonly x: number;
  readonly bodyY: number;
  readonly bodyH: number;
  readonly wickTop: number;
  readonly wickBottom: number;
  readonly width: number;
  readonly up: boolean;
}

export interface ChartLevel {
  readonly y: number;
  readonly kind: "entry" | "take-profit" | "stop-loss" | "liquidation" | "mark";
}

export interface ChartGeometry {
  readonly bars: readonly ChartBar[];
  readonly linePath: string;
  readonly min: number;
  readonly max: number;
  readonly width: number;
  readonly height: number;
}

export interface ChartOptions {
  readonly width?: number;
  readonly height?: number;
  /** Prix supplémentaires à inclure dans l'échelle (TP, SL, liquidation). */
  readonly extraPrices?: readonly number[];
}

const PAD = 6;

export function buildChart(
  candles: readonly Candle[],
  options: ChartOptions = {},
): ChartGeometry {
  const width = options.width ?? 800;
  const height = options.height ?? 320;
  if (candles.length === 0) {
    return { bars: [], linePath: "", min: 0, max: 0, width, height };
  }

  const extras = options.extraPrices ?? [];
  const lows = candles.map((c) => c.l);
  const highs = candles.map((c) => c.h);
  let min = Math.min(...lows, ...extras);
  let max = Math.max(...highs, ...extras);
  // Série parfaitement plate : sans marge, toutes les divisions seraient nulles.
  if (max - min < Number.EPSILON) {
    const centre = max === 0 ? 1 : Math.abs(max);
    min -= centre * 0.01;
    max += centre * 0.01;
  }

  const span = max - min;
  const inner = height - PAD * 2;
  const step = width / candles.length;
  const barWidth = Math.max(1, step * 0.62);

  const y = (price: number) => PAD + ((max - price) / span) * inner;

  const bars = candles.map((candle, i) => {
    const x = i * step + (step - barWidth) / 2;
    const top = y(Math.max(candle.o, candle.c));
    const bottom = y(Math.min(candle.o, candle.c));
    return {
      x,
      bodyY: top,
      bodyH: Math.max(1, bottom - top),
      wickTop: y(candle.h),
      wickBottom: y(candle.l),
      width: barWidth,
      up: candle.c >= candle.o,
    };
  });

  const linePath = candles
    .map((candle, i) => {
      const px = i * step + step / 2;
      return `${i === 0 ? "M" : "L"}${px.toFixed(2)},${y(candle.c).toFixed(2)}`;
    })
    .join(" ");

  return { bars, linePath, min, max, width, height };
}

/** Ordonnée d'un prix dans une géométrie déjà calculée. */
export function priceToY(geometry: ChartGeometry, price: number): number {
  const span = geometry.max - geometry.min;
  if (span <= 0) return geometry.height / 2;
  const inner = geometry.height - PAD * 2;
  return PAD + ((geometry.max - price) / span) * inner;
}
