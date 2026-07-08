// Fabrique du `McpContext` runtime pour le chat agent in-UI (route
// /api/agent-chat/stream). Réutilise la MÊME couche de traduction de contrat
// que le serveur MCP externe (`bin/tide-mcp.ts`) : les backends prix / paper /
// trading / perp / competitions sont des adapters HTTP (`@tide/mcp`) pointés
// sur CE serveur (self-HTTP), donc aucune traduction (symbol→pair, price,
// Fill→result) n'est dupliquée. Agent / mandat / actions viennent des stores
// locaux (CRUD direct, pas de traduction). `loadContext` valide l'agent
// (non stoppé) et exige un mandat actif — sinon il lève, et la route renvoie
// 400 avant d'ouvrir le flux SSE.

import {
  TideApiHttp,
  httpPriceFeed,
  httpPaperBackend,
  httpTradingBackend,
  httpPerpBackend,
  httpCompetitionBackend,
  loadContext,
} from "@tide/mcp";
import type { McpContext } from "@tide/mcp";
import type { AgentStore } from "../store/agent-store";
import type { MandateStore } from "../store/mandate-store";
import type { AgentActionsStore } from "../store/agent-actions-store";

/** Stores locaux consommés directement par le contexte de chat agent. */
export interface AgentChatStores {
  readonly agents: AgentStore;
  readonly mandates: MandateStore;
  readonly actions: AgentActionsStore;
}

/** Fabrique du contexte de chat agent, ou fonction `(agentId, userId) => ctx`. */
export type AgentChatCtxFactory = (
  agentId: string,
  userId: string,
) => Promise<McpContext>;

/**
 * Construit la fabrique du `McpContext` runtime. `selfBaseUrl` = URL de boucle
 * locale de ce serveur (les backends s'y appellent). `sourceTag` renseigne
 * `config.sourceTag` (attribution on-chain, `null` si off-chain).
 */
export function buildAgentChatCtxFactory(
  selfBaseUrl: string,
  stores: AgentChatStores,
  sourceTag: number | undefined,
): AgentChatCtxFactory {
  return async (agentId, userId) => {
    const api = new TideApiHttp({ baseUrl: selfBaseUrl, userId, agentId });
    return loadContext(
      {
        agents: stores.agents,
        mandates: stores.mandates,
        priceFeed: httpPriceFeed(api),
        paper: httpPaperBackend(api),
        trading: httpTradingBackend(api),
        perp: httpPerpBackend(api),
        competitions: httpCompetitionBackend(api),
        actions: stores.actions,
        config: { mode: "paper", sourceTag: sourceTag ?? null, availablePairs: [] },
      },
      agentId,
    );
  };
}
