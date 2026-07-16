import { QUOTE_CURRENCY } from "@tide/core";
import type { PriceMap } from "@tide/core";
import { PaperService } from "../services/paper-service";
import { arenaSimulationUserId } from "./arena-ids";

/** Configuration runtime du banc de charge Paper. */
export interface ArenaSimulationConfig {
  readonly users: number;
  readonly tradesPerTick: number;
  readonly tickIntervalMs: number;
}

/** Etat exposé à la console admin — tous les compteurs sont depuis le boot. */
export interface ArenaSimulationStatus {
  readonly enabled: boolean;
  readonly configuredUsers: number;
  readonly provisionedUsers: number;
  readonly tradesPerTick: number;
  readonly tickIntervalMs: number;
  readonly lastTickAt: number | null;
  readonly completedTicks: number;
  readonly executedTrades: number;
  readonly skippedTrades: number;
  readonly lastError: string | null;
}

/** Contrat minimal pour ne pas coupler la console admin au scheduler. */
export interface ArenaSimulationStatusReader {
  status(): ArenaSimulationStatus;
}

const DEFAULT_SYMBOLS = ["XRP", "BTC", "ETH", "SOL"];

/**
 * Contrôleur unique de profils Paper de charge. Il ne connaît ni wallet, ni
 * clé, ni XRPL : ses seules mutations passent par `PaperService` et restent
 * donc dans SQLite. Le rythme est volontairement borné et tournant pour
 * reproduire une activité répartie plutôt qu'un pic artificiel simultané.
 */
export class ArenaSimulationService implements ArenaSimulationStatusReader {
  private cursor = 0;
  private provisionedUsers = 0;
  private lastTickAt: number | null = null;
  private completedTicks = 0;
  private executedTrades = 0;
  private skippedTrades = 0;
  private lastError: string | null = null;

  constructor(
    private readonly paper: PaperService,
    private readonly config: ArenaSimulationConfig,
  ) {}

  /** Crée les profils de façon idempotente, sans lancer de trade. */
  provision(): void {
    if (!this.enabled()) return;
    let present = 0;
    for (let index = 0; index < this.config.users; index += 1) {
      this.paper.ensureAccount(arenaSimulationUserId(index));
      present += 1;
    }
    this.provisionedUsers = present;
  }

  /** Exécute une tranche tournante du scénario, sans I/O réseau. */
  tick(prices: PriceMap): void {
    if (!this.enabled()) return;
    this.provision();
    this.lastTickAt = Date.now();
    this.lastError = null;

    for (let offset = 0; offset < this.config.tradesPerTick; offset += 1) {
      const index = (this.cursor + offset) % this.config.users;
      try {
        if (this.trade(index, prices)) {
          this.executedTrades += 1;
        } else {
          this.skippedTrades += 1;
        }
      } catch (error) {
        this.skippedTrades += 1;
        this.lastError = error instanceof Error ? error.message : "simulation trade rejected";
      }
    }
    this.cursor = (this.cursor + this.config.tradesPerTick) % this.config.users;
    this.completedTicks += 1;
  }

  /** Démarre le scheduler et le laisse ne pas retenir l'arrêt du processus. */
  start(getPrices: () => PriceMap): void {
    if (!this.enabled()) return;
    this.provision();
    const run = () => this.tick(getPrices());
    run();
    const timer = setInterval(run, this.config.tickIntervalMs);
    timer.unref();
  }

  status(): ArenaSimulationStatus {
    return {
      enabled: this.enabled(),
      configuredUsers: this.config.users,
      provisionedUsers: this.provisionedUsers,
      tradesPerTick: this.config.tradesPerTick,
      tickIntervalMs: this.config.tickIntervalMs,
      lastTickAt: this.lastTickAt,
      completedTicks: this.completedTicks,
      executedTrades: this.executedTrades,
      skippedTrades: this.skippedTrades,
      lastError: this.lastError,
    };
  }

  private enabled(): boolean {
    return this.config.users > 0;
  }

  /**
   * Une stratégie déterministe très légère : elle alterne achats modestes et
   * prises de profit partielles. Le capital reste le capital virtuel initial.
   */
  private trade(index: number, prices: PriceMap): boolean {
    const symbol = this.symbolFor(index, prices);
    if (symbol === undefined) return false;
    const price = prices[symbol];
    if (price === undefined || !Number.isFinite(price) || price <= 0) return false;

    const userId = arenaSimulationUserId(index);
    const balances = this.paper.balancesOf(userId);
    const held = balances[symbol] ?? 0;
    const shouldSell = held > 0 && (index + this.completedTicks) % 4 === 0;

    if (shouldSell) {
      const amount = held * (0.15 + (index % 3) * 0.05);
      this.paper.placeOrder(userId, {
        pair: { base: symbol, quote: QUOTE_CURRENCY },
        side: "sell",
        amount,
        price,
      });
      return true;
    }

    const cash = balances[QUOTE_CURRENCY] ?? 0;
    const notional = Math.min(cash * (0.01 + (index % 4) * 0.005), 250);
    if (!Number.isFinite(notional) || notional <= 0) return false;
    this.paper.placeOrder(userId, {
      pair: { base: symbol, quote: QUOTE_CURRENCY },
      side: "buy",
      amount: notional / price,
      price,
    });
    return true;
  }

  private symbolFor(index: number, prices: PriceMap): string | undefined {
    const preferred = DEFAULT_SYMBOLS.filter((symbol) => {
      const price = prices[symbol];
      return price !== undefined && Number.isFinite(price) && price > 0;
    });
    const candidates =
      preferred.length > 0
        ? preferred
        : Object.keys(prices)
            .filter((symbol) => symbol !== QUOTE_CURRENCY)
            .filter((symbol) => {
              const price = prices[symbol];
              return price !== undefined && Number.isFinite(price) && price > 0;
            })
            .sort();
    return candidates.length === 0 ? undefined : candidates[index % candidates.length];
  }
}
