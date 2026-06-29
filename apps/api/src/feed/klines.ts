import { PriceFeedError } from "./errors";
import type { FetchJson } from "./cex-price-feed";

/** Bougie OHLC : timestamp (ms) d'ouverture + open/high/low/close. */
export interface Candle {
  readonly t: number;
  readonly o: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
}

const BINANCE_BASE = "https://api.binance.com/api/v3";

/** Intervalles de bougie supportés (notation Binance). */
export const KLINE_INTERVALS = ["5m", "15m", "1h", "4h", "1d"] as const;
export type KlineInterval = (typeof KLINE_INTERVALS)[number];

export function isKlineInterval(value: string): value is KlineInterval {
  return (KLINE_INTERVALS as readonly string[]).includes(value);
}

function num(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    throw new PriceFeedError("réponse klines: nombre attendu");
  }
  return parsed;
}

function parseKlines(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) {
    throw new PriceFeedError("réponse klines: tableau attendu");
  }
  return raw.map((row) => {
    if (!Array.isArray(row) || row.length < 5) {
      throw new PriceFeedError("réponse klines: ligne [t,o,h,l,c,...] attendue");
    }
    return {
      t: num(row[0]),
      o: num(row[1]),
      h: num(row[2]),
      l: num(row[3]),
      c: num(row[4]),
    };
  });
}

/**
 * Récupère les `limit` dernières bougies OHLC d'un symbole sur Binance
 * (`/klines`, public, sans clé). La paire est dérivée en `{SYMBOL}USDT`.
 * `fetchJson` injecté → testable sans réseau. Lève `PriceFeedError` si la
 * réponse est invalide.
 */
export async function fetchKlines(
  symbol: string,
  interval: KlineInterval,
  limit: number,
  fetchJson: FetchJson,
): Promise<Candle[]> {
  const pair = `${symbol.toUpperCase()}USDT`;
  const url =
    `${BINANCE_BASE}/klines?symbol=${encodeURIComponent(pair)}` +
    `&interval=${interval}&limit=${String(limit)}`;
  return parseKlines(await fetchJson(url));
}
