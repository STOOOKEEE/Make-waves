import type {
  Agent,
  AgentActionsStore,
  Mandate,
  McpContext,
  PaperBackend,
  PriceFeed,
  TradingBackend,
} from "../types";
import { McpError } from "./errors";

/** Minimal local store interfaces — keep @tide/mcp a leaf package. */
export interface AgentStore {
  get(id: string): Promise<Agent | null>;
}

export interface MandateStore {
  getActive(agentId: string): Promise<Mandate | null>;
}

export interface ContextStores {
  readonly agents: AgentStore;
  readonly mandates: MandateStore;
  readonly priceFeed: PriceFeed;
  readonly paper: PaperBackend;
  readonly trading: TradingBackend;
  readonly actions: AgentActionsStore;
}

export async function loadContext(
  stores: ContextStores,
  agentId: string,
): Promise<McpContext> {
  const agent = await stores.agents.get(agentId);
  if (!agent) {
    throw new McpError("INVALID_PARAMS", `Agent ${agentId} not found`);
  }
  if (agent.status === "stopped") {
    throw new McpError("AGENT_STOPPED", "Agent stopped by user. Resume via UI.");
  }
  const mandate = await stores.mandates.getActive(agentId);
  if (!mandate || mandate.validUntil <= Date.now()) {
    throw new McpError(
      "MANDATE_INVALID",
      "No active mandate. Sign a new one via /api/mandates before trading.",
    );
  }
  return {
    agent,
    userId: agent.userId,
    mandate,
    priceFeed: stores.priceFeed,
    paper: stores.paper,
    trading: stores.trading,
    actions: stores.actions,
  };
}