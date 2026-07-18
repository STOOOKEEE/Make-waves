import type { PriceMap } from "@tide/core";
import type { PaperService } from "./paper-service";
import type { Agent, AgentStatus, AgentType, AgentStore } from "../store/agent-store";
import type { MandateStore } from "../store/mandate-store";
import type { AgentActionsStore } from "../store/agent-actions-store";
import { isTechnicalTestUserId } from "../simulation/arena-ids";
import type { ArenaSimulationStatus, ArenaSimulationStatusReader } from "../simulation/arena-simulation-service";
import type { PaperWallet, PaperWalletStore } from "../store/paper-wallet-store";

/** Origine d'un compte paper. Précédence : operator > agent > frontend. */
export type AccountSegment = "operator" | "agent" | "frontend";

export interface AdminUserRow {
  readonly userId: string;
  readonly segment: AccountSegment;
  readonly equity: number;
  readonly pnl: number;
  readonly orders: number;
  readonly positions: number;
  readonly rank: number;
}

export interface AdminAgentRow {
  readonly id: string;
  readonly name: string;
  readonly type: AgentType;
  readonly status: AgentStatus;
  readonly ownerUserId: string;
  readonly hasLiveAccount: boolean;
  readonly mandate: {
    readonly capitalMax: number;
    readonly maxLeverage: number;
    readonly validUntil: number;
  } | null;
  readonly lastAction: {
    readonly toolName: string;
    readonly executedAt: number;
  } | null;
  readonly createdAt: number;
}

export type WalletKind = "agent" | "paper" | "prize_pool";

export interface AdminWalletRow {
  readonly address: string | null;
  readonly kind: WalletKind;
  readonly agentId: string | null;
  readonly userId: string | null;
  readonly live: boolean;
  readonly status: PaperWallet["status"] | "not_created" | null;
  readonly network: "mainnet" | null;
  readonly fundingTxHash: string | null;
  readonly fundedAt: number | null;
  readonly createdAt: number | null;
}

export interface AdminSegmentTotals {
  readonly operator: number;
  readonly frontend: number;
  readonly agent: number;
}

export interface AdminAgentTotals {
  readonly total: number;
  readonly active: number;
  readonly paused: number;
  readonly stopped: number;
}

export interface AdminTotals {
  /** Utilisateurs humains uniquement : les profils d'arène sont séparés. */
  readonly users: number;
  readonly bySegment: AdminSegmentTotals;
  readonly agents: AdminAgentTotals;
  readonly wallets: number;
}

export interface AdminOverview {
  readonly totals: AdminTotals;
  readonly users: readonly AdminUserRow[];
  readonly agents: readonly AdminAgentRow[];
  readonly wallets: readonly AdminWalletRow[];
  /** Banc de charge Paper, explicitement séparé de la population humaine. */
  readonly simulation: ArenaSimulationStatus;
}

export interface AdminServiceDeps {
  readonly paper: PaperService;
  readonly agents: AgentStore;
  readonly mandates: MandateStore;
  readonly actions: AgentActionsStore;
  readonly prizePoolAddress: string | null;
  readonly operatorUserIds: ReadonlySet<string>;
  readonly paperWallets?: Pick<PaperWalletStore, "list">;
  readonly simulation?: ArenaSimulationStatusReader;
}

/** Nombre d'actions récentes à charger par agent (seule la dernière est exposée). */
const LAST_ACTION_LIMIT = 1;

/**
 * Assemble la vue d'ensemble opérateur en lecture seule : population de comptes
 * segmentée par origine, agents (mandat + dernière action), wallets. Ne mute
 * rien ; réutilise le leaderboard du domaine (une seule règle d'equity/PnL).
 */
export class AdminService {
  constructor(private readonly deps: AdminServiceDeps) {}

  async overview(prices: PriceMap): Promise<AdminOverview> {
    const agents = await this.deps.agents.list();
    const agentOwners = new Set(agents.map((a) => a.userId));

    const users = this.buildUsers(prices, agentOwners);
    const agentRows = await this.buildAgents(agents);
    const wallets = await this.buildWallets(agents, users);

    return {
      totals: this.buildTotals(users, agents, wallets),
      users,
      agents: agentRows,
      wallets,
      simulation: this.deps.simulation?.status() ?? disabledSimulationStatus(),
    };
  }

  private classify(userId: string, agentOwners: ReadonlySet<string>): AccountSegment {
    if (this.deps.operatorUserIds.has(userId)) {
      return "operator";
    }
    if (agentOwners.has(userId)) {
      return "agent";
    }
    return "frontend";
  }

  private buildUsers(
    prices: PriceMap,
    agentOwners: ReadonlySet<string>,
  ): AdminUserRow[] {
    return this.deps.paper.leaderboard(prices, (userId) => !isTechnicalTestUserId(userId)).map((entry) => ({
      userId: entry.userId,
      segment: this.classify(entry.userId, agentOwners),
      equity: entry.equity,
      pnl: entry.pnl,
      orders: this.deps.paper.ordersOf(entry.userId).length,
      positions: this.deps.paper.positionsOf(entry.userId).length,
      rank: entry.rank,
    }));
  }

  private async buildAgents(agents: readonly Agent[]): Promise<AdminAgentRow[]> {
    return Promise.all(
      agents.map(async (agent) => {
        const mandate = await this.deps.mandates.getActive(agent.id);
        const recent = await this.deps.actions.listByAgent(agent.id, LAST_ACTION_LIMIT);
        const last = recent[0] ?? null;
        return {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          ownerUserId: agent.userId,
          hasLiveAccount: agent.hasLiveAccount,
          mandate:
            mandate === null
              ? null
              : {
                  capitalMax: mandate.capitalMax,
                  maxLeverage: mandate.maxLeverage,
                  validUntil: mandate.validUntil,
                },
          lastAction:
            last === null
              ? null
              : { toolName: last.toolName, executedAt: last.executedAt },
          createdAt: agent.createdAt,
        };
      }),
    );
  }

  private async buildWallets(
    agents: readonly Agent[],
    users: readonly AdminUserRow[],
  ): Promise<AdminWalletRow[]> {
    const wallets: AdminWalletRow[] = agents
      .filter((a) => a.hasLiveAccount)
      .map((a) => ({
        address: null,
        kind: "agent" as const,
        agentId: a.id,
        userId: a.userId,
        live: true,
        status: null,
        network: null,
        fundingTxHash: null,
        fundedAt: null,
        createdAt: null,
      }));
    const paperWallets = await this.deps.paperWallets?.list() ?? [];
    const paperWalletByUser = new Map(paperWallets.map((wallet) => [wallet.userId, wallet]));
    const userIds = new Set(users.map((user) => user.userId));
    wallets.push(...users.map((user) => {
      const wallet = paperWalletByUser.get(user.userId);
      return {
        address: wallet?.address ?? null,
        kind: "paper" as const,
        agentId: null,
        userId: user.userId,
        live: false,
        status: wallet?.status ?? "not_created" as const,
        network: "mainnet" as const,
        fundingTxHash: wallet?.fundingTxHash ?? null,
        fundedAt: wallet?.fundedAt ?? null,
        createdAt: wallet?.createdAt ?? null,
      };
    }));
    wallets.push(...paperWallets.filter((wallet) => !userIds.has(wallet.userId)).map((wallet) => ({
      address: wallet.address,
      kind: "paper" as const,
      agentId: null,
      userId: wallet.userId,
      live: false,
      status: wallet.status,
      network: "mainnet" as const,
      fundingTxHash: wallet.fundingTxHash,
      fundedAt: wallet.fundedAt,
      createdAt: wallet.createdAt,
    })));
    if (this.deps.prizePoolAddress !== null) {
      wallets.push({
        address: this.deps.prizePoolAddress,
        kind: "prize_pool",
        agentId: null,
        userId: null,
        live: true,
        status: null,
        network: null,
        fundingTxHash: null,
        fundedAt: null,
        createdAt: null,
      });
    }
    return wallets;
  }

  private buildTotals(
    users: readonly AdminUserRow[],
    agents: readonly Agent[],
    wallets: readonly AdminWalletRow[],
  ): AdminTotals {
    const bySegment: AdminSegmentTotals = {
      operator: users.filter((u) => u.segment === "operator").length,
      agent: users.filter((u) => u.segment === "agent").length,
      frontend: users.filter((u) => u.segment === "frontend").length,
    };
    return {
      users: users.length,
      bySegment,
      agents: {
        total: agents.length,
        active: agents.filter((a) => a.status === "active").length,
        paused: agents.filter((a) => a.status === "paused").length,
        stopped: agents.filter((a) => a.status === "stopped").length,
      },
      wallets: wallets.filter((wallet) => wallet.kind !== "paper" || wallet.address !== null).length,
    };
  }
}

function disabledSimulationStatus(): ArenaSimulationStatus {
  return {
    enabled: false,
    configuredUsers: 0,
    provisionedUsers: 0,
    tradesPerTick: 0,
    tickIntervalMs: 60_000,
    lastTickAt: null,
    completedTicks: 0,
    executedTrades: 0,
    skippedTrades: 0,
    lastError: null,
  };
}
