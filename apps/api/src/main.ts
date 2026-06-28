import { connectXrplClient } from "@tide/xrpl";
import type { XrplClient } from "@tide/xrpl";
import { createApp } from "./app";
import * as env from "./config/env";
import type { FetchJson } from "./feed/cex-price-feed";
import type { FeedLogger, OnchainPriceProvider } from "./feed/compose-price";
import { PriceFeedError } from "./feed/errors";
import { AmmOnchainPriceProvider } from "./feed/onchain-price";
import type { SymbolPoolMap } from "./feed/onchain-price";
import type { MetricsDeps, SignDeps } from "./http/server";
import { AttributionIndexer } from "./indexer/indexer";
import { SqliteAccountStore } from "./store/sqlite-account-store";
import { SqliteAttributionStore } from "./store/attribution-store";
import { SqliteCompetitionStore } from "./store/sqlite-competition-store";
import { openDatabase } from "./store/sqlite";
import { createXamanApi } from "./xaman/sdk";

// Entrypoint du serveur. Assemble l'app testée (`createApp`) avec le vrai monde :
// `fetch`, variables d'environnement, écoute réseau, rafraîchissement périodique
// du feed et synchronisation de l'indexeur. La logique est testée ailleurs ; ce
// fichier n'est que du câblage runtime. Chaque intégration on-chain (feed AMM,
// indexeur, signature Xaman) est OPTIONNELLE et activée par sa configuration :
// sans elle, l'API tourne en mode off-chain pur (comportement par défaut).

const DEFAULT_VS_CURRENCY = "usd";
/** Devise de référence du volume indexé : doit correspondre à `vsCurrency` du CEX. */
const REFERENCE_CURRENCY = DEFAULT_VS_CURRENCY;
const PRICE_REFRESH_MS = 30_000;
const INDEXER_SYNC_MS = 15_000;
// Symboles cotés par le feed CEX (clé de la PriceMap). ATTENTION : tout volume
// indexé dont la devise n'est PAS dans cette liste est normalisé à **0** (prix
// introuvable → garde-fou conservateur de l'indexeur, cf. risque tracé F4). Pour
// compter le volume d'un token (ex. RLUSD), l'AJOUTER ici ET à SYMBOL_TO_ID (et,
// pour le prix on-chain, à ONCHAIN_POOLS). Lien à ne pas oublier en activant le Live.
const SYMBOL_TO_ID: Readonly<Record<string, string>> = { XRP: "ripple" };
const SYMBOLS = ["XRP"];

/**
 * Pools AMM on-chain par symbole de cotation (`asset` exprimé en `asset2`). VIDE
 * par défaut : à remplir avec les issuers RÉELS des tokens (ex. RLUSD) une fois
 * connus, pour activer le prix on-chain. Sans pool, le feed reste mono-source
 * (CEX) ; avec, le prix on-chain est composé au CEX sous garde de divergence.
 */
const ONCHAIN_POOLS: SymbolPoolMap = {};

/** Journal runtime (replis de prix, trous d'indexation) — jamais avalés. */
const logger: FeedLogger = {
  warn: (message) => console.warn(`[runtime] ${message}`),
};

const fetchJson: FetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new PriceFeedError(`CEX HTTP ${String(response.status)}`);
  }
  return response.json();
};

/** Source de prix on-chain : seulement si un client ET des pools sont configurés. */
function buildOnchainProvider(
  xrpl: XrplClient | undefined,
): OnchainPriceProvider | undefined {
  if (xrpl === undefined || Object.keys(ONCHAIN_POOLS).length === 0) {
    return undefined;
  }
  return new AmmOnchainPriceProvider(xrpl, ONCHAIN_POOLS);
}

/** Configuration de l'indexeur d'attribution (client + SourceTag + comptes + store). */
interface IndexerSetup {
  readonly accounts: readonly string[];
  readonly sourceTag: number;
  readonly store: SqliteAttributionStore;
}

/**
 * Réunit la config de l'indexeur. Renvoie `undefined` si l'indexeur n'est pas
 * demandé (pas de nœud, ou aucun compte à scanner). En revanche, des comptes
 * fournis **sans** SourceTag = config cassée (on indexerait sans pouvoir
 * attribuer) → on **lève**, symétriquement à la signature Xaman. Le store est
 * créé ici (avant `createApp`, pour exposer `/metrics`) ; l'indexeur lui-même est
 * instancié après, une fois le cache de prix disponible.
 */
function buildIndexerSetup(
  xrpl: XrplClient | undefined,
  sourceTag: number | undefined,
): IndexerSetup | undefined {
  if (xrpl === undefined) {
    return undefined;
  }
  const accounts = env.readIndexedAccounts();
  if (accounts === undefined) {
    return undefined; // pas de comptes à scanner → indexeur non demandé
  }
  if (sourceTag === undefined) {
    throw new Error(
      "Indexeur configuré (XRPL_WSS_URL + TIDE_INDEXED_ACCOUNTS) mais TIDE_SOURCE_TAG manquant",
    );
  }
  return {
    accounts,
    sourceTag,
    store: new SqliteAttributionStore(env.readAttributionDbPath()),
  };
}

/**
 * Dépendances de signature Xaman si les clés XUMM sont présentes. Une config
 * partielle (clés sans SourceTag ou sans prize pool) lève : on ne sert pas de
 * route de signature qui produirait des tx non attribuées ou sans destination.
 */
function buildSignDeps(sourceTag: number | undefined): SignDeps | undefined {
  const credentials = env.readXamanCredentials();
  if (credentials === undefined) {
    return undefined;
  }
  if (sourceTag === undefined) {
    throw new Error("XUMM configuré mais TIDE_SOURCE_TAG manquant (attribution requise)");
  }
  const prizePoolAddress = env.readPrizePoolAddress();
  if (prizePoolAddress === undefined) {
    throw new Error("XUMM configuré mais TIDE_PRIZE_POOL_ADDRESS manquant");
  }
  return {
    api: createXamanApi(credentials.apiKey, credentials.apiSecret),
    sourceTag,
    prizePoolAddress,
  };
}

/** Démarre la synchronisation périodique de l'indexeur (premier sync au boot). */
function startIndexerSync(indexer: AttributionIndexer): void {
  const run = (): void => {
    void indexer.sync().then(
      (result) => {
        if (result.recorded > 0) {
          console.log(
            `[indexer] ${String(result.recorded)} tx attribuées (curseur ${String(result.cursor)})`,
          );
        }
      },
      (error: unknown) => {
        console.error("[indexer] sync échoué:", error);
      },
    );
  };
  run();
  const timer = setInterval(run, INDEXER_SYNC_MS);
  timer.unref();
}

async function main(): Promise<void> {
  // Connexion SQLite partagée par les deux stores (persistance sur disque).
  const db = openDatabase(env.readDbPath());

  // Client XRPL partagé (feed on-chain + indexeur), si un nœud est configuré.
  const wsUrl = env.readOnchainWsUrl();
  const xrpl = wsUrl !== undefined ? connectXrplClient(wsUrl) : undefined;

  const sourceTag = env.readSourceTag();
  const onchainPrices = buildOnchainProvider(xrpl);
  const indexerSetup = buildIndexerSetup(xrpl, sourceTag);
  const sign = buildSignDeps(sourceTag);
  const metrics: MetricsDeps | undefined =
    indexerSetup !== undefined
      ? { store: indexerSetup.store, sourceTag: indexerSetup.sourceTag }
      : undefined;

  const { app, cache, refreshPrices } = createApp({
    feed: {
      baseUrl: env.readCexBaseUrl(),
      symbolToId: SYMBOL_TO_ID,
      vsCurrency: DEFAULT_VS_CURRENCY,
    },
    symbols: SYMBOLS,
    fetchJson,
    accountStore: new SqliteAccountStore(db),
    competitionStore: new SqliteCompetitionStore(db),
    onchainPrices,
    sign,
    metrics,
  });

  // Premier remplissage du cache (on ne bloque pas le démarrage si le CEX échoue).
  await refreshPrices().catch((error: unknown) => {
    console.error("[feed] premier rafraîchissement échoué:", error);
  });
  const priceTimer = setInterval(() => {
    void refreshPrices().catch((error: unknown) => {
      console.error("[feed] rafraîchissement échoué:", error);
    });
  }, PRICE_REFRESH_MS);
  priceTimer.unref();

  // L'indexeur a besoin du cache de prix (normalisation du volume) → après createApp.
  if (indexerSetup !== undefined && xrpl !== undefined) {
    const indexer = new AttributionIndexer(
      {
        client: xrpl,
        recorder: indexerSetup.store,
        getPrices: () => cache.current(),
        logger,
      },
      {
        accounts: indexerSetup.accounts,
        sourceTag: indexerSetup.sourceTag,
        referenceCurrency: REFERENCE_CURRENCY,
      },
    );
    startIndexerSync(indexer);
  }

  const port = env.readPort();
  await app.listen({ port, host: "0.0.0.0" });
  console.log(
    `Tide API à l'écoute sur :${String(port)} ` +
      `[on-chain:${onchainPrices !== undefined ? "on" : "off"} ` +
      `indexeur:${indexerSetup !== undefined ? "on" : "off"} ` +
      `xaman:${sign !== undefined ? "on" : "off"}]`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
