import type { FastifyInstance } from "fastify";
import { PaperService } from "./services/paper-service";
import { CompetitionService } from "./services/competition-service";
import { PriceCache } from "./feed/price-cache";
import { fetchCexPrices } from "./feed/cex-price-feed";
import type { CexFeedConfig, FetchJson } from "./feed/cex-price-feed";
import { buildServer } from "./http/server";
import type { AccountStore } from "./store/account-store";
import type { CompetitionStore } from "./store/competition-store";

/** Configuration de l'application assemblée. */
export interface AppConfig {
  /** Capital de départ des comptes paper (défaut domaine si omis). */
  readonly startingEquity?: number;
  readonly feed: CexFeedConfig;
  readonly symbols: readonly string[];
  /** Récupération JSON injectée (réel `fetch` en prod, faux en test). */
  readonly fetchJson: FetchJson;
  /** Persistance des comptes (in-memory par défaut, SQLite en prod). */
  readonly accountStore?: AccountStore;
  /** Persistance des compétitions (in-memory par défaut, SQLite en prod). */
  readonly competitionStore?: CompetitionStore;
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
  const paper = new PaperService(config.startingEquity, config.accountStore);
  const competition = new CompetitionService(config.competitionStore);
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
