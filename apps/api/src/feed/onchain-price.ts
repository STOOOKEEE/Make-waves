import type { XrplCurrency } from "@tide/xrpl";
import type { OnchainPriceProvider } from "./compose-price";

/**
 * Lecteur de prix AMM minimal (la classe `XrplClient` de `@tide/xrpl` le
 * satisfait). Injecté → le fournisseur est testable sans réseau.
 */
export interface AmmPriceReader {
  ammSpotPrice(asset: XrplCurrency, asset2: XrplCurrency): Promise<number>;
}

/** Paire AMM à lire pour un symbole : `asset` exprimé en `asset2` (devise de réf). */
export interface SymbolPool {
  readonly asset: XrplCurrency;
  readonly asset2: XrplCurrency;
}

/** Mapping symbole de cotation -> paire AMM on-chain correspondante. */
export type SymbolPoolMap = Readonly<Record<string, SymbolPool>>;

/**
 * Fournisseur de prix on-chain via le spot AMM. Pour chaque symbole mappé vers
 * une paire, lit le prix spot du pool. Un symbole non mappé renvoie `undefined`
 * (pas de source on-chain) ; une erreur de lecture remonte à `composePriceMap`,
 * qui décide du repli (on ne l'avale pas ici, mais le feed ne casse pas).
 */
export class AmmOnchainPriceProvider implements OnchainPriceProvider {
  private readonly reader: AmmPriceReader;
  private readonly pools: SymbolPoolMap;

  constructor(reader: AmmPriceReader, pools: SymbolPoolMap) {
    this.reader = reader;
    this.pools = pools;
  }

  async priceFor(symbol: string): Promise<number | undefined> {
    const pool = this.pools[symbol];
    if (pool === undefined) {
      return undefined;
    }
    const price = await this.reader.ammSpotPrice(pool.asset, pool.asset2);
    // Un prix on-chain aberrant (pool vide/bug) = pas de source, pas un prix faux.
    return Number.isFinite(price) && price > 0 ? price : undefined;
  }
}
