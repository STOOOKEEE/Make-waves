import { describe, it, expect } from "vitest";
import {
  listCompetitionsTool,
  getCompetitionTool,
  joinCompetitionTool,
  getCompetitionLeaderboardTool,
} from "../src/tools/competitions";
import type {
  Agent,
  AgentAction,
  AgentActionsStore,
  CompetitionBackend,
  Mandate,
  McpContext,
  PaperBackend,
  PriceFeed,
  TradingBackend,
  PerpBackend,
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

interface FakeCompetitions extends CompetitionBackend {
  calls: { method: string; args: unknown[] }[];
  listImpl?: CompetitionBackend["list"];
  getImpl?: CompetitionBackend["get"];
  joinImpl?: CompetitionBackend["join"];
  getLeaderboardImpl?: CompetitionBackend["getLeaderboard"];
}

function makeCompetitions(
  overrides: {
    list?: FakeCompetitions["listImpl"];
    get?: FakeCompetitions["getImpl"];
    join?: FakeCompetitions["joinImpl"];
    getLeaderboard?: FakeCompetitions["getLeaderboardImpl"];
  } = {},
): FakeCompetitions {
  const calls: FakeCompetitions["calls"] = [];
  return {
    calls,
    async list() {
      calls.push({ method: "list", args: [] });
      if (overrides.list) return overrides.list();
      return [{ id: "season-01", status: "open" }];
    },
    async get(id) {
      calls.push({ method: "get", args: [id] });
      if (overrides.get) return overrides.get(id);
      return { id, status: "open" };
    },
    async join(userId, competitionId) {
      calls.push({ method: "join", args: [userId, competitionId] });
      if (overrides.join) return overrides.join(userId, competitionId);
      return { txJson: { TransactionType: "Payment", Destination: "rPrize" } };
    },
    async getLeaderboard(competitionId, limit) {
      calls.push({ method: "getLeaderboard", args: [competitionId, limit] });
      if (overrides.getLeaderboard)
        return overrides.getLeaderboard(competitionId, limit);
      return Array.from({ length: limit }, (_, i) => ({
        rank: i + 1,
        userId: `u${i + 1}`,
        equity: 1000 - i * 10,
      }));
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

function makeCtx(opts: {
  competitions: CompetitionBackend;
  actions: AgentActionsStore;
  mandate?: Mandate | null;
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
  return {
    agent: { ...baseAgent },
    userId: "u1",
    mandate: opts.mandate === undefined ? { ...baseMandate } : opts.mandate,
    priceFeed,
    paper,
    trading,
    perp,
    competitions: opts.competitions,
    actions: opts.actions,
  };
}

// ─── list_competitions ──────────────────────────────────────────────────────

describe("list_competitions", () => {
  it("returns the full list and audits the call (mandate present)", async () => {
    const competitions = makeCompetitions({
      list: async () => [
        { id: "season-01", status: "open", participants: 4 },
        { id: "season-02", status: "running", participants: 12 },
      ],
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    const r = (await listCompetitionsTool.handler({}, ctx)) as {
      competitions: readonly unknown[];
    };

    expect(r.competitions).toHaveLength(2);
    expect(competitions.calls).toEqual([{ method: "list", args: [] }]);
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("list_competitions");
    expect(actions.recorded[0]?.error).toBeNull();
  });

  it("returns an empty list without auditing when no mandate is present", async () => {
    const competitions = makeCompetitions({ list: async () => [] });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions, mandate: null });

    const r = (await listCompetitionsTool.handler({}, ctx)) as {
      competitions: readonly unknown[];
    };

    expect(r.competitions).toEqual([]);
    expect(competitions.calls).toEqual([{ method: "list", args: [] }]);
    // Audit best-effort : sans mandate, pas d'audit.
    expect(actions.recorded).toHaveLength(0);
  });
});

// ─── get_competition ────────────────────────────────────────────────────────

describe("get_competition", () => {
  it("forwards the id and returns the competition", async () => {
    const competitions = makeCompetitions({
      get: async (id) => ({ id, status: "open", buyIn: 10 }),
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    const r = (await getCompetitionTool.handler({ id: "season-01" }, ctx)) as {
      competition: { id: string; status: string; buyIn: number } | null;
    };

    expect(r.competition).toEqual({ id: "season-01", status: "open", buyIn: 10 });
    expect(competitions.calls).toEqual([
      { method: "get", args: ["season-01"] },
    ]);
  });

  it("returns competition: null when the backend reports the id is unknown", async () => {
    const competitions = makeCompetitions({
      get: async () => null,
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    const r = (await getCompetitionTool.handler({ id: "nope" }, ctx)) as {
      competition: unknown;
    };

    expect(r.competition).toBeNull();
    expect(competitions.calls).toEqual([{ method: "get", args: ["nope"] }]);
  });

  it("rejects an empty id with INVALID_PARAMS (without calling the backend)", async () => {
    const competitions = makeCompetitions();
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    await expect(
      getCompetitionTool.handler({ id: "" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    expect(competitions.calls).toHaveLength(0);
    expect(actions.recorded).toHaveLength(0);
  });
});

// ─── join_competition ───────────────────────────────────────────────────────

describe("join_competition", () => {
  it("returns the unsigned Payment txJson for the buy-in and audits", async () => {
    const txJson = {
      TransactionType: "Payment",
      Account: "rUser",
      Destination: "rPrizePool",
      Amount: { currency: "XRP", value: "10" },
      SourceTag: 12345,
      Memos: [{ Memo: { MemoData: "746964652F6A6F696E" } }],
    };
    const competitions = makeCompetitions({
      join: async (userId, competitionId) => ({ txJson: { ...txJson, _user: userId, _comp: competitionId } }),
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    const r = (await joinCompetitionTool.handler(
      { competition_id: "season-01" },
      ctx,
    )) as { txJson: Record<string, unknown> };

    // Le txJson est bien le Payment de buy-in, non signé.
    expect(r.txJson.TransactionType).toBe("Payment");
    expect(r.txJson.Destination).toBe("rPrizePool");
    expect(r.txJson).toMatchObject({ _user: "u1", _comp: "season-01" });
    expect(competitions.calls).toEqual([
      { method: "join", args: ["u1", "season-01"] },
    ]);
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("join_competition");
    expect(actions.recorded[0]?.error).toBeNull();
  });

  it("throws MANDATE_INVALID when no active mandate", async () => {
    const competitions = makeCompetitions();
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions, mandate: null });

    await expect(
      joinCompetitionTool.handler({ competition_id: "season-01" }, ctx),
    ).rejects.toBeInstanceOf(McpError);
    await expect(
      joinCompetitionTool.handler({ competition_id: "season-01" }, ctx),
    ).rejects.toMatchObject({ code: "MANDATE_INVALID" });
    // Le backend n'est pas contacté.
    expect(competitions.calls).toHaveLength(0);
  });

  it("wraps a backend failure into TRADING_ERROR and records the error", async () => {
    const competitions = makeCompetitions({
      join: async () => {
        throw new Error("pool closed");
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    await expect(
      joinCompetitionTool.handler({ competition_id: "season-01" }, ctx),
    ).rejects.toMatchObject({ code: "TRADING_ERROR" });
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.error).toBe("pool closed");
  });

  it("rejects an empty competition_id with INVALID_PARAMS", async () => {
    const competitions = makeCompetitions();
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    await expect(
      joinCompetitionTool.handler({ competition_id: "" }, ctx),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    expect(competitions.calls).toHaveLength(0);
  });
});

// ─── get_competition_leaderboard ────────────────────────────────────────────

describe("get_competition_leaderboard", () => {
  it("forwards the competitionId + clamped limit to the backend", async () => {
    const competitions = makeCompetitions({
      getLeaderboard: async (competitionId, limit) => {
        expect(competitionId).toBe("season-01");
        expect(limit).toBe(5);
        return [
          { rank: 1, userId: "u1", equity: 1200 },
          { rank: 2, userId: "u2", equity: 1100 },
        ];
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    const r = (await getCompetitionLeaderboardTool.handler(
      { competition_id: "season-01", limit: 5 },
      ctx,
    )) as { entries: readonly unknown[] };

    expect(r.entries).toHaveLength(2);
    expect(competitions.calls).toEqual([
      { method: "getLeaderboard", args: ["season-01", 5] },
    ]);
    expect(actions.recorded).toHaveLength(1);
    expect(actions.recorded[0]?.toolName).toBe("get_competition_leaderboard");
  });

  it("defaults limit to 20 when omitted", async () => {
    const competitions = makeCompetitions({
      getLeaderboard: async (_competitionId, limit) => {
        expect(limit).toBe(20);
        return [];
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    const r = (await getCompetitionLeaderboardTool.handler(
      { competition_id: "season-01" },
      ctx,
    )) as { entries: readonly unknown[] };

    expect(r.entries).toEqual([]);
    expect(competitions.calls[0]).toEqual({
      method: "getLeaderboard",
      args: ["season-01", 20],
    });
  });

  it("clamps the limit to [1, 100] and replaces a bad-string value with the default 20", async () => {
    // Le contrat PaperBackend exige un entier fini borné :
    //  - 200 (hors plage haute) → 100 (max),
    //  - "foo" (NaN)         → 20 (fallback),
    //  - 0 (sous la borne)    → 1 (min).
    // Aucune valeur invalide n'est propagée au backend (sinon NaN casse
    // silencieusement en aval).
    const seen: number[] = [];
    const competitions = makeCompetitions({
      getLeaderboard: async (_competitionId, limit) => {
        seen.push(limit);
        return Array.from({ length: limit });
      },
    });
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    await getCompetitionLeaderboardTool.handler(
      { competition_id: "season-01", limit: 200 },
      ctx,
    );
    await getCompetitionLeaderboardTool.handler(
      { competition_id: "season-01", limit: "foo" },
      ctx,
    );
    await getCompetitionLeaderboardTool.handler(
      { competition_id: "season-01", limit: 0 },
      ctx,
    );

    expect(seen).toEqual([100, 20, 1]);
  });

  it("rejects an empty competition_id with INVALID_PARAMS", async () => {
    const competitions = makeCompetitions();
    const actions = makeActions();
    const ctx = makeCtx({ competitions, actions });

    await expect(
      getCompetitionLeaderboardTool.handler(
        { competition_id: "" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
    expect(competitions.calls).toHaveLength(0);
  });
});
