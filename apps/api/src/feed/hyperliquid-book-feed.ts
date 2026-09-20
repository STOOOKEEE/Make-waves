import type { BookDepth, BookLevel } from "./binance-book-feed";
import { PriceFeedError } from "./errors";

export type PostJson = (url: string, body: unknown) => Promise<unknown>;

function num(value: unknown, ctx: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed <= 0) {
    throw new PriceFeedError(`${ctx}: nombre positif attendu`);
  }
  return parsed;
}

function levelRows(raw: unknown, ctx: string): Array<[number, number]> {
  if (!Array.isArray(raw)) {
    throw new PriceFeedError(`${ctx}: tableau attendu`);
  }
  return raw.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new PriceFeedError(`${ctx}[${String(index)}]: objet attendu`);
    }
    const row = item as Record<string, unknown>;
    return [
      num(row["px"], `${ctx}[${String(index)}].px`),
      num(row["sz"], `${ctx}[${String(index)}].sz`),
    ];
  });
}

function cumulate(rows: Array<[number, number]>): BookLevel[] {
  let total = 0;
  return rows.map(([price, size]) => {
    total += size;
    return { price, size, total };
  });
}

/**
 * Profondeur Hyperliquid. `levels[0]` = bids (meilleur bid en premier),
 * `levels[1]` = asks (meilleur ask en premier). Quote natif: USDC.
 */
export async function fetchHyperliquidBookDepth(
  symbol: string,
  limit: number,
  postJson: PostJson,
): Promise<BookDepth> {
  const base = symbol.toUpperCase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const raw = await postJson("https://api.hyperliquid.xyz/info", {
    type: "l2Book",
    coin: base,
  });
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PriceFeedError("réponse Hyperliquid depth: objet attendu");
  }
  const record = raw as Record<string, unknown>;
  const levels = record["levels"];
  if (!Array.isArray(levels) || levels.length < 2) {
    throw new PriceFeedError("réponse Hyperliquid depth: levels bid/ask attendus");
  }
  const bids = cumulate(levelRows(levels[0], "hyperliquid.bids").slice(0, safeLimit));
  const asks = cumulate(levelRows(levels[1], "hyperliquid.asks").slice(0, safeLimit));
  const bid = bids[0]?.price;
  const ask = asks[0]?.price;
  if (bid === undefined || ask === undefined) {
    throw new PriceFeedError("réponse Hyperliquid depth: carnet vide");
  }
  return {
    symbol: base,
    quoteSymbol: "USDC",
    source: "Hyperliquid",
    asks,
    bids,
    mid: (bid + ask) / 2,
    spread: (ask - bid) / ((bid + ask) / 2),
  };
}
