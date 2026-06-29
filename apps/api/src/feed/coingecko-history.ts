import type { FetchJson } from "./cex-price-feed";
import type { Candle, KlineInterval } from "./klines";
import { PriceFeedError } from "./errors";

const INTERVAL_MS: Readonly<Record<KlineInterval, number>> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function num(value: unknown, ctx: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PriceFeedError(`${ctx}: nombre attendu`);
  }
  return value;
}

function parsePrices(raw: unknown): Array<[number, number]> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PriceFeedError("réponse market_chart: objet attendu");
  }
  const prices = (raw as Record<string, unknown>)["prices"];
  if (!Array.isArray(prices)) {
    throw new PriceFeedError("réponse market_chart: prices attendu");
  }
  return prices.map((row, index) => {
    if (!Array.isArray(row) || row.length < 2) {
      throw new PriceFeedError(`market_chart.prices[${String(index)}]: [t,price] attendu`);
    }
    return [
      num(row[0], `market_chart.prices[${String(index)}].t`),
      num(row[1], `market_chart.prices[${String(index)}].price`),
    ];
  });
}

function daysFor(interval: KlineInterval, limit: number): number {
  const spanDays = (INTERVAL_MS[interval] * Math.max(limit, 1)) / 86_400_000;
  return Math.max(1, Math.ceil(spanDays * 1.2));
}

function toCandles(points: Array<[number, number]>, interval: KlineInterval): Candle[] {
  const step = INTERVAL_MS[interval];
  const buckets = new Map<number, number[]>();
  for (const [t, price] of points) {
    if (price <= 0) {
      continue;
    }
    const bucket = Math.floor(t / step) * step;
    const values = buckets.get(bucket);
    if (values === undefined) {
      buckets.set(bucket, [price]);
    } else {
      values.push(price);
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, values]) => {
      const first = values[0];
      const last = values[values.length - 1];
      if (first === undefined || last === undefined) {
        throw new PriceFeedError("market_chart: bucket vide");
      }
      return {
        t,
        o: first,
        h: Math.max(...values),
        l: Math.min(...values),
        c: last,
      };
    });
}

export async function fetchCoinGeckoHistory(
  baseUrl: string,
  coinId: string,
  vsCurrency: string,
  interval: KlineInterval,
  limit: number,
  fetchJson: FetchJson,
): Promise<Candle[]> {
  const days = daysFor(interval, limit);
  const url =
    `${baseUrl}/coins/${encodeURIComponent(coinId)}/market_chart` +
    `?vs_currency=${encodeURIComponent(vsCurrency)}&days=${String(days)}`;
  const candles = toCandles(parsePrices(await fetchJson(url)), interval);
  if (candles.length === 0) {
    throw new PriceFeedError("market_chart: aucun point exploitable");
  }
  return candles.slice(-limit);
}
