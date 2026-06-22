import type { PriceMap } from "@tide/core";
import { PriceFeedError } from "./errors";

/** Aucune source de prix disponible pour le symbole. */
export class PriceUnavailableError extends PriceFeedError {
  constructor(message: string) {
    super(message);
    this.name = "PriceUnavailableError";
  }
}

/** Les deux sources divergent au-delà du seuil (manipulation/illiquidité probable). */
export class PriceDivergenceError extends PriceFeedError {
  constructor(message: string) {
    super(message);
    this.name = "PriceDivergenceError";
  }
}

/** Sources de prix d'un symbole, chacune optionnelle (selon disponibilité). */
export interface PriceSources {
  /** Prix CEX : référence profonde, peu manipulable (valorisation). */
  readonly cex?: number;
  /** Prix on-chain : prix exécutable (spot AMM ou mid du carnet). */
  readonly onchain?: number;
}

export type PriceSourceUsed = "cex" | "onchain" | "both";

export interface ComposedPrice {
  readonly price: number;
  readonly used: PriceSourceUsed;
  /** Écart relatif entre sources quand les deux sont présentes. */
  readonly divergence?: number;
}

export interface ComposeOptions {
  /** Écart relatif max toléré entre sources (ex. 0.05 = 5 %). */
  readonly maxDivergence: number;
  /** Source retenue quand les deux concordent. */
  readonly prefer: "cex" | "onchain";
}

function validatePositive(price: number | undefined, label: string): number | undefined {
  if (price === undefined) {
    return undefined;
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new PriceFeedError(`Prix ${label} aberrant: ${String(price)}`);
  }
  return price;
}

function relativeGap(a: number, b: number): number {
  return Math.abs(a - b) / Math.min(a, b);
}

/**
 * Compose un prix robuste à partir de deux sources (CEX + on-chain).
 *
 * - Une seule source disponible → on l'utilise (avec son origine).
 * - Deux sources : si elles divergent au-delà de `maxDivergence` (signe d'un
 *   prix on-chain manipulé ou illiquide), on **lève** plutôt que de publier un
 *   prix douteux — l'appelant retombe alors sur le dernier prix valide. Sinon on
 *   retient la source préférée (CEX pour la valorisation, on-chain pour l'exéc).
 * - Aucune source → `PriceUnavailableError`.
 *
 * Pur : aucune I/O. Ne produit jamais un prix faux silencieusement.
 */
export function composePrice(
  sources: PriceSources,
  options: ComposeOptions,
): ComposedPrice {
  if (!Number.isFinite(options.maxDivergence) || options.maxDivergence < 0) {
    throw new PriceFeedError(
      `maxDivergence invalide: ${String(options.maxDivergence)}`,
    );
  }
  const cex = validatePositive(sources.cex, "cex");
  const onchain = validatePositive(sources.onchain, "onchain");

  if (cex === undefined) {
    if (onchain === undefined) {
      throw new PriceUnavailableError("Aucune source de prix disponible");
    }
    return { price: onchain, used: "onchain" };
  }
  if (onchain === undefined) {
    return { price: cex, used: "cex" };
  }

  const divergence = relativeGap(cex, onchain);
  if (divergence > options.maxDivergence) {
    throw new PriceDivergenceError(
      `Divergence ${(divergence * 100).toFixed(2)}% > seuil ` +
        `${(options.maxDivergence * 100).toFixed(2)}% (cex=${String(cex)}, onchain=${String(onchain)})`,
    );
  }
  return {
    price: options.prefer === "cex" ? cex : onchain,
    used: "both",
    divergence,
  };
}

/** Fournit le prix on-chain d'un symbole (ou `undefined` si indisponible). */
export interface OnchainPriceProvider {
  priceFor(symbol: string): Promise<number | undefined>;
}

/** Journal minimal injecté (jamais avaler un repli silencieusement). */
export interface FeedLogger {
  warn(message: string): void;
}

/**
 * Compose une `PriceMap` complète : pour chaque symbole, prend le prix CEX et,
 * si un fournisseur on-chain est branché, son prix, puis les combine via
 * `composePrice`. Politique de repli (sécurité) :
 * - prix on-chain indisponible/erreur → on continue avec le seul CEX ;
 * - divergence au-delà du seuil → on **retombe sur le CEX** (référence profonde)
 *   plutôt que de publier un prix on-chain suspect, et on le journalise ;
 * - aucun prix exploitable → symbole **omis** (jamais de prix faux/0).
 */
export async function composePriceMap(
  cexPrices: PriceMap,
  symbols: readonly string[],
  options: ComposeOptions,
  onchain?: OnchainPriceProvider,
  logger?: FeedLogger,
): Promise<PriceMap> {
  const result: Record<string, number> = {};
  for (const symbol of symbols) {
    const cex = cexPrices[symbol];
    let onchainPrice: number | undefined;
    if (onchain !== undefined) {
      try {
        onchainPrice = await onchain.priceFor(symbol);
      } catch (error) {
        onchainPrice = undefined;
        logger?.warn(
          `${symbol}: prix on-chain indisponible (${describe(error)}), CEX seul`,
        );
      }
    }
    try {
      result[symbol] = composePrice({ cex, onchain: onchainPrice }, options).price;
    } catch (error) {
      if (cex !== undefined && Number.isFinite(cex) && cex > 0) {
        result[symbol] = cex;
        logger?.warn(`${symbol}: ${describe(error)} → repli sur le CEX`);
      } else {
        logger?.warn(`${symbol}: aucun prix exploitable (${describe(error)}), omis`);
      }
    }
  }
  return result;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
