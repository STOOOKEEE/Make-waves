import {
  applyMarketOrder,
  buildLeaderboard,
  equity,
  pnl,
  PAPER_STARTING_EQUITY,
  QUOTE_CURRENCY,
} from "@tide/core";
import type {
  Balances,
  Fill,
  LeaderboardEntry,
  MarketOrderInput,
  PriceMap,
} from "@tide/core";
import {
  AccountExistsError,
  AccountNotFoundError,
  InvalidStartingEquityError,
  InvalidUserError,
} from "./errors";
import { InMemoryAccountStore } from "../store/account-store";
import type { AccountStore } from "../store/account-store";

/** Ligne de portefeuille : une devise détenue, valorisée en devise de référence. */
export interface Holding {
  readonly currency: string;
  readonly amount: number;
  /** Valeur en devise de référence (amount × prix ; = amount pour la devise de réf). */
  readonly value: number;
}

/** Portefeuille agrégé d'un compte : soldes valorisés, equity et PnL. */
export interface Portfolio {
  readonly balances: Balances;
  readonly holdings: Holding[];
  readonly equity: number;
  readonly pnl: number;
}

/**
 * Service de paper trading : gère les comptes virtuels, applique les ordres (via
 * le moteur pur `@tide/core`) et produit le classement. La persistance est
 * déléguée à un `AccountStore` injecté (en mémoire par défaut, SQLite en option)
 * → le service ne contient que la logique métier.
 */
export class PaperService {
  private readonly startingEquity: number;
  private readonly store: AccountStore;

  constructor(
    startingEquity: number = PAPER_STARTING_EQUITY,
    store: AccountStore = new InMemoryAccountStore(),
  ) {
    if (!Number.isFinite(startingEquity) || startingEquity <= 0) {
      throw new InvalidStartingEquityError(
        `Capital de départ invalide: ${String(startingEquity)}`,
      );
    }
    this.startingEquity = startingEquity;
    this.store = store;
  }

  /** Ouvre un compte avec le capital de départ en devise de référence. */
  openAccount(userId: string): void {
    if (userId.trim() === "") {
      throw new InvalidUserError("userId vide");
    }
    if (this.store.has(userId)) {
      throw new AccountExistsError(`Compte déjà ouvert: ${userId}`);
    }
    this.store.open(userId, { [QUOTE_CURRENCY]: this.startingEquity });
  }

  /** Ouvre le compte s'il n'existe pas déjà. Retourne vrai si un compte a été créé. */
  ensureAccount(userId: string): boolean {
    if (userId.trim() === "") {
      throw new InvalidUserError("userId vide");
    }
    if (this.store.has(userId)) {
      return false;
    }
    this.store.open(userId, { [QUOTE_CURRENCY]: this.startingEquity });
    return true;
  }

  /** Applique un ordre marché et l'enregistre atomiquement. Retourne le fill. */
  placeOrder(userId: string, order: MarketOrderInput): Fill {
    const balances = this.requireBalances(userId);
    const result = applyMarketOrder(balances, order);
    this.store.applyOrder(userId, result.balances, result.fill);
    return result.fill;
  }

  /** Soldes courants du compte. */
  balancesOf(userId: string): Balances {
    return this.requireBalances(userId);
  }

  /** Historique des ordres exécutés du compte. */
  ordersOf(userId: string): readonly Fill[] {
    const orders = this.store.getOrders(userId);
    if (orders === undefined) {
      throw new AccountNotFoundError(`Compte introuvable: ${userId}`);
    }
    return orders;
  }

  /** Equity du compte en devise de référence. */
  equityOf(userId: string, prices: PriceMap): number {
    return equity(this.requireBalances(userId), prices, QUOTE_CURRENCY);
  }

  /** PnL du compte vs capital de départ. */
  pnlOf(userId: string, prices: PriceMap): number {
    return pnl(this.equityOf(userId, prices), this.startingEquity);
  }

  /**
   * Portefeuille agrégé : chaque devise détenue valorisée en devise de référence,
   * plus l'equity totale et le PnL. La valorisation réutilise `equity` du domaine
   * (par devise puis sur l'ensemble) → une seule règle de prix, pas de duplication.
   */
  portfolioOf(userId: string, prices: PriceMap): Portfolio {
    const balances = this.requireBalances(userId);
    const holdings = Object.entries(balances).map(([currency, amount]) => ({
      currency,
      amount,
      value: equity({ [currency]: amount }, prices, QUOTE_CURRENCY),
    }));
    const equityValue = equity(balances, prices, QUOTE_CURRENCY);
    return {
      balances,
      holdings,
      equity: equityValue,
      pnl: pnl(equityValue, this.startingEquity),
    };
  }

  /** Classement de tous les comptes (réutilise le leaderboard du domaine). */
  leaderboard(prices: PriceMap): LeaderboardEntry[] {
    return buildLeaderboard(
      this.store.snapshots(),
      prices,
      QUOTE_CURRENCY,
      this.startingEquity,
    );
  }

  private requireBalances(userId: string): Balances {
    const balances = this.store.getBalances(userId);
    if (balances === undefined) {
      throw new AccountNotFoundError(`Compte introuvable: ${userId}`);
    }
    return balances;
  }
}
