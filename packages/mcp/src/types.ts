// Shared types for @tide/mcp.
// Mirrors the canonical shapes from apps/api/src/store/{agent,mandate,agent-actions}-store.ts
// so that @tide/mcp stays a leaf package (no imports from apps/api).

export type AgentType = "external" | "integrated";
export type AgentStatus = "active" | "paused" | "stopped";

export interface Agent {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly type: AgentType;
  readonly status: AgentStatus;
  readonly hasLiveAccount: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type MandateStatus = "pending" | "active" | "expired" | "revoked";
export type MandateStyle = "momentum" | "mean_reversion" | "dca" | "grid" | "mixed";

export interface Mandate {
  readonly id: string;
  readonly agentId: string;
  readonly userId: string;
  readonly capitalMax: number;
  readonly perteMaxJour: number;
  readonly maxTradesPerDay: number;
  readonly maxLeverage: number;
  readonly pairesAutorisees: readonly string[];
  readonly style: MandateStyle | null;
  readonly validUntil: number;
  readonly signedAt: number | null;
  readonly signature: string | null;
  readonly status: MandateStatus;
}

export interface AgentAction {
  readonly id: string;
  readonly agentId: string;
  readonly userId: string;
  readonly toolName: string;
  readonly toolParams: string; // JSON sérialisé
  readonly result: string | null; // JSON sérialisé, null si erreur
  readonly error: string | null;
  readonly idempotencyKey: string | null;
  readonly executedAt: number;
}

export interface AgentActionsStore {
  record(action: AgentAction): Promise<void>;
  findByIdempotencyKey(userId: string, key: string): Promise<AgentAction | null>;
  listByAgent(agentId: string, limit?: number): Promise<AgentAction[]>;
  countToday(agentId: string, userId: string): Promise<number>;
}

/**
 * Snapshot of Tide's runtime config exposed to MCP tools.
 * Fed by the API at session start; safe-by-default values used by the bootstrap.
 */
export interface PublicConfig {
  /** Trading mode exposure for this session. */
  readonly mode: "paper" | "live";
  /** XRPL SourceTag if the server is configured for on-chain attribution, else null. */
  readonly sourceTag: number | null;
  /** Symbols the agent may trade under this mandate (subset of platform markets). */
  readonly availablePairs: readonly string[];
}

export interface McpContext {
  readonly agent: Agent;
  readonly userId: string;
  readonly mandate: Mandate | null;
  readonly priceFeed: PriceFeed;
  readonly paper: PaperBackend;
  readonly trading: TradingBackend;
  readonly perp: PerpBackend;
  readonly competitions: CompetitionBackend;
  readonly actions: AgentActionsStore;
  readonly config: PublicConfig;
  /** Optional SSE broadcaster — emits one event per successful agent action. */
  readonly broadcaster?: Broadcaster;
}

/** Backend façade pour les ordres spot (impl concrète dans @tide/api). */
export interface TradingBackend {
  placeOrder(input: {
    userId: string;
    symbol: string;
    side: "buy" | "sell";
    qty: number;
    type: "market" | "limit";
    price?: number;
    clientOrderId?: string;
  }): Promise<{ orderId: string; status: string; filledQty: number; avgPrice: number }>;
  cancelOrder(userId: string, orderId: string): Promise<void>;
  getOpenOrders(userId: string): Promise<readonly unknown[]>;
}

/** Optional SSE broadcaster — kept minimal so tools stay typed without it. */
export interface Broadcaster {
  emit(event: { readonly type: string; readonly [k: string]: unknown }): void;
}

/** Backend façade pour les requêtes portefeuille (impl concrète dans @tide/api). */
export interface PaperBackend {
  getBalance(userId: string): Promise<Record<string, number>>;
  getPortfolio(
    userId: string,
  ): Promise<{ balances: Record<string, number>; equity: number; pnl: number }>;
  listPositions(userId: string): Promise<unknown[]>;
  getLeaderboard(limit: number): Promise<unknown[]>;
}

/** Backend façade pour les positions perp à levier (impl concrète dans @tide/api). */
export interface PerpBackend {
  openPosition(input: {
    userId: string;
    symbol: string;
    side: "long" | "short";
    qty: number;
    leverage: number;
    margin?: number;
    tp?: number;
    sl?: number;
    clientOrderId?: string;
  }): Promise<{ positionId: string; entryPrice: number; liquidationPrice: number }>;
  closePosition(input: {
    userId: string;
    positionId: string;
  }): Promise<{ realizedPnl: number }>;
}

/**
 * Backend façade pour les compétitions (list, get, join, leaderboard).
 * `join` renvoie le `txJson` (Payment de buy-in) **non signé** : l'agent ne signe
 * jamais automatiquement (Xaman requis) — l'user signe de son côté. En v2,
 * l'agent pourrait détenir un compte dédié qui auto-signe.
 */
export interface CompetitionBackend {
  list(): Promise<readonly unknown[]>;
  get(id: string): Promise<unknown | null>;
  join(userId: string, competitionId: string): Promise<{ txJson: unknown }>;
  getLeaderboard(competitionId: string, limit: number): Promise<readonly unknown[]>;
}

export interface MarketRow {
  readonly symbol: string;
  readonly name?: string;
  readonly price?: number;
  readonly change24h?: number;
  readonly volume24h?: number;
  readonly marketCap?: number;
}

export interface PriceFeed {
  priceOf(
    symbol: string,
  ): Promise<{ usd: number; change24h?: number; volume24h?: number } | null>;
  markets(limit: number): Promise<readonly MarketRow[]>;
  history(
    symbol: string,
    interval: string,
    limit: number,
  ): Promise<{ ts: number; o: number; h: number; l: number; c: number; v: number }[]>;
  orderbook(
    symbol: string,
  ): Promise<{ bids: [number, number][]; asks: [number, number][] } | null>;
}