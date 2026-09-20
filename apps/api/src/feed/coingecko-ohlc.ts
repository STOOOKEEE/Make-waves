import type { FetchJson } from "./cex-price-feed";
import { PriceFeedError } from "./errors";
import type { Candle, KlineInterval } from "./klines";

const INTERVAL_MS: Readonly<Record<KlineInterval, number>> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

const ALLOWED_DAYS = [1, 7, 14, 30, 90, 180, 365] as const;

function num(value: unknown, ctx: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PriceFeedError(`${ctx}: nombre attendu`);
  }
  return value;
}

function daysFor(interval: KlineInterval, limit: number): number {
  const desiredDays = (INTERVAL_MS[interval] * Math.max(limit, 1)) / 86_400_000;
  return ALLOWED_DAYS.find((days) => days >= desiredDays) ?? 365;
}

function parseOhlc(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) {
    throw new PriceFeedError("réponse ohlc: tableau attendu");
  }
  return raw.map((row, index) => {
    if (!Array.isArray(row) || row.length < 5) {
      throw new PriceFeedError(`ohlc[${String(index)}]: [t,o,h,l,c] attendu`);
    }
    return {
      t: num(row[0], `ohlc[${String(index)}].t`),
      o: num(row[1], `ohlc[${String(index)}].o`),
      h: num(row[2], `ohlc[${String(index)}].h`),
      l: num(row[3], `ohlc[${String(index)}].l`),
      c: num(row[4], `ohlc[${String(index)}].c`),
      source: "CoinGecko" as const,
      mode: "ohlc" as const,
    };
  });
}

export async function fetchCoinGeckoOhlc(
  baseUrl: string,
  coinId: string,
  vsCurrency: string,
  interval: KlineInterval,
  limit: number,
  fetchJson: FetchJson,
): Promise<Candle[]> {
  const days = daysFor(interval, limit);
  const url =
    `${baseUrl}/coins/${encodeURIComponent(coinId)}/ohlc` +
    `?vs_currency=${encodeURIComponent(vsCurrency)}&days=${String(days)}`;
  const candles = parseOhlc(await fetchJson(url));
  if (candles.length === 0) {
    throw new PriceFeedError("ohlc: aucun point exploitable");
  }
  return candles.slice(-limit);
}
