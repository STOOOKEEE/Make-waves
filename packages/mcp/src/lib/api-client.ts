// Client HTTP vers l'API Tide (apps/api). Toutes les méthodes du serveur MCP
// (market, portfolio, trading, etc.) consomment ce client. Aucun import depuis
// apps/api — `@tide/mcp` reste un package feuille ; le serveur MCP peut donc
// être lancé comme process séparé (par Claude Desktop, etc.).
//
// Le client thread `X-Tide-User-Id` + `X-Tide-Agent-Id` headers pour l'identité
// de l'appelant (cross-user isolation — l'application de cette isolation côté
// apps/api est tracée dans final-review.md comme dette post-merge).

import { randomUUID } from "node:crypto";
import type {
  AgentAction,
  AgentActionsStore,
  CompetitionBackend,
  PaperBackend,
  PerpBackend,
  PriceFeed,
  TradingBackend,
} from "../types";
import type { AgentDto } from "@tide/client";
import { QUOTE_CURRENCY } from "@tide/core";
import type { Fill } from "@tide/core";

export interface TideApiHttpConfig {
  readonly baseUrl: string;
  readonly userId: string;
  readonly agentId: string;
}

export class TideApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "TideApiHttpError";
  }
}

export class TideApiHttp {
  private readonly baseUrl: string;
  private readonly userId: string;
  private readonly agentId: string;

  constructor(config: TideApiHttpConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.userId = config.userId;
    this.agentId = config.agentId;
  }

  private async request<T>(
    method: string,
    path: string,
    init?: { body?: unknown; query?: Record<string, string | number | undefined> },
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (init?.query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined) qs.set(k, String(v));
      }
      const q = qs.toString();
      if (q.length > 0) url += `?${q}`;
    }
    const res = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-tide-user-id": this.userId,
        "x-tide-agent-id": this.agentId,
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new TideApiHttpError(res.status, body, `HTTP ${res.status} ${method} ${path}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  // ---------- PriceFeed ----------

  /** Prix unitaire + change24h + volume24h pour un symbole (lookup dans /prices). */
  async getMarket(symbol: string): Promise<{
    symbol: string;
    price: number;
    change24h: number | null;
    volume24h: number | null;
    timestamp: number;
  } | null> {
    try {
      return await this.request<{
        symbol: string;
        price: number;
        change24h: number | null;
        volume24h: number | null;
        timestamp: number;
      } | null>("GET", `/prices/${encodeURIComponent(symbol.toUpperCase())}`);
    } catch (err) {
      if (err instanceof TideApiHttpError && err.status === 404) return null;
      throw err;
    }
  }

  /** Top N marchés (CoinGecko markets feed). */
  async getMarkets(limit = 100): Promise<readonly unknown[]> {
    return await this.request<readonly unknown[]>("GET", "/markets", { query: { limit } });
  }

  /** Bougies OHLC (Binance klines). */
  async getHistory(
    symbol: string,
    interval: string,
    limit: number,
  ): Promise<readonly { ts: number; o: number; h: number; l: number; c: number; v: number }[]> {
    return await this.request<readonly { ts: number; o: number; h: number; l: number; c: number; v: number }[]>(
      "GET",
      `/history/${encodeURIComponent(symbol.toUpperCase())}`,
      { query: { interval, limit } },
    );
  }

  /** Carnet d'ordres (depth) pour un symbole. */
  async getOrderbook(
    symbol: string,
  ): Promise<{ bids: [number, number][]; asks: [number, number][] } | null> {
    try {
      return await this.request<{ bids: [number, number][]; asks: [number, number][] } | null>(
        "GET", `/book/${encodeURIComponent(symbol.toUpperCase())}`,
      );
    } catch (err) {
      if (err instanceof TideApiHttpError && err.status === 404) return null;
      throw err;
    }
  }

  // ---------- PaperBackend ----------

  async getBalance(userId: string): Promise<Record<string, number>> {
    return await this.request<Record<string, number>>(
      "GET", `/accounts/${encodeURIComponent(userId)}/balances`,
    );
  }

  async getPortfolio(userId: string): Promise<{
    balances: Record<string, number>;
    equity: number;
    pnl: number;
  }> {
    return await this.request<{ balances: Record<string, number>; equity: number; pnl: number }>(
      "GET", `/accounts/${encodeURIComponent(userId)}/portfolio`,
    );
  }

  async listPositions(userId: string): Promise<unknown[]> {
    return await this.request<unknown[]>(
      "GET", `/accounts/${encodeURIComponent(userId)}/positions`,
    );
  }

  async getLeaderboard(limit = 20): Promise<unknown[]> {
    return await this.request<unknown[]>("GET", "/leaderboard", { query: { limit } });
  }

  // ---------- TradingBackend ----------

  async placeOrder(input: {
    symbol: string;
    side: "buy" | "sell";
    qty: number;
    type: "market" | "limit";
    price?: number;
    clientOrderId?: string;
  }): Promise<{ orderId: string; status: string; filledQty: number; avgPrice: number }> {
    // La route paper (`/accounts/:userId/orders`) attend un `MarketOrderInput` du
    // domaine (`{ pair, side, amount, price }`) et l'exécute au `price` fourni (elle
    // ne consulte pas le feed). On traduit donc le contrat MCP (`symbol`/`qty`) vers
    // ce format et on exige un prix — le tool `place_order` résout le px (feed pour un
    // market, prix explicite pour un limit) et nous le passe. Le `Fill` renvoyé est
    // re-mappé vers le shape attendu côté MCP (pas d'orderId côté paper → on en dérive un).
    if (input.price === undefined) {
      throw new TideApiHttpError(
        0,
        undefined,
        "placeOrder: prix requis (la route paper valorise au prix fourni)",
      );
    }
    const fill = await this.request<Fill>(
      "POST",
      `/accounts/${encodeURIComponent(this.userId)}/orders`,
      {
        body: {
          pair: { base: input.symbol.toUpperCase(), quote: QUOTE_CURRENCY },
          side: input.side,
          amount: input.qty,
          price: input.price,
        },
      },
    );
    return {
      orderId: input.clientOrderId ?? randomUUID(),
      status: "filled",
      filledQty: fill.amount,
      avgPrice: fill.price,
    };
  }

  async placeLiveOrder(input: {
    symbol: string;
    side: "buy" | "sell";
    qty: number;
    type: "market" | "limit";
    price?: number;
    slippageTolerance?: number;
    agentSeed: string;
    agentAddress: string;
    clientOrderId?: string;
  }): Promise<{ offerId: string; status: string; filledQty: number; avgPrice: number }> {
    // TODO : endpoint apps/api pas encore câblé — Live mode = câblage runtime.
    return await this.request<{ offerId: string; status: string; filledQty: number; avgPrice: number }>(
      "POST", "/api/exec/live-offer", { body: input },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cancelOrder(orderId: string): Promise<void> {
    // apps/api ne câble pas explicitement l'annulation d'ordre — fallback no-op
    // (le MCP server traite l'absence comme « ordre déjà exécuté ou expiré »).
    return;
  }

  async getOpenOrders(): Promise<readonly unknown[]> {
    // Filtré côté serveur via X-Tide-User-Id ; pas d'endpoint dédié pour l'instant.
    return [];
  }

  // ---------- PerpBackend ----------

  async openPosition(input: {
    symbol: string;
    side: "long" | "short";
    qty: number;
    leverage: number;
    margin?: number;
    tp?: number;
    sl?: number;
    clientOrderId?: string;
  }): Promise<{ positionId: string; entryPrice: number; liquidationPrice: number }> {
    return await this.request<{ positionId: string; entryPrice: number; liquidationPrice: number }>(
      "POST",
      `/accounts/${encodeURIComponent(this.userId)}/positions`,
      { body: input },
    );
  }

  async closePosition(input: { userId: string; positionId: string }): Promise<{ realizedPnl: number }> {
    return await this.request<{ realizedPnl: number }>(
      "POST",
      `/accounts/${encodeURIComponent(input.userId)}/positions/${encodeURIComponent(input.positionId)}/close`,
    );
  }

  // ---------- CompetitionBackend ----------

  async listCompetitions(): Promise<readonly unknown[]> {
    return await this.request<readonly unknown[]>("GET", "/competitions");
  }

  async getCompetition(id: string): Promise<unknown | null> {
    try {
      return await this.request<unknown>("GET", `/competitions/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof TideApiHttpError && err.status === 404) return null;
      throw err;
    }
  }

  async joinCompetition(competitionId: string): Promise<{ txJson: unknown }> {
    return await this.request<{ txJson: unknown }>(
      "POST",
      `/competitions/${encodeURIComponent(competitionId)}/join`,
      { body: { userId: this.userId } },
    );
  }

  async getCompetitionLeaderboard(
    competitionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _limit: number,
  ): Promise<readonly unknown[]> {
    // _limit : apps/api n'a pas d'endpoint leaderboard dédié, on renvoie la
    // liste des participants ; le MCP server peut classer côté client si besoin.
    // Pas d'endpoint apps/api dédié pour l'instant — on renvoie la liste des
    // participants ; le MCP server calcule le classement côté client si besoin.
    return await this.request<readonly unknown[]>(
      "GET",
      `/competitions/${encodeURIComponent(competitionId)}/participants`,
    );
  }

  // ---------- MandateBackend (HTTP — utilisé par loadContext) ----------

  async listMandates(agentId: string): Promise<readonly unknown[]> {
    return await this.request<readonly unknown[]>("GET", "/api/mandates", { query: { agentId } });
  }

  // ---------- AgentActionsStore ----------

  async recordAction(action: Omit<AgentAction, "id" | "executedAt">): Promise<void> {
    await this.request<void>("POST", "/api/agent-actions", { body: action });
  }

  async findActionByIdempotencyKey(
    userId: string,
    key: string,
  ): Promise<AgentAction | null> {
    try {
      return await this.request<AgentAction | null>(
        "GET",
        "/api/agent-actions/idempotency",
        { query: { userId, key } },
      );
    } catch (err) {
      if (err instanceof TideApiHttpError && err.status === 404) return null;
      throw err;
    }
  }

  async listActionsByAgent(agentId: string, limit = 100): Promise<AgentAction[]> {
    return await this.request<AgentAction[]>(
      "GET", "/api/agent-actions", { query: { agentId, limit } },
    );
  }

  async countToday(agentId: string, userId: string): Promise<number> {
    return await this.request<{ count: number }>(
      "GET",
      "/api/agent-actions/count-today",
      { query: { agentId, userId } },
    ).then((r) => r.count);
  }

  // ---------- Agent (CRUD) ----------

  async listAgents(): Promise<readonly AgentDto[]> {
    return await this.request<readonly AgentDto[]>(
      "GET", "/api/agents", { query: { userId: this.userId } },
    );
  }

  async getAgent(id: string): Promise<AgentDto | null> {
    try {
      return await this.request<AgentDto | null>("GET", `/api/agents/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof TideApiHttpError && err.status === 404) return null;
      throw err;
    }
  }

  async createAgent(input: {
    userId: string;
    name: string;
    type: "external" | "integrated";
  }): Promise<AgentDto> {
    return await this.request<AgentDto>("POST", "/api/agents", { body: input });
  }

  async killAgent(id: string): Promise<AgentDto> {
    return await this.request<AgentDto>("POST", `/api/agents/${encodeURIComponent(id)}/kill`);
  }

  // ---------- Live XRPL account (provision / revoke) ----------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async provisionLiveAccount(agentId: string, _seed?: string): Promise<{ publicKey: string; address: string }> {
    return await this.request<{ publicKey: string; address: string }>(
      "POST", `/api/agents/${encodeURIComponent(agentId)}/live-account`, { body: {} },
    );
  }

  async revokeLiveAccount(agentId: string): Promise<{ revoked: true }> {
    return await this.request<{ revoked: true }>(
      "DELETE", `/api/agents/${encodeURIComponent(agentId)}/live-account`,
    );
  }
}

// ---------- Adapter factories ----------

/** Adaptateur PriceFeed branché sur l'API Tide. */
export function httpPriceFeed(api: TideApiHttp): PriceFeed {
  return {
    priceOf: async (symbol) => {
      const m = await api.getMarket(symbol);
      if (m === null) return null;
      return {
        usd: m.price,
        change24h: m.change24h ?? undefined,
        volume24h: m.volume24h ?? undefined,
      };
    },
    markets: async (limit) => (await api.getMarkets(limit)) as ReadonlyArray<{
      symbol: string;
      name?: string;
      price?: number;
      change24h?: number;
      volume24h?: number;
      marketCap?: number;
      [k: string]: unknown;
    }>,
    history: async (symbol, interval, limit) => {
      const rows = await api.getHistory(symbol, interval, limit);
      return [...rows] as { ts: number; o: number; h: number; l: number; c: number; v: number }[];
    },
    orderbook: (symbol) => api.getOrderbook(symbol),
  };
}

/** Adaptateur PaperBackend branché sur l'API Tide. */
export function httpPaperBackend(api: TideApiHttp): PaperBackend {
  return {
    getBalance: (userId) => api.getBalance(userId),
    getPortfolio: (userId) => api.getPortfolio(userId),
    listPositions: (userId) => api.listPositions(userId),
    getLeaderboard: (limit) => api.getLeaderboard(limit),
  };
}

/** Adaptateur TradingBackend branché sur l'API Tide. */
export function httpTradingBackend(api: TideApiHttp): TradingBackend {
  return {
    placeOrder: (input) => api.placeOrder(input),
    placeLiveOrder: (input) => api.placeLiveOrder(input),
    cancelOrder: (orderId) => api.cancelOrder(orderId),
    getOpenOrders: () => api.getOpenOrders(),
  };
}

/** Adaptateur PerpBackend branché sur l'API Tide. */
export function httpPerpBackend(api: TideApiHttp): PerpBackend {
  return {
    openPosition: (input) => api.openPosition(input),
    closePosition: (input) => api.closePosition(input),
  };
}

/** Adaptateur CompetitionBackend branché sur l'API Tide. */
export function httpCompetitionBackend(api: TideApiHttp): CompetitionBackend {
  return {
    list: async () => api.listCompetitions(),
    get: (id) => api.getCompetition(id),
    join: async (userId, competitionId) => {
      const r = await api.joinCompetition(competitionId);
      return { txJson: r.txJson, userId };
    },
    getLeaderboard: (competitionId, limit) => api.getCompetitionLeaderboard(competitionId, limit),
  };
}

/** Adaptateur AgentActionsStore branché sur l'API Tide. */
export function httpAgentActionsStore(api: TideApiHttp): AgentActionsStore {
  return {
    record: (action) => api.recordAction(action),
    findByIdempotencyKey: (userId, key) => api.findActionByIdempotencyKey(userId, key),
    listByAgent: (agentId, limit) => api.listActionsByAgent(agentId, limit),
    countToday: async (agentId, userId) => api.countToday(agentId, userId),
  };
}

export type AgentXrplKey = unknown;