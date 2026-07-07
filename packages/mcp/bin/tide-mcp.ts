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
  TradingBackend,
  Agent,
  Mandate,
  McpContext,
} from "../src/types";
import { EventEmitter } from "node:events";

// Bootstrap runtime : chaque backend est un adaptateur HTTP vers apps/api
// (cf. `api-client.ts`). `@tide/mcp` reste un package feuille — le serveur MCP
// peut être lancé comme process séparé (par Claude Desktop, etc.).
// Le `loadContext` est fait ici : on fetche l'agent + le mandate actif via
// l'API avant de démarrer le serveur, et on passe le McpContext pré-construit
// à `startMcpServer` (cf. `ServerConfig.context`).

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

const api = new TideApiHttp({ baseUrl: apiBaseUrl, userId, agentId });

const priceFeed: PriceFeed = httpPriceFeed(api);
const paper: PaperBackend = httpPaperBackend(api);
const trading: TradingBackend = httpTradingBackend(api);
const perp: PerpBackend = httpPerpBackend(api);
const competitions: CompetitionBackend = httpCompetitionBackend(api);
const actions: AgentActionsStore = httpAgentActionsStore(api);

/**
 * Charge l'agent + le mandate actif via l'API. Throw si l'agent n'existe pas,
 * est `stopped`, ou si aucun mandate n'est signé.
 */
async function loadContext(): Promise<McpContext> {
  const agent = await api.getAgent(agentId);
  if (agent === null) {
    throw new Error(`agent ${agentId} not found`);
  }
  if (agent.status === "stopped") {
    throw new Error(`agent ${agentId} is stopped`);
  }
  const mandates = (await api.listMandates(agentId)) as readonly Mandate[];
  const now = Date.now();
  const active = mandates.find((m) => m.status === "active" && m.validUntil > now);
  return {
    agent: agent as unknown as Agent,
    userId: agent.userId,
    mandate: active ?? null,
    priceFeed,
    paper,
    trading,
    perp,
    competitions,
    actions,
    config: { ...defaultPublicConfig, mode: "paper" },
    broadcaster,
    liveCrypto,
  };
}

// Broadcaster local — SSE events émis par les outils (agent_killed, agent_action)
// sont consommés par le front via `/api/agents/events` côté apps/api.
const localEmitter = new EventEmitter();
const broadcaster: Broadcaster = {
  emit(event: { readonly type: string; readonly [k: string]: unknown }): void {
    localEmitter.emit("event", event);
  },
};
void localEmitter;

// Live mode désactivé tant que `TIDE_AGENT_KEY_MASTER` n'est pas câblé dans
// apps/api (cf. spec §3.5). Pour le MVP, `place_order` en mode `live` lèvera
// donc une erreur explicite côté serveur.
const liveCrypto: LiveCryptoService = {
  async decryptAgentSeed() {
    throw new Error("Live mode not wired in MVP — set up TIDE_AGENT_KEY_MASTER + apps/api live-account endpoints");
  },
};

(async () => {
  let context: McpContext;
  try {
    context = await loadContext();
  } catch (err) {
    console.error("[tide-mcp] loadContext failed:", err);
    process.exit(1);
  }
  await startMcpServer({
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
    config: context.config,
    context,
  }).catch((err: unknown) => {
    console.error(
      "[tide-mcp] fatal:",
      err instanceof TideApiHttpError ? `${err.status} ${err.body}` : err,
    );
    process.exit(1);
  });
})();