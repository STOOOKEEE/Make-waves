import { assertAttributionTag, assertValidAddress } from "@tide/xrpl";

/**
 * Lecture et validation des variables d'environnement. Un lecteur renvoie
 * `undefined` quand la fonctionnalité associée n'est pas configurée (feature OFF,
 * silencieux) mais **lève** si elle est configurée de façon invalide ou partielle
 * (config cassée → on échoue bruyamment au démarrage, jamais en silence).
 *
 * Réutilise les validateurs audités de `@tide/xrpl` (adresses, SourceTag) plutôt
 * que de revalider à la main.
 */

const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;
const DEFAULT_DB_PATH = "tide.db";
const DEFAULT_CEX_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_ATTRIBUTION_DB_PATH = ":memory:";

/** Valeur d'env non vide, ou `undefined` si absente/vide. */
function optional(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  return raw.trim();
}

export function readPort(): number {
  const raw = optional("PORT");
  if (raw === undefined) {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > MAX_PORT) {
    throw new Error(`PORT invalide: ${raw}`);
  }
  return port;
}

export function readDbPath(): string {
  return process.env["TIDE_DB_PATH"] ?? DEFAULT_DB_PATH;
}

export function readCexBaseUrl(): string {
  return optional("CEX_BASE_URL") ?? DEFAULT_CEX_BASE_URL;
}

export function readAttributionDbPath(): string {
  return optional("TIDE_ATTRIBUTION_DB_PATH") ?? DEFAULT_ATTRIBUTION_DB_PATH;
}

/**
 * SourceTag d'attribution Tide (partagé par l'indexeur et la signature). Lève si
 * présent mais invalide (non entier, 0 — qui capterait toutes les tx non taggées —,
 * ou hors uint32). `undefined` si non déclaré.
 */
export function readSourceTag(): number | undefined {
  const raw = optional("TIDE_SOURCE_TAG");
  if (raw === undefined) {
    return undefined;
  }
  const tag = Number(raw);
  if (!Number.isInteger(tag)) {
    throw new Error(`TIDE_SOURCE_TAG invalide (entier attendu): ${raw}`);
  }
  assertAttributionTag(tag);
  return tag;
}

/** URL WebSocket d'un nœud rippled (active le client on-chain). Lève si non ws/wss. */
export function readOnchainWsUrl(): string | undefined {
  const raw = optional("XRPL_WSS_URL");
  if (raw === undefined) {
    return undefined;
  }
  if (!/^wss?:\/\//.test(raw)) {
    throw new Error(`XRPL_WSS_URL doit être une URL ws:// ou wss:// : ${raw}`);
  }
  return raw;
}

/**
 * Comptes XRPL à scanner par l'indexeur (séparés par des virgules) : le prize
 * pool (buy-ins) et les comptes joueurs Live (swaps `OfferCreate`). Chaque adresse
 * est validée. `undefined` si non configuré.
 */
export function readIndexedAccounts(): readonly string[] | undefined {
  const raw = optional("TIDE_INDEXED_ACCOUNTS");
  if (raw === undefined) {
    return undefined;
  }
  const accounts = raw
    .split(",")
    .map((account) => account.trim())
    .filter((account) => account !== "");
  if (accounts.length === 0) {
    return undefined;
  }
  for (const account of accounts) {
    assertValidAddress(account, "TIDE_INDEXED_ACCOUNTS");
  }
  return accounts;
}

/** Adresse du prize pool multisig (destination des buy-ins). Validée. */
export function readPrizePoolAddress(): string | undefined {
  const raw = optional("TIDE_PRIZE_POOL_ADDRESS");
  if (raw === undefined) {
    return undefined;
  }
  assertValidAddress(raw, "TIDE_PRIZE_POOL_ADDRESS");
  return raw;
}

export interface XamanCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

/**
 * Clés API XUMM. Les deux doivent être fournies ensemble (une seule = config
 * cassée → on lève). `undefined` si aucune n'est définie. Les valeurs ne sont ni
 * journalisées ni renvoyées ailleurs (secrets).
 */
export function readXamanCredentials(): XamanCredentials | undefined {
  const apiKey = optional("XUMM_API_KEY");
  const apiSecret = optional("XUMM_API_SECRET");
  if (apiKey === undefined && apiSecret === undefined) {
    return undefined;
  }
  if (apiKey === undefined || apiSecret === undefined) {
    throw new Error(
      "XUMM_API_KEY et XUMM_API_SECRET doivent être fournis ensemble",
    );
  }
  return { apiKey, apiSecret };
}
