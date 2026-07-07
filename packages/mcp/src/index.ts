// Tide MCP server : exposes trading tools via Model Context Protocol.
// See docs/superpowers/specs/2026-07-05-ai-agent-design.md.
export const MCP_PACKAGE_VERSION = "0.0.0";
export { startMcpServer, type ServerConfig } from "./server";
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
