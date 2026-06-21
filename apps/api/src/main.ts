import { createApp } from "./app";
import { PriceFeedError } from "./feed/errors";
import type { FetchJson } from "./feed/cex-price-feed";
import { openDatabase } from "./store/sqlite";
import { SqliteAccountStore } from "./store/sqlite-account-store";
import { SqliteCompetitionStore } from "./store/sqlite-competition-store";

// Entrypoint du serveur. Assemble l'app testée (`createApp`) avec le vrai monde :
// `fetch`, variables d'environnement, écoute réseau et rafraîchissement périodique.
// La logique est testée ailleurs ; ce fichier n'est que le câblage runtime.

const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;
const DEFAULT_DB_PATH = "tide.db";
const DEFAULT_CEX_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_VS_CURRENCY = "usd";
const PRICE_REFRESH_MS = 30_000;
const SYMBOL_TO_ID: Readonly<Record<string, string>> = { XRP: "ripple" };
const SYMBOLS = ["XRP"];

const fetchJson: FetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new PriceFeedError(`CEX HTTP ${String(response.status)}`);
  }
  return response.json();
};

function readPort(): number {
  const raw = process.env["PORT"];
  if (raw === undefined) {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > MAX_PORT) {
    throw new Error(`PORT invalide: ${raw}`);
  }
  return port;
}

async function main(): Promise<void> {
  // Connexion SQLite partagée par les deux stores (persistance sur disque).
  const db = openDatabase(process.env["TIDE_DB_PATH"] ?? DEFAULT_DB_PATH);
  const { app, refreshPrices } = createApp({
    feed: {
      baseUrl: process.env["CEX_BASE_URL"] ?? DEFAULT_CEX_BASE_URL,
      symbolToId: SYMBOL_TO_ID,
      vsCurrency: DEFAULT_VS_CURRENCY,
    },
    symbols: SYMBOLS,
    fetchJson,
    accountStore: new SqliteAccountStore(db),
    competitionStore: new SqliteCompetitionStore(db),
  });

  // Premier remplissage du cache (on ne bloque pas le démarrage si le CEX échoue).
  await refreshPrices().catch((error: unknown) => {
    console.error("[feed] premier rafraîchissement échoué:", error);
  });
  const timer = setInterval(() => {
    void refreshPrices().catch((error: unknown) => {
      console.error("[feed] rafraîchissement échoué:", error);
    });
  }, PRICE_REFRESH_MS);
  timer.unref();

  const port = readPort();
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Tide API à l'écoute sur :${String(port)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
