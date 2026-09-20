import { randomUUID } from "node:crypto";
import type { PriceMap } from "@tide/core";
import type { PaperService } from "./paper-service";
import type { Agent, AgentStore } from "../store/agent-store";
import type { AgentAction, AgentActionsStore } from "../store/agent-actions-store";
import type { PaperWalletStore } from "../store/paper-wallet-store";

export const PORTFOLIO_MANAGER_AGENT_ID = "00000000-0000-4000-8000-000000000001";
export const PORTFOLIO_MANAGER_USER_ID = "operator:portfolio-manager";
export const PORTFOLIO_MANAGER_NAME = "Tide Portfolio Manager";

const SYMBOLS = ["XRP", "BTC", "ETH", "SOL", "BNB"] as const;
const MAX_ACCOUNTS_PER_CYCLE = 300;
const BASE_NOTIONAL_USD = 200;
const NOTIONAL_STEP_USD = 5;
const NOTIONAL_VARIANTS = 50;
const PERP_TAKER_FEE_RATE = 0.0006;

export interface PortfolioManagerTradePlan {
  readonly userId: string;
  readonly symbol: string;
  readonly side: "long" | "short";
  readonly leverage: number;
  readonly notionalUsd: number;
  readonly quantity: number;
  readonly entryPrice: number;
  readonly marginUsd: number;
}

export interface PortfolioManagerPlan {
  readonly id: string;
  readonly managerAgentId: string;
  readonly createdAt: number;
  readonly status: "prepared" | "executed";
  readonly llmCalls: 0;
  readonly profile: "standard" | "high_risk" | "sized";
  readonly confirmation: string;
  readonly trades: readonly PortfolioManagerTradePlan[];
}

export interface PortfolioManagerExecution {
  readonly planId: string;
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly (
    | { readonly userId: string; readonly status: "succeeded"; readonly positionId: string }
    | { readonly userId: string; readonly status: "failed"; readonly error: string }
  )[];
}

export interface PortfolioManagerStatus {
  readonly enabled: true;
  readonly managerAgentId: string;
  readonly managerName: string;
  readonly mode: "deterministic_batch";
  readonly llmCallsPerCycle: 0;
  readonly maxAccountsPerCycle: number;
  readonly preparedPlan: PortfolioManagerPlan | null;
}

export interface PortfolioManagerServiceDeps {
  readonly paper: PaperService;
  readonly agents: AgentStore;
  readonly actions: AgentActionsStore;
  readonly wallets: Pick<PaperWalletStore, "list">;
  readonly getPrices: () => PriceMap;
  readonly now?: () => number;
  readonly newId?: () => string;
}

/**
 * Agent opérateur unique pour les comptes Paper custodiaux.
 *
 * Il ne reçoit jamais de seed et ne contourne aucune route publique : il agit
 * directement dans le process privé admin, uniquement sur les comptes dont le
 * wallet XRPL est déjà financé. Le plan est déterministe et diversifié, donc
 * zéro appel LLM par cycle et aucun coût token proportionnel au nombre de
 * wallets. L'exécution reste séparée de la préparation et exige une phrase de
 * confirmation liée au nombre exact de trades.
 */
export class PortfolioManagerService {
  private readonly now: () => number;
  private readonly newId: () => string;
  private preparedPlan: PortfolioManagerPlan | null = null;

  constructor(private readonly deps: PortfolioManagerServiceDeps) {
    this.now = deps.now ?? Date.now;
    this.newId = deps.newId ?? randomUUID;
  }

  async status(): Promise<PortfolioManagerStatus> {
    await this.ensureManagerAgent();
    return {
      enabled: true,
      managerAgentId: PORTFOLIO_MANAGER_AGENT_ID,
      managerName: PORTFOLIO_MANAGER_NAME,
      mode: "deterministic_batch",
      llmCallsPerCycle: 0,
      maxAccountsPerCycle: MAX_ACCOUNTS_PER_CYCLE,
      preparedPlan: this.preparedPlan,
    };
  }

  async prepare(
    requestedUserIds: readonly string[],
    profile: "standard" | "high_risk" | "sized" = "standard",
  ): Promise<PortfolioManagerPlan> {
    await this.ensureManagerAgent();
    const wallets = await this.deps.wallets.list();
    const fundedUserIds = new Set(
      wallets
        .filter((wallet) => wallet.status === "funded")
        .map((wallet) => wallet.userId),
    );
    const requested = requestedUserIds.length === 0
      ? [...fundedUserIds]
      : [...new Set(requestedUserIds.map((userId) => userId.trim()).filter(Boolean))];
    if (requested.length === 0) throw new Error("Aucun wallet financé à gérer");
    if (requested.length > MAX_ACCOUNTS_PER_CYCLE) {
      throw new Error(`Maximum ${String(MAX_ACCOUNTS_PER_CYCLE)} wallets par cycle`);
    }
    if (profile === "high_risk" && requested.length > 2) {
      throw new Error("Le profil high-risk est limité à 2 wallets par cycle");
    }
    for (const userId of requested) {
      if (!fundedUserIds.has(userId)) throw new Error(`Wallet non financé refusé: ${userId}`);
      // Vérifie aussi que le compte Paper existe avant de produire le plan.
      this.deps.paper.positionsOf(userId);
    }

    const prices = this.deps.getPrices();
    const availableSymbols = SYMBOLS.filter((symbol) => {
      const price = prices[symbol];
      return price !== undefined && Number.isFinite(price) && price > 0;
    });
    if (availableSymbols.length === 0) throw new Error("Aucun prix de marché disponible");
    const trades = requested.sort().map((userId, index) => {
      const activityOffset =
        this.deps.paper.tradeCountOf(userId) + this.deps.paper.positionsOf(userId).length;
      const slot = index + activityOffset;
      const symbol = availableSymbols[slot % availableSymbols.length] ?? availableSymbols[0];
      if (symbol === undefined) throw new Error("Aucun actif disponible");
      const entryPrice = prices[symbol];
      if (entryPrice === undefined || !Number.isFinite(entryPrice) || entryPrice <= 0) {
        throw new Error(`Prix indisponible pour ${symbol}`);
      }
      // Les centimes par bloc conservent une taille unique jusqu'à 300 comptes,
      // tout en bornant le notionnel sous 445 USD au lieu de le faire croître
      // linéairement avec la taille de la flotte.
      const highRiskMargins = [5_000, 3_500] as const;
      const highRiskLeverages = [15, 12] as const;
      const clusteredMargins = [2_000, 2_100, 2_000, 2_100, 2_000, 2_100] as const;
      const clusteredLeverages = [20, 20, 18, 20, 18, 20] as const;
      const sizedMargin = profile === "high_risk"
        ? highRiskMargins[index % highRiskMargins.length] ?? 3_500
        : clusteredMargins[index % clusteredMargins.length] ?? 2_000;
      const sizedLeverage = profile === "high_risk"
        ? highRiskLeverages[index % highRiskLeverages.length] ?? 12
        : clusteredLeverages[index % clusteredLeverages.length] ?? 20;
      const leveragedProfile = profile === "high_risk" || profile === "sized";
      const leverage = leveragedProfile ? sizedLeverage : 1 + (slot % 3);
      const notionalUsd = leveragedProfile
        ? sizedMargin * leverage
        : BASE_NOTIONAL_USD
          + (index % NOTIONAL_VARIANTS) * NOTIONAL_STEP_USD
          + Math.floor(index / NOTIONAL_VARIANTS) / 100;
      return {
        userId,
        symbol,
        side: slot % 2 === 0 ? "long" as const : "short" as const,
        leverage,
        notionalUsd,
        quantity: notionalUsd / entryPrice,
        entryPrice,
        marginUsd: leveragedProfile ? sizedMargin : notionalUsd / leverage,
      };
    });
    const id = this.newId();
    const confirmation = `EXECUTE ${String(trades.length)} DIVERSIFIED PAPER TRADES`;
    this.preparedPlan = {
      id,
      managerAgentId: PORTFOLIO_MANAGER_AGENT_ID,
      createdAt: this.now(),
      status: "prepared",
      llmCalls: 0,
      profile,
      confirmation,
      trades,
    };
    return this.preparedPlan;
  }

  async execute(planId: string, confirmation: string): Promise<PortfolioManagerExecution> {
    const plan = this.preparedPlan;
    if (plan === null || plan.id !== planId || plan.status !== "prepared") {
      throw new Error("Plan absent, expiré ou déjà exécuté");
    }
    if (confirmation !== plan.confirmation) {
      throw new Error(`Confirmation requise: ${plan.confirmation}`);
    }
    const results: PortfolioManagerExecution["results"][number][] = [];
    for (const trade of plan.trades) {
      const actionBase = {
        id: this.newId(),
        agentId: PORTFOLIO_MANAGER_AGENT_ID,
        userId: trade.userId,
        toolName: "portfolio_manager.open_position",
        toolParams: JSON.stringify(trade),
        idempotencyKey: `portfolio-manager:${plan.id}:${trade.userId}`,
        executedAt: this.now(),
      };
      try {
        const position = this.deps.paper.openPosition(trade.userId, {
          product: "perp",
          symbol: trade.symbol,
          side: trade.side,
          qty: trade.quantity,
          entry: trade.entryPrice,
          leverage: trade.leverage,
          margin: trade.marginUsd,
          fee: trade.notionalUsd * PERP_TAKER_FEE_RATE,
        });
        await this.record({
          ...actionBase,
          result: JSON.stringify({ positionId: position.id }),
          error: null,
        });
        results.push({ userId: trade.userId, status: "succeeded", positionId: position.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.record({ ...actionBase, result: null, error: message });
        results.push({ userId: trade.userId, status: "failed", error: message });
      }
    }
    this.preparedPlan = { ...plan, status: "executed" };
    const succeeded = results.filter((result) => result.status === "succeeded").length;
    return {
      planId: plan.id,
      requested: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  private async ensureManagerAgent(): Promise<Agent> {
    const existing = await this.deps.agents.get(PORTFOLIO_MANAGER_AGENT_ID);
    if (existing !== null) return existing;
    const now = this.now();
    const agent: Agent = {
      id: PORTFOLIO_MANAGER_AGENT_ID,
      userId: PORTFOLIO_MANAGER_USER_ID,
      name: PORTFOLIO_MANAGER_NAME,
      type: "integrated",
      status: "active",
      hasLiveAccount: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.deps.agents.create(agent);
    return agent;
  }

  private record(action: AgentAction): Promise<void> {
    return this.deps.actions.record(action);
  }
}
