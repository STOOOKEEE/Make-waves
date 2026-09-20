import type { FetchJson } from "./cex-price-feed";
import { PriceFeedError } from "./errors";
import type { Candle, KlineInterval } from "./klines";

export interface GeckoTerminalToken {
  readonly network: string;
  readonly address: string;
}

interface OhlcvQuery {
  readonly timeframe: "minute" | "hour" | "day";
  readonly aggregate: number;
}

const QUERIES: Readonly<Record<KlineInterval, OhlcvQuery>> = {
  "5m": { timeframe: "minute", aggregate: 5 },
  "15m": { timeframe: "minute", aggregate: 15 },
  "1h": { timeframe: "hour", aggregate: 1 },
  "4h": { timeframe: "hour", aggregate: 4 },
  "1d": { timeframe: "day", aggregate: 1 },
};

function num(value: unknown, ctx: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PriceFeedError(`${ctx}: nombre attendu`);
  }
  return value;
}

function firstPoolAddress(raw: unknown): string {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PriceFeedError("réponse GeckoTerminal pools: objet attendu");
  }
  const data = (raw as Record<string, unknown>)["data"];
  if (!Array.isArray(data)) {
    throw new PriceFeedError("réponse GeckoTerminal pools: data attendu");
  }
  const first = data[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    throw new PriceFeedError("réponse GeckoTerminal pools: pool attendue");
  }
  const attrs = (first as Record<string, unknown>)["attributes"];
  if (typeof attrs !== "object" || attrs === null || Array.isArray(attrs)) {
    throw new PriceFeedError("réponse GeckoTerminal pools: attributes attendu");
  }
  const address = (attrs as Record<string, unknown>)["address"];
  if (typeof address !== "string" || address.trim() === "") {
    throw new PriceFeedError("réponse GeckoTerminal pools: address attendu");
  }
  return address;
}

function parseOhlcv(raw: unknown): Candle[] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PriceFeedError("réponse GeckoTerminal ohlcv: objet attendu");
  }
  const data = (raw as Record<string, unknown>)["data"];
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new PriceFeedError("réponse GeckoTerminal ohlcv: data attendu");
  }
  const attrs = (data as Record<string, unknown>)["attributes"];
  if (typeof attrs !== "object" || attrs === null || Array.isArray(attrs)) {
    throw new PriceFeedError("réponse GeckoTerminal ohlcv: attributes attendu");
  }
  const rows = (attrs as Record<string, unknown>)["ohlcv_list"];
  if (!Array.isArray(rows)) {
    throw new PriceFeedError("réponse GeckoTerminal ohlcv: ohlcv_list attendu");
  }
  return rows
    .map((row, index) => {
      if (!Array.isArray(row) || row.length < 5) {
        throw new PriceFeedError(`ohlcv_list[${String(index)}]: [t,o,h,l,c,...] attendu`);
      }
      return {
        t: num(row[0], `ohlcv_list[${String(index)}].t`) * 1000,
        o: num(row[1], `ohlcv_list[${String(index)}].o`),
        h: num(row[2], `ohlcv_list[${String(index)}].h`),
        l: num(row[3], `ohlcv_list[${String(index)}].l`),
        c: num(row[4], `ohlcv_list[${String(index)}].c`),
        source: "GeckoTerminal" as const,
        mode: "ohlc" as const,
      };
    })
    .reverse();
}

export async function fetchGeckoTerminalHistory(
  token: GeckoTerminalToken,
  interval: KlineInterval,
  limit: number,
  fetchJson: FetchJson,
): Promise<Candle[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 300);
  const poolsUrl =
    `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(token.network)}` +
    `/tokens/${encodeURIComponent(token.address)}/pools?page=1`;
  const pool = firstPoolAddress(await fetchJson(poolsUrl));
  const query = QUERIES[interval];
  const ohlcvUrl =
    `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(token.network)}` +
    `/pools/${encodeURIComponent(pool)}/ohlcv/${query.timeframe}` +
    `?aggregate=${String(query.aggregate)}&limit=${String(safeLimit)}&currency=usd&token=base`;
  const candles = parseOhlcv(await fetchJson(ohlcvUrl));
  if (candles.length === 0) {
    throw new PriceFeedError("GeckoTerminal ohlcv: aucun point exploitable");
  }
  return candles;
}
