import { describe, it, expect } from "vitest";
import { placeOrderTool, cancelOrderTool } from "../src/tools/trading-spot";
import type {
  Agent,
  AgentAction,
  AgentActionsStore,
  Broadcaster,
  Mandate,
  McpContext,
  PaperBackend,
  PriceFeed,
  TradingBackend,
} from "../src/types";
import { McpError } from "../src/lib/errors";

const baseAgent: Agent = {
  id: "a1",
  userId: "u1",
  name: "x",
  type: "external",
  status: "active",
  hasLiveAccount: false,
  createdAt: 0,
  updatedAt: 0,
};

const baseMandate: Mandate = {
  id: "m1",
  agentId: "a1",
  userId: "u1",
  capitalMax: 1000,
  perteMaxJour: 100,
  maxTradesPerDay: 10,
  maxLeverage: 3,
  pairesAutorisees: ["BTC", "ETH"],
  style: null,
  validUntil: Date.now() + 60_000,
  signedAt: Date.now(),
  signature: "x",
  status: "active",
};

// ─── Fakes ──────────────────────────────────────────────────────────────────

interface FakeTrading extends TradingBackend {
  calls: { method: string; args: unknown[] }[];
  placeOrderImpl?: TradingBackend["placeOrder"];
  cancelOrderImpl?: TradingBackend["cancelOrder"];
}

function makeTrading(overrides: {
  placeOrder?: FakeTrading["placeOrderImpl"];
  cancelOrder?: FakeTrading["cancelOrderImpl"];
} = {}): FakeTrading {
  const calls: FakeTrading["calls"] = [];
  return {
    calls,
    async placeOrder(input) {
      calls.push({ method: "placeOrder", args: [input] });
      if (overrides.placeOrder) return overrides.placeOrder(input);
      return {
        orderId: "ord_1",
        status: "filled",
        filledQty: input.qty,
        avgPrice: input.price ?? 100,
      };
    },
    async cancelOrder(userId, orderId) {
      calls.push({ method: "cancelOrder", args: [userId, orderId] });
      if (overrides.cancelOrder) return overrides.cancelOrder(userId, orderId);
    },
    async getOpenOrders(userId) {
      calls.push({ method: "getOpenOrders", args: [userId] });
      return [];
    },
  };
}

interface FakeActions extends AgentActionsStore {
  recorded: AgentAction[];
  countTodayImpl?: AgentActionsStore["countToday"];
}

function makeActions(overrides: { countToday?: FakeActions["countTodayImpl"] } = {}): FakeActions {
  const recorded: AgentAction[] = [];
  return {
    recorded,
    async record(action) {
      recorded.push(action);
    },
    async findByIdempotencyKey() {
      return null;
    },
    async listByAgent() {
      return [];
    },
    async countToday(agentId, userId) {
      if (overrides.countToday) return overrides.countToday(agentId, userId);
      return 0;
    },
  };
}

interface FakeFeed {
  priceOf: PriceFeed["priceOf"];
  priceFor: Record<string, number>;
}

function makePriceFeed(priceFor: Record<string, number>): FakeFeed {
  return {
    priceFor,
    priceOf: async (symbol) => {
      const usd = priceFor[symbol];
      return usd === undefined ? null : { usd };
    },
  };
}

interface FakeBroadcaster extends Broadcaster {
  events: { type: string; [k: string]: unknown }[];
}

function makeBroadcaster(): FakeBroadcaster {
  const events: FakeBroadcaster["events"] = [];
  return {
    events,
    emit(event) {
      events.push(event);
    },
  };
}

function makeCtx(opts: {
  trading: TradingBackend;
  actions: AgentActionsStore;
  feed: FakeFeed;
  broadcaster?: Broadcaster;
  mandate?: Mandate | null;
}): McpContext {
  const priceFeed: PriceFeed = {
    priceOf: opts.feed.priceOf,
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
  return {
    agent: { ...baseAgent },
    userId: "u1",
    mandate: opts.mandate === undefined ? { ...baseMandate } : opts.mandate,
    priceFeed,
    paper,
    trading: opts.trading,
    perp: {
      async openPosition() {
        return { positionId: "p", entryPrice: 0, liquidationPrice: 0 };
      },
      async closePosition() {
        return { realizedPnl: 0 };
      },
    },
    competitions: {
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
    },
    actions: opts.actions,
    broadcaster: opts.broadcaster,
  };
}

// ─── place_order ────────────────────────────────────────────────────────────

describe("place_order tool", () => {
  it("places a market order, records the action and emits the broadcaster event", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const broadcaster = makeBroadcaster();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      broadcaster,
    });

    const result = (await placeOrderTool.handler(
      { symbol: "BTC", side: "buy", qty: 1, type: "market" },
      ctx,
    )) as { orderId: string; status: string; filledQty: number; avgPrice: number };

    expect(result.orderId).toBe("ord_1");
    expect(result.filledQty).toBe(1);
    expect(result.avgPrice).toBe(100);
    expect(trading.calls).toHaveLength(1);
    expect(trading.calls[0]).toEqual({
      method: "placeOrder",
      args: [
        {
          userId: "u1",
          symbol: "BTC",
          side: "buy",
          qty: 1,
          type: "market",
          price: undefined,
          clientOrderId: undefined,
        },
      ],
    });
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("place_order");
    expect(actions.recorded[0]?.error).toBeNull();
    expect(actions.recorded[0]?.result).toContain("ord_1");
    expect(broadcaster.events).toHaveLength(1);
    expect(broadcaster.events[0]).toMatchObject({
      type: "agent_action",
      tool: "place_order",
      agentId: "a1",
    });
  });

  it("forwards client_order_id to the trading backend and stores it as idempotencyKey", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });

    await placeOrderTool.handler(
      {
        symbol: "BTC",
        side: "buy",
        qty: 1,
        type: "market",
        client_order_id: "idem-abc",
      },
      ctx,
    );

    expect(trading.calls[0]?.args[0]).toMatchObject({ clientOrderId: "idem-abc" });
    expect(actions.recorded[0]?.idempotencyKey).toBe("idem-abc");
  });

  it("uses the explicit limit price (does not call the feed)", async () => {
    let priceOfCalls = 0;
    const feed: FakeFeed = {
      priceFor: {},
      priceOf: async () => {
        priceOfCalls++;
        return null;
      },
    };
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({ trading, actions, feed });

    await placeOrderTool.handler(
      { symbol: "BTC", side: "buy", qty: 1, type: "limit", price: 250 },
      ctx,
    );

    expect(priceOfCalls).toBe(0); // explicit price wins, feed not consulted
    expect(trading.calls[0]?.args[0]).toMatchObject({ price: 250 });
  });

  it("throws MARKET_ERROR when no price is available and none was given", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({}), // no BTC
    });

    await expect(
      placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: 1, type: "market" },
        ctx,
      ),
    ).rejects.toBeInstanceOf(McpError);
    await expect(
      placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: 1, type: "market" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "MARKET_ERROR" });
  });

  it("throws RISK_LIMIT and records the error when capital is exceeded", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const tightMandate: Mandate = { ...baseMandate, capitalMax: 50 };
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 200 }),
      mandate: tightMandate,
    });

    // qty=1, price=200 → tradeValue=200 > capitalMax=50
    await expect(
      placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: 1, type: "market" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "RISK_LIMIT" });

    // Le guard a refusé AVANT l'appel trading — aucune place_order émise.
    expect(trading.calls).toHaveLength(0);
    // MAIS l'audit a quand même enregistré l'échec (clé de la traçabilité agent).
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.error).toMatch(/Capital engaged/);
    // Le code McpError (RISK_LIMIT) est propagé séparément via l'exception —
    // recordAction ne stocke que le message utilisateur (cf. AgentAction.error).
  });

  it("throws RISK_LIMIT when the symbol is not in pairesAutorisees", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ SOL: 100 }),
    });

    // pairesAutorisees=["BTC","ETH"], SOL pas dedans
    await expect(
      placeOrderTool.handler(
        { symbol: "SOL", side: "buy", qty: 1, type: "market" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "RISK_LIMIT" });
    expect(trading.calls).toHaveLength(0);
    expect(actions.recorded[0]?.error).toMatch(/paires_autorisees/);
  });

  it("throws TRADING_ERROR and records the error when the trading backend fails", async () => {
    const trading = makeTrading({
      placeOrder: async () => {
        throw new Error("insufficient funds");
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });

    await expect(
      placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: 1, type: "market" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "TRADING_ERROR" });
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.error).toBe("insufficient funds");
  });

  it("throws MANDATE_INVALID when no active mandate", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      mandate: null,
    });

    await expect(
      placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: 1, type: "market" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "MANDATE_INVALID" });
    expect(trading.calls).toHaveLength(0);
  });

  it("throws INVALID_PARAMS for a negative qty", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });

    await expect(
      placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: -1, type: "market" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    expect(trading.calls).toHaveLength(0);
  });
});

// ─── cancel_order ────────────────────────────────────────────────────────────

describe("cancel_order tool", () => {
  it("cancels the order via trading.cancelOrder and records the action", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({ trading, actions, feed: makePriceFeed({}) });

    const result = (await cancelOrderTool.handler(
      { order_id: "ord_42" },
      ctx,
    )) as { cancelled: boolean; orderId: string };

    expect(result).toEqual({ cancelled: true, orderId: "ord_42" });
    expect(trading.calls).toEqual([
      { method: "cancelOrder", args: ["u1", "ord_42"] },
    ]);
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("cancel_order");
    expect(actions.recorded[0]?.error).toBeNull();
  });

  it("throws TRADING_ERROR and records the error when cancelOrder fails", async () => {
    const trading = makeTrading({
      cancelOrder: async () => {
        throw new Error("order not found");
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({ trading, actions, feed: makePriceFeed({}) });

    await expect(
      cancelOrderTool.handler({ order_id: "ord_42" }, ctx),
    ).rejects.toMatchObject({ code: "TRADING_ERROR" });
    expect(actions.recorded[0]?.error).toBe("order not found");
  });

  it("throws MANDATE_INVALID when no active mandate", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({}),
      mandate: null,
    });

    await expect(
      cancelOrderTool.handler({ order_id: "ord_42" }, ctx),
    ).rejects.toMatchObject({ code: "MANDATE_INVALID" });
    expect(trading.calls).toHaveLength(0);
  });
});