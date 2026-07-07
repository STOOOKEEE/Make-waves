// Tests du path Live de `place_order` (Tâche 22).
// Vérifie que `place_order` route vers `ctx.trading.placeLiveOrder` (pas
// `placeOrder`) quand `ctx.config.mode === "live"`, et que le seed déchiffré
// est passé tel quel au backend.
import { describe, it, expect } from "vitest";
import { placeOrderTool } from "../src/tools/trading-spot";
import type {
  Agent,
  AgentAction,
  AgentActionsStore,
  Broadcaster,
  LiveCryptoService,
  Mandate,
  McpContext,
  PaperBackend,
  PerpBackend,
  PriceFeed,
  PublicConfig,
  TradingBackend,
} from "../src/types";
import { McpError } from "../src/lib/errors";

const baseAgent: Agent = {
  id: "a1",
  userId: "u1",
  name: "x",
  type: "external",
  status: "active",
  hasLiveAccount: true,
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
}

function makeTrading(): FakeTrading {
  const calls: FakeTrading["calls"] = [];
  return {
    calls,
    async placeOrder() {
      calls.push({ method: "placeOrder", args: [{ should: "not be called in live mode" }] });
      throw new Error("placeOrder should not be called when mode === 'live'");
    },
    async placeLiveOrder(input) {
      calls.push({ method: "placeLiveOrder", args: [input] });
      return {
        offerId: "of_42",
        status: "filled",
        filledQty: input.qty,
        avgPrice: 100,
      };
    },
    async cancelOrder() {
      // no-op
    },
    async getOpenOrders() {
      return [];
    },
  };
}

interface FakeActions extends AgentActionsStore {
  recorded: AgentAction[];
}

function makeActions(): FakeActions {
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
    async countToday() {
      return 0;
    },
  };
}

interface FakeFeed {
  priceOf: PriceFeed["priceOf"];
}

function makePriceFeed(priceFor: Record<string, number>): FakeFeed {
  return {
    priceOf: async (symbol) => {
      const usd = priceFor[symbol];
      return usd === undefined ? null : { usd };
    },
  };
}

function makeLiveCrypto(): LiveCryptoService & {
  decryptCalls: { agentId: string }[];
} {
  const decryptCalls: { agentId: string }[] = [];
  return {
    decryptCalls,
    async decryptAgentSeed(agentId: string) {
      decryptCalls.push({ agentId });
      return {
        seed: "sEdTM1uX8pu2do5BNfE7XXXXXXXXXXXXX",
        address: "rAGENTADDRESSXXXXXXXXXXXXXXXXXXXXX",
      };
    },
  };
}

function makeCtx(opts: {
  trading: TradingBackend;
  actions: AgentActionsStore;
  feed: FakeFeed;
  config: PublicConfig;
  liveCrypto?: LiveCryptoService;
  broadcaster?: Broadcaster;
  mandate?: Mandate;
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
  const perp: PerpBackend = {
    async openPosition() {
      return { positionId: "p", entryPrice: 0, liquidationPrice: 0 };
    },
    async closePosition() {
      return { realizedPnl: 0 };
    },
  };
  return {
    agent: { ...baseAgent },
    userId: "u1",
    mandate: opts.mandate ?? { ...baseMandate },
    priceFeed,
    paper,
    trading: opts.trading,
    perp,
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
    config: opts.config,
    broadcaster: opts.broadcaster,
    liveCrypto: opts.liveCrypto,
  };
}

const liveConfig: PublicConfig = {
  mode: "live",
  sourceTag: 12345,
  availablePairs: ["BTC", "ETH"],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("place_order tool — Live mode (T22)", () => {
  it("routes to ctx.trading.placeLiveOrder when mode='live', passing decrypted seed + address", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const liveCrypto = makeLiveCrypto();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      config: liveConfig,
      liveCrypto,
    });

    const result = (await placeOrderTool.handler(
      { symbol: "BTC", side: "buy", qty: 1, type: "market" },
      ctx,
    )) as { offerId: string; status: string; filledQty: number; avgPrice: number };

    expect(result.offerId).toBe("of_42");
    expect(result.status).toBe("filled");
    expect(result.filledQty).toBe(1);
    expect(result.avgPrice).toBe(100);

    // placeLiveOrder appelé avec seed + address déchiffrés du LiveCryptoService.
    expect(trading.calls).toHaveLength(1);
    expect(trading.calls[0]?.method).toBe("placeLiveOrder");
    expect(trading.calls[0]?.args[0]).toMatchObject({
      userId: "u1",
      symbol: "BTC",
      side: "buy",
      qty: 1,
      type: "market",
      agentSeed: "sEdTM1uX8pu2do5BNfE7XXXXXXXXXXXXX",
      agentAddress: "rAGENTADDRESSXXXXXXXXXXXXXXXXXXXXX",
    });
    expect(liveCrypto.decryptCalls).toEqual([{ agentId: "a1" }]);
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("place_order");
    expect(actions.recorded[0]?.error).toBeNull();
  });

  it("never calls placeOrder when in Live mode (Paper backend untouched)", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ ETH: 50 }),
      config: liveConfig,
      liveCrypto: makeLiveCrypto(),
    });

    await placeOrderTool.handler(
      { symbol: "ETH", side: "sell", qty: 2, type: "market" },
      ctx,
    );

    // Seul placeLiveOrder est appelé — placeOrder doit être absent.
    expect(trading.calls.map((c) => c.method)).toEqual(["placeLiveOrder"]);
  });

  it("forwards client_order_id as idempotencyKey to the Live backend", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      config: liveConfig,
      liveCrypto: makeLiveCrypto(),
    });

    await placeOrderTool.handler(
      {
        symbol: "BTC",
        side: "buy",
        qty: 1,
        type: "market",
        client_order_id: "idem-live-1",
      },
      ctx,
    );

    expect(trading.calls[0]?.args[0]).toMatchObject({ clientOrderId: "idem-live-1" });
    expect(actions.recorded[0]?.idempotencyKey).toBe("idem-live-1");
  });

  it("throws TRADING_ERROR when liveCrypto is undefined (Live mode not wired)", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      config: liveConfig,
      // liveCrypto omis volontairement — runtime pas câblé.
    });

    let caught: unknown = null;
    try {
      await placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: 1, type: "market" },
        ctx,
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(McpError);
    expect(caught).toMatchObject({ code: "TRADING_ERROR" });
    expect(trading.calls).toHaveLength(0);
    // L'audit capture l'échec (RISK_LIMIT/MARKET_ERROR n'ont pas frappé,
    // c'est un TRADING_ERROR — le catch du handler le trace quand même).
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.error).toMatch(/LiveCryptoService not wired/);
  });

  it("still applies the risk guard in Live mode (RISK_LIMIT before signing)", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const liveCrypto = makeLiveCrypto();
    const tightMandate: Mandate = { ...baseMandate, capitalMax: 50 };
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 200 }),
      config: liveConfig,
      liveCrypto,
      mandate: tightMandate,
    });

    // qty=1, price=200 → tradeValue=200 > capitalMax=50 — guard refuse.
    await expect(
      placeOrderTool.handler(
        { symbol: "BTC", side: "buy", qty: 1, type: "market" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "RISK_LIMIT" });

    // Aucune signature Live émise (le guard stoppe avant le seed decrypt).
    expect(trading.calls).toHaveLength(0);
    expect(liveCrypto.decryptCalls).toEqual([]);
    expect(actions.recorded[0]?.error).toMatch(/Capital engaged/);
  });

  it("emits the agent_action broadcaster event on successful Live fill", async () => {
    const trading = makeTrading();
    const actions = makeActions();
    const broadcaster: Broadcaster & { events: { type: string; [k: string]: unknown }[] } = {
      events: [],
      emit(event) {
        this.events.push(event);
      },
    };
    const ctx = makeCtx({
      trading,
      actions,
      feed: makePriceFeed({ BTC: 100 }),
      config: liveConfig,
      liveCrypto: makeLiveCrypto(),
      broadcaster,
    });

    await placeOrderTool.handler(
      { symbol: "BTC", side: "buy", qty: 1, type: "market" },
      ctx,
    );

    expect(broadcaster.events).toHaveLength(1);
    expect(broadcaster.events[0]).toMatchObject({
      type: "agent_action",
      tool: "place_order",
      agentId: "a1",
    });
  });
});