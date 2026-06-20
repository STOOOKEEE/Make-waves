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

interface PaperAccount {
  balances: Balances;
  readonly orders: Fill[];
}

/**
 * Service de paper trading en mémoire : gère les comptes virtuels, applique les
 * ordres (via le moteur pur `@tide/core`) et produit le classement. L'état vit
 * ici pour l'instant ; la persistance (DB) sera un adaptateur ultérieur.
 */
export class PaperService {
  private readonly accounts = new Map<string, PaperAccount>();
  private readonly startingEquity: number;

  constructor(startingEquity: number = PAPER_STARTING_EQUITY) {
    if (!Number.isFinite(startingEquity) || startingEquity <= 0) {
      throw new InvalidStartingEquityError(
        `Capital de départ invalide: ${String(startingEquity)}`,
      );
    }
    this.startingEquity = startingEquity;
  }

  /** Ouvre un compte avec le capital de départ en devise de référence. */
  openAccount(userId: string): void {
    if (userId.trim() === "") {
      throw new InvalidUserError("userId vide");
    }
    if (this.accounts.has(userId)) {
      throw new AccountExistsError(`Compte déjà ouvert: ${userId}`);
    }
    this.accounts.set(userId, {
      balances: { [QUOTE_CURRENCY]: this.startingEquity },
      orders: [],
    });
  }

  /** Applique un ordre marché et l'enregistre. Retourne le fill. */
  placeOrder(userId: string, order: MarketOrderInput): Fill {
    const account = this.requireAccount(userId);
    const result = applyMarketOrder(account.balances, order);
    account.balances = result.balances;
    account.orders.push(result.fill);
    return result.fill;
  }

  /** Soldes courants du compte (copie : l'état interne reste encapsulé). */
  balancesOf(userId: string): Balances {
    return { ...this.requireAccount(userId).balances };
  }

  /** Historique des ordres exécutés (copie : l'état interne reste encapsulé). */
  ordersOf(userId: string): readonly Fill[] {
    return [...this.requireAccount(userId).orders];
  }

  /** Equity du compte en devise de référence. */
  equityOf(userId: string, prices: PriceMap): number {
    return equity(this.requireAccount(userId).balances, prices, QUOTE_CURRENCY);
  }

  /** PnL du compte vs capital de départ. */
  pnlOf(userId: string, prices: PriceMap): number {
    return pnl(this.equityOf(userId, prices), this.startingEquity);
  }

  /** Classement de tous les comptes (réutilise le leaderboard du domaine). */
  leaderboard(prices: PriceMap): LeaderboardEntry[] {
    const snapshots = [...this.accounts.entries()].map(([userId, account]) => ({
      userId,
      balances: account.balances,
    }));
    return buildLeaderboard(
      snapshots,
      prices,
      QUOTE_CURRENCY,
      this.startingEquity,
    );
  }

  private requireAccount(userId: string): PaperAccount {
    const account = this.accounts.get(userId);
    if (account === undefined) {
      throw new AccountNotFoundError(`Compte introuvable: ${userId}`);
    }
    return account;
  }
}
