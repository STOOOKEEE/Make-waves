// Tide MCP server : exposes trading tools via Model Context Protocol.
// See docs/superpowers/specs/2026-07-05-ai-agent-design.md.
export const MCP_PACKAGE_VERSION = "0.0.0";
export { startMcpServer, type ServerConfig } from "./server";
// Client HTTP + adapters vers apps/api — réutilisés par apps/api (chat agent
// in-UI) pour construire un `McpContext` pointé sur lui-même, partageant la
// couche de traduction de contrat (symbol→pair, price, Fill→result) avec le
// serveur MCP externe (bin/tide-mcp.ts) : une seule source de vérité.
export {
  TideApiHttp,
  TideApiHttpError,
  httpPriceFeed,
  httpPaperBackend,
  httpTradingBackend,
  httpPerpBackend,
  httpCompetitionBackend,
  httpAgentActionsStore,
} from "./lib/api-client";
export {
  loadContext,
  type AgentStore,
  type MandateStore,
  type ContextStores,
} from "./lib/context";
// Types partagés — `apps/api` (AgentChatService) consomme ces types pour
// partager le contrat des outils avec l'UI front. `McpContext` est le
// transport des deps d'exécution (mandat, prix, audit, garde-fous).
export type {
  McpContext,
  PaperBackend,
  TradingBackend,
  PerpBackend,
  CompetitionBackend,
  PriceFeed,
  AgentActionsStore,
  Broadcaster,
  PublicConfig,
  Agent,
  Mandate,
  AgentAction,
  LiveCryptoService,
} from "./types";
