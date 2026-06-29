import type { FetchJson } from "./cex-price-feed";
import { PriceFeedError } from "./errors";
import type { Candle, KlineInterval } from "./klines";

const GATE_INTERVALS: Readonly<Record<KlineInterval, string>> = {
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

function pairFor(symbol: string): string {
  const base = symbol.toUpperCase();
  return base === "USDT" ? "USDT_USD" : `${base}_USDT`;
}

function num(value: unknown, ctx: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    throw new PriceFeedError(`${ctx}: nombre attendu`);
  }
  return parsed;
}

function parseCandlesticks(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) {
    throw new PriceFeedError("réponse Gate candlesticks: tableau attendu");
  }
  return raw.map((row, index) => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new PriceFeedError(`gate.candlesticks[${String(index)}]: ligne attendue`);
    }
    return {
      t: num(row[0], `gate.candlesticks[${String(index)}].t`) * 1000,
      o: num(row[5], `gate.candlesticks[${String(index)}].o`),
      h: num(row[3], `gate.candlesticks[${String(index)}].h`),
      l: num(row[4], `gate.candlesticks[${String(index)}].l`),
      c: num(row[2], `gate.candlesticks[${String(index)}].c`),
      source: "Gate" as const,
      mode: "ohlc" as const,
    };
  });
}

export async function fetchGateCandles(
  symbol: string,
  interval: KlineInterval,
  limit: number,
  fetchJson: FetchJson,
): Promise<Candle[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 1000);
  const url =
    "https://api.gateio.ws/api/v4/spot/candlesticks" +
    `?currency_pair=${encodeURIComponent(pairFor(symbol))}` +
    `&interval=${encodeURIComponent(GATE_INTERVALS[interval])}` +
    `&limit=${String(safeLimit)}`;
  const candles = parseCandlesticks(await fetchJson(url));
  if (candles.length === 0) {
    throw new PriceFeedError("Gate candlesticks: aucun point exploitable");
  }
  return candles;
}
