#!/usr/bin/env node
import { startMcpServer } from "../src/server";
import { defaultPublicConfig } from "../src/lib/public-config";
import {
  TideApiHttp,
  TideApiHttpError,
  httpPriceFeed,
  httpPaperBackend,
  httpTradingBackend,
  httpPerpBackend,
  httpCompetitionBackend,
  httpAgentActionsStore,
} from "../src/lib/api-client";
import type {
  AgentActionsStore,
  Broadcaster,
  CompetitionBackend,
  LiveCryptoService,
  PaperBackend,
  PerpBackend,
  PriceFeed,
  PublicConfig,
  TradingBackend,
} from "../src/types";
import { EventEmitter } from "node:events";

// Bootstrap runtime : chaque backend est un adaptateur HTTP vers apps/api
// (cf. `api-client.ts`). `@tide/mcp` reste un package feuille — le serveur MCP
// peut être lancé comme process séparé (par Claude Desktop, etc.).

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.trim() === "") {
    console.error(`[tide-mcp] missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

const apiBaseUrl = requireEnv("TIDE_API_BASE_URL");
const agentId = requireEnv("TIDE_AGENT_ID");
const userId = requireEnv("TIDE_USER_ID");

// Optional : clé LLM si on veut brancher le chat intégré plus tard.
const llmApiKey = process.env["TIDE_LLM_API_KEY"];

const api = new TideApiHttp({ baseUrl: apiBaseUrl, userId, agentId });

const priceFeed: PriceFeed = httpPriceFeed(api);
const paper: PaperBackend = httpPaperBackend(api);
const trading: TradingBackend = httpTradingBackend(api);
const perp: PerpBackend = httpPerpBackend(api);
const competitions: CompetitionBackend = httpCompetitionBackend(api);
const actions: AgentActionsStore = httpAgentActionsStore(api);

// Broadcaster local — SSE events émis par les outils (agent_killed, agent_action)
// sont consommés par le front via `/api/agents/events` côté apps/api.
const localEmitter = new EventEmitter();
const broadcaster: Broadcaster = {
  emit(event: { readonly type: string; readonly [k: string]: unknown }): void {
    localEmitter.emit("event", event);
  },
};
// Expose the EventEmitter for future SSE wiring if needed.
void localEmitter;

// Live mode désactivé tant que `TIDE_AGENT_KEY_MASTER` n'est pas câblé dans
// apps/api (cf. spec §3.5 — la clé de l'agent XRPL est chiffrée AES-256-GCM côté
// serveur, jamais accessible au client). Pour le MVP, `place_order` en mode
// `live` lèvera donc une erreur explicite côté serveur.
const liveCrypto: LiveCryptoService = {
  async decryptAgentSeed() {
    throw new Error("Live mode not wired in MVP — set up TIDE_AGENT_KEY_MASTER + apps/api live-account endpoints");
  },
};

// Mode (paper/live) : lu depuis la config serveur (apps/api /api/config).
// Pour le MVP, on force `paper` — le câblage live reste à faire.
const config: PublicConfig = { ...defaultPublicConfig, mode: "paper" };

startMcpServer({
  apiBaseUrl,
  agentId,
  userId,
  priceFeed,
  paper,
  trading,
  perp,
  competitions,
  actions,
  broadcaster,
  liveCrypto,
  config,
}).catch((err: unknown) => {
  // stderr uniquement — ne pas polluer stdout qui porte le protocole MCP.
  console.error("[tide-mcp] fatal:", err instanceof TideApiHttpError ? `${err.status} ${err.body}` : err);
  process.exit(1);
});

// Stubs minimaux pour les vérifications de type : `llmApiKey` non utilisé pour
// l'instant (chat intégré = Tâche 27, branché séparément). Référence conservée
// pour éviter les avertissements TS sur variable non utilisée.
void llmApiKey;