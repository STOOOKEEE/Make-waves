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
const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3000";

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

/** Tide cible exclusivement XRPL Mainnet. */
export type XrplNetwork = "mainnet";

/**
 * Réseau XRPL (`TIDE_XRPL_NETWORK`). Défaut `mainnet` (le hackathon tourne en
 * mainnet). Toute autre valeur est refusée pour empêcher un démarrage accidentel
 * sur un réseau de test.
 */
export function readXrplNetwork(): XrplNetwork {
  const raw = optional("TIDE_XRPL_NETWORK");
  if (raw === undefined) {
    return "mainnet";
  }
  const network = raw.toLowerCase();
  if (network !== "mainnet") {
    throw new Error(`TIDE_XRPL_NETWORK invalide: ${raw} (attendu: mainnet)`);
  }
  return "mainnet";
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
 * Seed du compte issuer des badges NFT (signature serveur des mints). `undefined`
 * si non déclaré → la feature badges on-chain reste désactivée. Lève si présent
 * mais mal formé (seed XRPL base58 commençant par `s`).
 */
export function readNftIssuerSeed(): string | undefined {
  const raw = optional("TIDE_NFT_ISSUER_SEED");
  if (raw === undefined) {
    return undefined;
  }
  if (!/^s[1-9A-HJ-NP-Za-km-z]{25,}$/.test(raw)) {
    throw new Error("TIDE_NFT_ISSUER_SEED mal formé (seed XRPL base58 attendu)");
  }
  return raw;
}

/**
 * Base publique du serveur (URL des métadonnées NFT). Défaut localhost pour le
 * dev. Lève si présente mais non http(s).
 */
export function readPublicBaseUrl(): string {
  const raw = optional("TIDE_PUBLIC_BASE_URL");
  if (raw === undefined) {
    return DEFAULT_PUBLIC_BASE_URL;
  }
  if (!/^https?:\/\//.test(raw)) {
    throw new Error(`TIDE_PUBLIC_BASE_URL doit être http(s):// : ${raw}`);
  }
  return raw.replace(/\/+$/, "");
}

/** URI IPFS immuable de l'image du badge First Trade. */
export function readFirstTradeImageUri(): string | undefined {
  const raw = optional("TIDE_FIRST_TRADE_IMAGE_URI");
  if (raw === undefined) return undefined;
  if (!/^ipfs:\/\/[a-zA-Z0-9]+(?:\/[^\s]*)?$/.test(raw)) {
    throw new Error(`TIDE_FIRST_TRADE_IMAGE_URI doit être une URI ipfs:// : ${raw}`);
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

/** Configuration volontairement complète du wallet Paper financé. */
export interface PaperWalletRuntimeConfig {
  readonly network: "mainnet";
  readonly serverUrl: string;
  readonly sourceTag: number;
  readonly issuerSeed: string;
  readonly funderSeed: string;
  readonly masterKeyHex: string;
  readonly masterKeyId: string;
  readonly recoveryAddress: string;
  readonly maxFundedWallets: number;
  readonly maxFundedWalletsPerDay: number;
}

export const PAPER_WALLET_MAINNET_ACK = "I_UNDERSTAND_THIS_SPENDS_REAL_XRP";

/**
 * Runtime custodial Mainnet isolé du runtime Live. Une configuration partielle
 * est refusée et les endpoints de test sont rejetés.
 */
export function readPaperWalletRuntimeConfig(): PaperWalletRuntimeConfig | undefined {
  const serverUrl = optional("TIDE_PAPER_WALLET_WSS_URL");
  const rawSourceTag = optional("TIDE_PAPER_WALLET_SOURCE_TAG");
  const issuerSeed = optional("TIDE_PAPER_WALLET_ISSUER_SEED");
  const funderSeed = optional("TIDE_PAPER_WALLET_FUNDER_SEED");
  const masterKeyHex = optional("TIDE_PAPER_WALLET_KEY_MASTER");
  const recoveryAddress = optional("TIDE_PAPER_WALLET_RECOVERY_ADDRESS");
  const rawMaxWallets = optional("TIDE_PAPER_WALLET_MAX_WALLETS");
  const rawMaxDaily = optional("TIDE_PAPER_WALLET_MAX_DAILY");
  const activation = [
    serverUrl,
    rawSourceTag,
    issuerSeed,
    funderSeed,
    masterKeyHex,
    recoveryAddress,
    rawMaxWallets,
    rawMaxDaily,
    optional("TIDE_PAPER_WALLET_MAINNET_ACK"),
  ];
  if (activation.every((value) => value === undefined)) return undefined;
  if (
    serverUrl === undefined ||
    rawSourceTag === undefined ||
    issuerSeed === undefined ||
    funderSeed === undefined ||
    masterKeyHex === undefined
  ) {
    throw new Error(
      "Configuration wallet Paper incomplète: WSS, SourceTag, issuer, funder et clé maître sont requis",
    );
  }
  if (!/^wss?:\/\//.test(serverUrl)) {
    throw new Error("TIDE_PAPER_WALLET_WSS_URL doit être une URL ws:// ou wss://");
  }
  const sourceTag = Number(rawSourceTag);
  if (!Number.isInteger(sourceTag)) {
    throw new Error("TIDE_PAPER_WALLET_SOURCE_TAG doit être un entier");
  }
  assertAttributionTag(sourceTag);
  if (!/^s[1-9A-HJ-NP-Za-km-z]{25,}$/.test(issuerSeed)) {
    throw new Error("TIDE_PAPER_WALLET_ISSUER_SEED mal formé (seed XRPL base58 attendu)");
  }
  if (!/^s[1-9A-HJ-NP-Za-km-z]{25,}$/.test(funderSeed)) {
    throw new Error("TIDE_PAPER_WALLET_FUNDER_SEED mal formé (seed XRPL base58 attendu)");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(masterKeyHex)) {
    throw new Error("TIDE_PAPER_WALLET_KEY_MASTER doit contenir 64 caractères hexadécimaux");
  }
  if (/altnet|testnet|devnet/i.test(serverUrl)) {
    throw new Error("Le runtime Paper Mainnet ne peut pas cibler un endpoint de test");
  }
  if (optional("TIDE_PAPER_WALLET_MAINNET_ACK") !== PAPER_WALLET_MAINNET_ACK) {
    throw new Error(
      `TIDE_PAPER_WALLET_MAINNET_ACK doit valoir ${PAPER_WALLET_MAINNET_ACK}`,
    );
  }
  if (recoveryAddress === undefined) {
    throw new Error("TIDE_PAPER_WALLET_RECOVERY_ADDRESS est requis en Mainnet");
  }
  assertValidAddress(recoveryAddress, "TIDE_PAPER_WALLET_RECOVERY_ADDRESS");
  if (rawMaxWallets === undefined || rawMaxDaily === undefined) {
    throw new Error(
      "TIDE_PAPER_WALLET_MAX_WALLETS et TIDE_PAPER_WALLET_MAX_DAILY sont requis en Mainnet",
    );
  }
  const maxFundedWallets = readOptionalBoundedInteger(
    "TIDE_PAPER_WALLET_MAX_WALLETS",
    rawMaxWallets,
    1,
    10_000,
  );
  const maxFundedWalletsPerDay = readOptionalBoundedInteger(
    "TIDE_PAPER_WALLET_MAX_DAILY",
    rawMaxDaily,
    1,
    1_000,
  );
  if (
    maxFundedWallets !== undefined &&
    maxFundedWalletsPerDay !== undefined &&
    maxFundedWalletsPerDay > maxFundedWallets
  ) {
    throw new Error("TIDE_PAPER_WALLET_MAX_DAILY ne peut pas dépasser le plafond total");
  }
  if (maxFundedWallets === undefined || maxFundedWalletsPerDay === undefined) {
    throw new Error("Plafonds Mainnet manquants");
  }
  return {
    network: "mainnet",
    serverUrl,
    sourceTag,
    issuerSeed,
    funderSeed,
    masterKeyHex,
    masterKeyId: optional("TIDE_PAPER_WALLET_KEY_ID") ?? "v1",
    recoveryAddress,
    maxFundedWallets,
    maxFundedWalletsPerDay,
  };
}

function readOptionalBoundedInteger(
  name: string,
  raw: string | undefined,
  minimum: number,
  maximum: number,
): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} doit être un entier entre ${String(minimum)} et ${String(maximum)}`);
  }
  return value;
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

/**
 * Endpoint LLM Anthropic-compatible (`TIDE_LLM_BASE_URL`). Absent → API
 * Anthropic. Pour DeepSeek : `https://api.deepseek.com/anthropic` (avec
 * `TIDE_LLM_MODEL=deepseek-v4-flash`). Doit être une URL http(s).
 */
export function readLlmBaseUrl(): string | undefined {
  const raw = optional("TIDE_LLM_BASE_URL");
  if (raw === undefined) {
    return undefined;
  }
  if (!/^https?:\/\//.test(raw)) {
    throw new Error(`TIDE_LLM_BASE_URL doit être une URL http(s): ${raw}`);
  }
  return raw;
}

/**
 * Token d'authentification pour la console admin locale.
 * La console reste systématiquement désactivée avec `NODE_ENV=production`,
 * même si une ancienne configuration serveur contient encore le secret.
 */
export function readAdminToken(): string | undefined {
  if (process.env["NODE_ENV"] === "production") {
    return undefined;
  }
  return optional("TIDE_ADMIN_TOKEN");
}

export interface PrivateAdminRuntimeConfig {
  readonly token: string;
  readonly port: number;
}

/**
 * Console opérateur de production sur un port séparé. Les deux variables sont
 * obligatoires ensemble ; Docker publie ce port exclusivement sur 127.0.0.1.
 */
export function readPrivateAdminRuntimeConfig(): PrivateAdminRuntimeConfig | undefined {
  if (process.env["NODE_ENV"] !== "production") return undefined;
  const token = optional("TIDE_ADMIN_TOKEN");
  const rawPort = optional("TIDE_PRIVATE_ADMIN_PORT");
  if (token === undefined && rawPort === undefined) return undefined;
  if (token === undefined || rawPort === undefined) {
    throw new Error(
      "Configuration admin privée incomplète: TIDE_ADMIN_TOKEN et TIDE_PRIVATE_ADMIN_PORT sont requis",
    );
  }
  if (token.length < 32) {
    throw new Error("TIDE_ADMIN_TOKEN doit contenir au moins 32 caractères en production");
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > MAX_PORT) {
    throw new Error(`TIDE_PRIVATE_ADMIN_PORT invalide: ${rawPort}`);
  }
  if (port === readPort()) {
    throw new Error("Le port admin privé doit être distinct du port API public");
  }
  return { token, port };
}

/**
 * Origines CORS autorisées (F6, CSV). En développement, l'absence conserve le
 * mode permissif. En production, on tombe sur l'allowlist Tide plutôt que de
 * refléter silencieusement n'importe quelle origine.
 */
export function readCorsOrigin(): string[] | undefined {
  const raw = optional("TIDE_CORS_ORIGIN");
  if (raw === undefined) {
    return process.env["NODE_ENV"] === "production"
      ? ["https://tidetrade.xyz", "https://www.tidetrade.xyz"]
      : undefined;
  }
  const origins = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return origins.length > 0 ? origins : undefined;
}

/** Longueur minimale du secret de session (entropie suffisante pour HS256). */
const MIN_SESSION_SECRET_LENGTH = 32;
/** Durée de vie par défaut d'un token de session : 24 h. */
const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60;

/**
 * Secret HMAC des JWT de session (Sign-In with XRPL). **Obligatoire** : l'API
 * garde des fonds → pas de démarrage sans authentification. Lève si absent ou
 * trop court. Jamais journalisé.
 */
export function readSessionSecret(): string {
  const raw = optional("TIDE_SESSION_SECRET");
  if (raw === undefined) {
    throw new Error(
      "TIDE_SESSION_SECRET manquant (secret de session requis pour l'authentification)",
    );
  }
  if (raw.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `TIDE_SESSION_SECRET trop court (min ${String(MIN_SESSION_SECRET_LENGTH)} caractères)`,
    );
  }
  return raw;
}

/** Durée de vie d'un token de session, en secondes. Défaut 24 h. Lève si invalide. */
export function readSessionTtlSeconds(): number {
  const raw = optional("TIDE_SESSION_TTL");
  if (raw === undefined) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }
  const seconds = Number(raw);
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new Error(`TIDE_SESSION_TTL invalide (entier positif attendu): ${raw}`);
  }
  return seconds;
}

export interface ExternalAuthConfig {
  readonly supabaseUrl: string;
  readonly publishableKey: string;
}

/** Email + OAuth social. Les deux variables sont obligatoires ensemble. */
export function readExternalAuthConfig(): ExternalAuthConfig | undefined {
  const supabaseUrl = optional("TIDE_AUTH_SUPABASE_URL");
  const publishableKey = optional("TIDE_AUTH_SUPABASE_PUBLISHABLE_KEY");
  if (supabaseUrl === undefined && publishableKey === undefined) return undefined;
  if (supabaseUrl === undefined || publishableKey === undefined) {
    throw new Error("Configuration Supabase Auth incomplète");
  }
  let parsed: URL;
  try {
    parsed = new URL(supabaseUrl);
  } catch {
    throw new Error("TIDE_AUTH_SUPABASE_URL invalide");
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("TIDE_AUTH_SUPABASE_URL doit utiliser HTTPS");
  }
  if (publishableKey.length < 20) {
    throw new Error("TIDE_AUTH_SUPABASE_PUBLISHABLE_KEY invalide");
  }
  return { supabaseUrl: parsed.origin, publishableKey };
}

/**
 * Identifiants des opérateurs autorisés dans la console admin (CSV). Analyse
 * la liste en ignorant les espaces vides et les entrées vides.
 * Renvoie un tableau (peut être vide si absent).
 */
export function readOperatorUserIds(): string[] {
  const raw = optional("TIDE_OPERATOR_USER_IDS");
  if (raw === undefined) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
