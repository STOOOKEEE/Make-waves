import { assertAttributionTag, assertValidAddress } from "@tide/xrpl";
import { RLUSD_CURRENCY, RLUSD_SYMBOL } from "../exec/plan-live";
import type { LiveQuote } from "../exec/plan-live";
import type { SymbolPoolMap } from "../feed/onchain-price";

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

/** Réseau XRPL ciblé. Détermine notamment l'émetteur RLUSD par défaut. */
export type XrplNetwork = "mainnet" | "testnet";

const XRPL_NETWORKS: readonly XrplNetwork[] = ["mainnet", "testnet"];

/**
 * Réseau XRPL (`TIDE_XRPL_NETWORK`). Défaut `mainnet` (le hackathon tourne en
 * mainnet). Toute autre valeur que celles connues = config cassée → on lève.
 */
export function readXrplNetwork(): XrplNetwork {
  const raw = optional("TIDE_XRPL_NETWORK");
  if (raw === undefined) {
    return "mainnet";
  }
  const network = raw.toLowerCase();
  if (!XRPL_NETWORKS.includes(network as XrplNetwork)) {
    throw new Error(
      `TIDE_XRPL_NETWORK invalide: ${raw} (attendu: ${XRPL_NETWORKS.join(" | ")})`,
    );
  }
  return network as XrplNetwork;
}

/**
 * Pools AMM on-chain à lire pour composer le prix (feed), au format JSON :
 * `{"RLUSD":{"asset":{"currency":"<hex|XRP>","issuer":"r..."},"asset2":{"currency":"XRP"}}}`.
 * Chaque devise porte un `currency` non vide ; un `issuer` (si présent, requis
 * pour tout token non-XRP) est validé comme adresse XRPL. JSON ou structure
 * invalide = config cassée → on lève. `undefined` si non déclaré (feed mono-source CEX).
 */
export function readOnchainPools(): SymbolPoolMap | undefined {
  const raw = optional("TIDE_ONCHAIN_POOLS");
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `TIDE_ONCHAIN_POOLS n'est pas un JSON valide: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("TIDE_ONCHAIN_POOLS doit être un objet { symbole: { asset, asset2 } }");
  }
  const pools: Record<string, { asset: XrplCurrency; asset2: XrplCurrency }> = {};
  for (const [symbol, pool] of Object.entries(parsed)) {
    pools[symbol] = {
      asset: parseXrplCurrency(pool, "asset", symbol),
      asset2: parseXrplCurrency(pool, "asset2", symbol),
    };
  }
  return pools;
}

interface XrplCurrency {
  readonly currency: string;
  readonly issuer?: string;
}

/** Valide une devise XRPL (`asset`/`asset2`) d'un pool. Lève si mal formée. */
function parseXrplCurrency(pool: unknown, key: "asset" | "asset2", symbol: string): XrplCurrency {
  if (typeof pool !== "object" || pool === null) {
    throw new Error(`TIDE_ONCHAIN_POOLS["${symbol}"] doit être un objet`);
  }
  const side: unknown = (pool as Record<string, unknown>)[key];
  if (typeof side !== "object" || side === null) {
    throw new Error(`TIDE_ONCHAIN_POOLS["${symbol}"].${key} manquant`);
  }
  const { currency, issuer } = side as Record<string, unknown>;
  if (typeof currency !== "string" || currency.trim() === "") {
    throw new Error(`TIDE_ONCHAIN_POOLS["${symbol}"].${key}.currency manquant`);
  }
  if (issuer !== undefined) {
    if (typeof issuer !== "string") {
      throw new Error(`TIDE_ONCHAIN_POOLS["${symbol}"].${key}.issuer doit être une adresse`);
    }
    assertValidAddress(issuer, `TIDE_ONCHAIN_POOLS["${symbol}"].${key}.issuer`);
    return { currency, issuer };
  }
  return { currency };
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

/**
 * Quote des swaps Live : RLUSD émis par l'adresse `TIDE_RLUSD_ISSUER` (validée).
 * Active le moteur d'exécution Live (le seul actif tradé est XRP contre ce quote).
 * `undefined` si l'issuer n'est pas configuré → Live non exposé.
 */
export function readLiveQuote(): LiveQuote | undefined {
  const issuer = optional("TIDE_RLUSD_ISSUER");
  if (issuer === undefined) {
    return undefined;
  }
  assertValidAddress(issuer, "TIDE_RLUSD_ISSUER");
  return { currency: RLUSD_CURRENCY, issuer, symbol: RLUSD_SYMBOL };
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

/**
 * Master key AES-256-GCM (32 bytes / 64 hex chars) utilisée pour chiffrer les
 * clés privées XRPL des agents au repos. Validée strictement quand déclarée
 * (mauvais format = config cassée, on lève). `undefined` si non déclarée —
 * l'agent-service Live ne peut alors pas tourner, mais l'API reste démarrable.
 */
export function readAgentKeyMaster(): string | undefined {
  const raw = optional("TIDE_AGENT_KEY_MASTER");
  if (raw === undefined) {
    return undefined;
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error("TIDE_AGENT_KEY_MASTER must be 64 hex chars (32 bytes)");
  }
  return raw;
}

/** Modèle Claude par défaut pour le chat agent (Tâche 27). Surchargeable via
 * `TIDE_LLM_MODEL`. Format : identifiant nu (`claude-sonnet-4-5`,
 * `claude-opus-4-8`...) — pas de suffixe de date. */
export const DEFAULT_LLM_MODEL = "claude-sonnet-4-5";

/**
 * Clé API Anthropic pour le chat agent (Tâche 27). `undefined` si non
 * déclarée → la route `/api/agent-chat/stream` n'est pas montée. La valeur
 * n'est ni journalisée ni renvoyée ailleurs.
 */
export function readLlmApiKey(): string | undefined {
  return optional("TIDE_LLM_API_KEY");
}

/** Modèle Claude pour le chat agent. Défaut = `DEFAULT_LLM_MODEL`. */
export function readLlmModel(): string {
  return optional("TIDE_LLM_MODEL") ?? DEFAULT_LLM_MODEL;
}
