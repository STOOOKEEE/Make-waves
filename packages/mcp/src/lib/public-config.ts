import type { PublicConfig } from "../types";

/**
 * Default config used at bootstrap and in tests.
 * Matches the brief's safe-by-default fallback: paper mode, no SourceTag,
 * 9 majors that map to CoinGecko ids.
 */
export const defaultPublicConfig: PublicConfig = {
  mode: "paper",
  sourceTag: null,
  availablePairs: [
    "BTC",
    "ETH",
    "XRP",
    "SOL",
    "AVAX",
    "LINK",
    "ARB",
    "DOGE",
    "OP",
  ],
};
