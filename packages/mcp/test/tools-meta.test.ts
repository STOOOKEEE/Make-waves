import { describe, it, expect } from "vitest";
import { getConfigTool, getAgentStatusTool } from "../src/tools/meta";
import type {
  Agent,
  AgentAction,
  AgentActionsStore,
  CompetitionBackend,
  Mandate,
  McpContext,
  PaperBackend,
  PerpBackend,
  PriceFeed,
  PublicConfig,
  TradingBackend,
} from "../src/types";
import { defaultPublicConfig } from "../src/lib/public-config";

const baseAgent: Agent = {
  id: "a42",
  userId: "u42",
  name: "x",
  type: "external",
  status: "active",
  hasLiveAccount: false,
  createdAt: 0,
  updatedAt: 0,
};

const baseMandate: Mandate = {
  id: "m1",
  agentId: "a42",
  userId: "u42",
  capitalMax: 100,
  perteMaxJour: 10,
  maxTradesPerDay: 5,
  maxLeverage: 3,
  pairesAutorisees: ["BTC"],
  style: null,
  validUntil: Date.now() + 60_000,
  signedAt: Date.now(),
  signature: "x",
  status: "active",
};

interface FakeActions extends AgentActionsStore {
  lastActionCalls: { agentId: string; limit: number }[];
  listImpl?: (agentId: string, limit: number) => Promise<AgentAction[]>;
}

function makeActions(
  overrides: { list?: FakeActions["listImpl"] } = {},
): FakeActions {
  const lastActionCalls: FakeActions["lastActionCalls"] = [];
  return {
    lastActionCalls,
    async record() {
      // no-op
    },
    async findByIdempotencyKey() {
      return null;
    },
    async listByAgent(agentId, limit) {
      const safeLimit = limit ?? 0;
      lastActionCalls.push({ agentId, limit: safeLimit });
      return (await overrides.list?.(agentId, safeLimit)) ?? [];
    },
    async countToday() {
      return 0;
    },
  };
}

function makeCtx(opts: {
  agent?: Partial<Agent>;
  config?: PublicConfig;
  actions?: AgentActionsStore;
}): McpContext {
  const priceFeed: PriceFeed = {
    async priceOf() {
      return null;
    },
    async history() {
      return [];
    },
    async orderbook() {
      return null;
    },
    async markets() {
      return [];
    },
  };
  const paper: PaperBackend = {
    async getBalance() {
      return {};
    },
    async getPortfolio() {
      return { balances: {}, equity: 0, pnl: 0 };
    },
    async listPositions() {
      return [];
    },
    async getLeaderboard() {
      return [];
    },
  };
  const trading: TradingBackend = {
    async placeOrder() {
      return { orderId: "o", status: "filled", filledQty: 0, avgPrice: 0 };
    },
    async placeLiveOrder() {
      return { offerId: "of", status: "filled", filledQty: 0, avgPrice: 0 };
    },
    async cancelOrder() {
      // no-op
    },
    async getOpenOrders() {
      return [];
    },
  };
  const perp: PerpBackend = {
    async openPosition() {
      return { positionId: "p", entryPrice: 0, liquidationPrice: 0 };
    },
    async closePosition() {
      return { realizedPnl: 0 };
    },
  };
  const competitions: CompetitionBackend = {
    async list() {
      return [];
    },
    async get() {
      return null;
    },
    async join() {
      return { txJson: {} };
    },
    async getLeaderboard() {
      return [];
    },
  };
  return {
    agent: { ...baseAgent, ...(opts.agent ?? {}) },
    userId: "u42",
    mandate: { ...baseMandate },
    priceFeed,
    paper,
    trading,
    perp,
    competitions,
    actions: opts.actions ?? makeActions(),
    config: opts.config ?? defaultPublicConfig,
  };
}

describe("get_config", () => {
  it("returns ctx.config verbatim (mode paper, sourceTag null, 9 pairs)", async () => {
    const ctx = makeCtx({});
    const r = (await getConfigTool.handler({}, ctx)) as PublicConfig;

    expect(r.mode).toBe("paper");
    expect(r.sourceTag).toBeNull();
    expect(r.availablePairs).toHaveLength(9);
  });

  it("returns a live-configured runtime when the server is wired for on-chain", async () => {
    const liveConfig: PublicConfig = {
      mode: "live",
      sourceTag: 12345,
      availablePairs: ["XRP", "RLUSD"],
    };
    const ctx = makeCtx({ config: liveConfig });
    const r = (await getConfigTool.handler({}, ctx)) as PublicConfig;

    expect(r.mode).toBe("live");
    expect(r.sourceTag).toBe(12345);
    expect(r.availablePairs).toEqual(["XRP", "RLUSD"]);
  });
});

describe("get_agent_status", () => {
  it("returns the agent's status + live flag, last action null when there is none", async () => {
    const actions = makeActions();
    const ctx = makeCtx({ actions });

    const r = (await getAgentStatusTool.handler({}, ctx)) as {
      agentId: string;
      status: string;
      hasLiveAccount: boolean;
      lastAction: AgentAction | null;
    };

    expect(r.agentId).toBe("a42");
    expect(r.status).toBe("active");
    expect(r.hasLiveAccount).toBe(false);
    expect(r.lastAction).toBeNull();
    // Appel borné à 1 (la "latest")
    expect(actions.lastActionCalls).toEqual([{ agentId: "a42", limit: 1 }]);
  });

  it("returns the most recent action (limited to 1) when one exists", async () => {
    const last: AgentAction = {
      id: "act-9",
      agentId: "a42",
      userId: "u42",
      toolName: "place_order",
      toolParams: "{}",
      result: '{"orderId":"o1"}',
      error: null,
      idempotencyKey: "k1",
      executedAt: 1700000000000,
    };
    const actions = makeActions({ list: async () => [last] });
    const ctx = makeCtx({ actions });

    const r = (await getAgentStatusTool.handler({}, ctx)) as {
      lastAction: AgentAction;
    };

    expect(r.lastAction).toEqual(last);
    expect(actions.lastActionCalls).toEqual([{ agentId: "a42", limit: 1 }]);
  });

  it("reflects agent.status and hasLiveAccount from the ctx", async () => {
    const actions = makeActions();
    const ctx = makeCtx({
      actions,
      agent: { status: "paused", hasLiveAccount: true },
    });

    const r = (await getAgentStatusTool.handler({}, ctx)) as {
      status: string;
      hasLiveAccount: boolean;
    };

    expect(r.status).toBe("paused");
    expect(r.hasLiveAccount).toBe(true);
  });
});