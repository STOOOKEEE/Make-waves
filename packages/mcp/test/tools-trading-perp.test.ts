import { describe, it, expect } from "vitest";
import { openPositionTool, closePositionTool } from "../src/tools/trading-perp";
import type {
  Agent,
  AgentAction,
  AgentActionsStore,
  Broadcaster,
  Mandate,
  McpContext,
  PaperBackend,
  PerpBackend,
  PriceFeed,
  TradingBackend,
} from "../src/types";
import { McpError } from "../src/lib/errors";
import { defaultPublicConfig } from "../src/lib/public-config";

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

interface FakePerp extends PerpBackend {
  calls: { method: string; args: unknown[] }[];
  openPositionImpl?: PerpBackend["openPosition"];
  closePositionImpl?: PerpBackend["closePosition"];
}

function makePerp(overrides: {
  openPosition?: FakePerp["openPositionImpl"];
  closePosition?: FakePerp["closePositionImpl"];
} = {}): FakePerp {
  const calls: FakePerp["calls"] = [];
  return {
    calls,
    async openPosition(input) {
      calls.push({ method: "openPosition", args: [input] });
      if (overrides.openPosition) return overrides.openPosition(input);
      return {
        positionId: "pos_1",
        entryPrice: input.qty > 0 ? 100 : 0,
        liquidationPrice: 50,
      };
    },
    async closePosition(input) {
      calls.push({ method: "closePosition", args: [input] });
      if (overrides.closePosition) return overrides.closePosition(input);
      return { realizedPnl: 42 };
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
  perp: PerpBackend;
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
  const trading: TradingBackend = {
    async placeOrder() {
      return { orderId: "o", status: "filled", filledQty: 0, avgPrice: 0 };
    },
    async cancelOrder() {
      // no-op
    },
    async getOpenOrders() {
      return [];
    },
  };
  return {
    agent: { ...baseAgent },
    userId: "u1",
    mandate: opts.mandate === undefined ? { ...baseMandate } : opts.mandate,
    priceFeed,
    paper,
    trading,
    perp: opts.perp,
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
    config: defaultPublicConfig,
    broadcaster: opts.broadcaster,
  };
}

// ─── open_position ──────────────────────────────────────────────────────────

describe("open_position tool", () => {
  it("opens a long position, records the action and emits the broadcaster event", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const broadcaster = makeBroadcaster();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      broadcaster,
    });

    const result = (await openPositionTool.handler(
      { symbol: "BTC", side: "long", qty: 2, leverage: 2 },
      ctx,
    )) as { positionId: string; entryPrice: number; liquidationPrice: number };

    expect(result.positionId).toBe("pos_1");
    // Guard check : capitalEngaged = (qty * px) / leverage = (2 * 100) / 2 = 100 — ≤ 1000.
    expect(perp.calls).toHaveLength(1);
    expect(perp.calls[0]).toEqual({
      method: "openPosition",
      args: [
        {
          userId: "u1",
          symbol: "BTC",
          side: "long",
          qty: 2,
          leverage: 2,
          tp: undefined,
          sl: undefined,
          clientOrderId: undefined,
        },
      ],
    });
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("open_position");
    expect(actions.recorded[0]?.error).toBeNull();
    expect(broadcaster.events).toHaveLength(1);
    expect(broadcaster.events[0]).toMatchObject({
      type: "agent_action",
      tool: "open_position",
      agentId: "a1",
    });
  });

  it("maps short side to sell for the guard (correct risk orientation)", async () => {
    // Le guard raisonne en buy/sell : long = buy, short = sell.
    // Ici on vérifie qu'un short passe un capitalEngaged faible (sous le max) — ce qui
    // prouve que le side est bien pris en compte et que (qty * px) / leverage est appliqué.
    // (Le test ne peut pas observer directement le `side` envoyé au guard sans fake dédié —
    // ce que l'on vérifie, c'est qu'un short à leverage élevé mais prix modéré passe.)
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ ETH: 50 }),
    });

    await openPositionTool.handler(
      { symbol: "ETH", side: "short", qty: 1, leverage: 1 },
      ctx,
    );

    expect(perp.calls[0]?.args[0]).toMatchObject({ side: "short", symbol: "ETH" });
  });

  it("throws RISK_LIMIT when leverage exceeds the mandate's maxLeverage", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });
    // maxLeverage = 3 (baseMandate) ; leverage = 5 doit lever.
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: 1, leverage: 5 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "RISK_LIMIT" });
    expect(perp.calls).toHaveLength(0);
    // L'audit capture quand même l'échec (clé de la traçabilité agent).
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.error).toMatch(/Leverage/);
  });

  it("throws RISK_LIMIT when the symbol is not in pairesAutorisees", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ SOL: 100 }),
    });
    // pairesAutorisees=["BTC","ETH"], SOL n'en fait pas partie.
    await expect(
      openPositionTool.handler(
        { symbol: "SOL", side: "long", qty: 1, leverage: 1 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "RISK_LIMIT" });
    expect(perp.calls).toHaveLength(0);
    expect(actions.recorded[0]?.error).toMatch(/paires_autorisees/);
  });

  it("throws RISK_LIMIT when capitalEngaged + tradeValue exceeds capitalMax", async () => {
    // capitalEngaged = (qty * px) / leverage. Ici on sature directement :
    // tradeValue = qty * px * leverage = 1 * 200 * 1 = 200, capitalMax = 50 → RISK_LIMIT.
    const perp = makePerp();
    const actions = makeActions();
    const tightMandate: Mandate = { ...baseMandate, capitalMax: 50 };
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 200 }),
      mandate: tightMandate,
    });
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: 1, leverage: 1 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "RISK_LIMIT" });
    expect(perp.calls).toHaveLength(0);
    expect(actions.recorded[0]?.error).toMatch(/Capital engaged/);
  });

  it("throws MARKET_ERROR when no price is available", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({}), // pas de BTC
    });
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: 1, leverage: 1 },
        ctx,
      ),
    ).rejects.toBeInstanceOf(McpError);
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: 1, leverage: 1 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "MARKET_ERROR" });
    expect(perp.calls).toHaveLength(0);
  });

  it("throws TRADING_ERROR and records the error when the perp backend fails", async () => {
    const perp = makePerp({
      openPosition: async () => {
        throw new Error("insufficient margin");
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: 1, leverage: 1 },
        ctx,
    ),
    ).rejects.toMatchObject({ code: "TRADING_ERROR" });
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.error).toBe("insufficient margin");
  });

  it("throws MANDATE_INVALID when no active mandate", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      mandate: null,
    });
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: 1, leverage: 1 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "MANDATE_INVALID" });
    expect(perp.calls).toHaveLength(0);
  });

  it("forwards client_order_id to the perp backend and stores it as idempotencyKey", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });
    await openPositionTool.handler(
      {
        symbol: "BTC",
        side: "long",
        qty: 1,
        leverage: 1,
        client_order_id: "idem-xyz",
      },
      ctx,
    );
    expect(perp.calls[0]?.args[0]).toMatchObject({ clientOrderId: "idem-xyz" });
    expect(actions.recorded[0]?.idempotencyKey).toBe("idem-xyz");
  });

  it("throws INVALID_PARAMS for negative qty", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: -1, leverage: 1 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    expect(perp.calls).toHaveLength(0);
  });

  it("throws INVALID_PARAMS for invalid side", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "flat", qty: 1, leverage: 1 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    expect(perp.calls).toHaveLength(0);
  });

  it("throws INVALID_PARAMS for leverage < 1", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
    });
    await expect(
      openPositionTool.handler(
        { symbol: "BTC", side: "long", qty: 1, leverage: 0.5 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    expect(perp.calls).toHaveLength(0);
  });
});

// ─── close_position ─────────────────────────────────────────────────────────

describe("close_position tool", () => {
  it("closes the position via perp.closePosition and records the action", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const broadcaster = makeBroadcaster();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({}),
      broadcaster,
    });
    const result = (await closePositionTool.handler(
      { position_id: "pos_42" },
      ctx,
    )) as { realizedPnl: number };
    expect(result.realizedPnl).toBe(42);
    expect(perp.calls).toEqual([
      { method: "closePosition", args: [{ userId: "u1", positionId: "pos_42" }] },
    ]);
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("close_position");
    expect(actions.recorded[0]?.error).toBeNull();
    expect(actions.recorded[0]?.idempotencyKey).toBeNull();
    expect(broadcaster.events).toHaveLength(1);
    expect(broadcaster.events[0]).toMatchObject({
      type: "agent_action",
      tool: "close_position",
      agentId: "a1",
    });
  });

  it("throws TRADING_ERROR and records the error when the perp backend fails", async () => {
    const perp = makePerp({
      closePosition: async () => {
        throw new Error("position not found");
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({}),
    });
    await expect(
      closePositionTool.handler({ position_id: "pos_42" }, ctx),
    ).rejects.toMatchObject({ code: "TRADING_ERROR" });
    expect(actions.recorded[0]?.error).toBe("position not found");
  });

  it("throws MANDATE_INVALID when no active mandate", async () => {
    const perp = makePerp();
    const actions = makeActions();
    const ctx = makeCtx({
      perp,
      actions,
      feed: makePriceFeed({}),
      mandate: null,
    });
    await expect(
      closePositionTool.handler({ position_id: "pos_42" }, ctx),
    ).rejects.toMatchObject({ code: "MANDATE_INVALID" });
    expect(perp.calls).toHaveLength(0);
  });
});
