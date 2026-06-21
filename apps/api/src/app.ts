import type { FastifyInstance } from "fastify";
import { PaperService } from "./services/paper-service";
import { CompetitionService } from "./services/competition-service";
import { PriceCache } from "./feed/price-cache";
import { fetchCexPrices } from "./feed/cex-price-feed";
import type { CexFeedConfig, FetchJson } from "./feed/cex-price-feed";
import { buildServer } from "./http/server";

/** Configuration de l'application assemblée. */
export interface AppConfig {
  /** Capital de départ des comptes paper (défaut domaine si omis). */
  readonly startingEquity?: number;
  readonly feed: CexFeedConfig;
  readonly symbols: readonly string[];
  /** Récupération JSON injectée (réel `fetch` en prod, faux en test). */
  readonly fetchJson: FetchJson;
}

/** Application assemblée : serveur + cache + rafraîchisseur de prix. */
export interface App {
  readonly app: FastifyInstance;
  readonly cache: PriceCache;
  /** Rafraîchit le cache depuis le feed CEX (à planifier périodiquement). */
  readonly refreshPrices: () => Promise<void>;
}

/**
 * Assemble l'application : instancie les services, le cache de prix, branche
 * `getPrices` sur l'instantané du cache, et expose un rafraîchisseur. Aucun
 * effet de bord (pas d'écoute réseau, pas de timer) → testable.
 */
export function createApp(config: AppConfig): App {
  const paper = new PaperService(config.startingEquity);
  const competition = new CompetitionService();
  const cache = new PriceCache();

  const app = buildServer({
    paper,
    competition,
    getPrices: () => cache.current(),
  });

  const refreshPrices = async (): Promise<void> => {
    const prices = await fetchCexPrices(config.feed, config.symbols, config.fetchJson);
    cache.set(prices);
  };

  return { app, cache, refreshPrices };
}
