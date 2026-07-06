#!/usr/bin/env node
import { startMcpServer } from "../src/server";
import { defaultPublicConfig } from "../src/lib/public-config";
import type {
  AgentActionsStore,
  CompetitionBackend,
  PaperBackend,
  PerpBackend,
  PriceFeed,
  TradingBackend,
} from "../src/types";

// Bootstrap placeholder — le vrai câblage (loadContext + stores) arrive en Tasks 12+.
// On fournit un priceFeed stub qui échoue explicitement : le bootstrap ne doit pas
// servir de chemin réel pour les outils tant que loadContext n'est pas branché.
const bootstrapPriceFeed: PriceFeed = {
  async priceOf() {
    throw new Error("priceFeed non câblé — utiliser loadContext");
  },
  async history() {
    throw new Error("priceFeed non câblé — utiliser loadContext");
  },
  async orderbook() {
    throw new Error("priceFeed non câblé — utiliser loadContext");
  },
  async markets() {
    throw new Error("priceFeed non câblé — utiliser loadContext");
  },
};

const bootstrapPaper: PaperBackend = {
  async getBalance() {
    throw new Error("paper non câblé — utiliser loadContext");
  },
  async getPortfolio() {
    throw new Error("paper non câblé — utiliser loadContext");
  },
  async listPositions() {
    throw new Error("paper non câblé — utiliser loadContext");
  },
  async getLeaderboard() {
    throw new Error("paper non câblé — utiliser loadContext");
  },
};

// Stubs Tâche 14 — Tâche 15+ câblera le vrai trading + actions via loadContext.
const bootstrapTrading: TradingBackend = {
  async placeOrder() {
    throw new Error("trading non câblé — utiliser loadContext");
  },
  async cancelOrder() {
    throw new Error("trading non câblé — utiliser loadContext");
  },
  async getOpenOrders() {
    throw new Error("trading non câblé — utiliser loadContext");
  },
};

// Stub Tâche 15 — câblage runtime via loadContext (Tâche câblage).
const bootstrapPerp: PerpBackend = {
  async openPosition() {
    throw new Error("perp non câblé — utiliser loadContext");
  },
  async closePosition() {
    throw new Error("perp non câblé — utiliser loadContext");
  },
};

// Stub Tâche 16 — câblage runtime via loadContext (Tâche câblage).
const bootstrapCompetitions: CompetitionBackend = {
  async list() {
    throw new Error("competitions non câblé — utiliser loadContext");
  },
  async get() {
    throw new Error("competitions non câblé — utiliser loadContext");
  },
  async join() {
    throw new Error("competitions non câblé — utiliser loadContext");
  },
  async getLeaderboard() {
    throw new Error("competitions non câblé — utiliser loadContext");
  },
};

const bootstrapActions: AgentActionsStore = {
  async record() {
    throw new Error("actions non câblé — utiliser loadContext");
  },
  async findByIdempotencyKey() {
    throw new Error("actions non câblé — utiliser loadContext");
  },
  async listByAgent() {
    throw new Error("actions non câblé — utiliser loadContext");
  },
  async countToday() {
    throw new Error("actions non câblé — utiliser loadContext");
  },
};

startMcpServer({
  // Ces deps seront injectées via env vars en v1 (TIDE_API_URL, TIDE_AGENT_ID, etc.)
  // Pour le MVP, le serveur MCP consomme directement les stores via des adapters.
  apiBaseUrl: process.env["TIDE_API_BASE_URL"] ?? "http://localhost:3000",
  agentId: process.env["TIDE_AGENT_ID"] ?? "",
  userId: process.env["TIDE_USER_ID"] ?? "",
  priceFeed: bootstrapPriceFeed,
  paper: bootstrapPaper,
  trading: bootstrapTrading,
  perp: bootstrapPerp,
  competitions: bootstrapCompetitions,
  actions: bootstrapActions,
  config: defaultPublicConfig,
}).catch((err: unknown) => {
  // stderr uniquement — ne pas polluer stdout qui porte le protocole MCP.
  console.error("[tide-mcp] fatal:", err);
  process.exit(1);
});