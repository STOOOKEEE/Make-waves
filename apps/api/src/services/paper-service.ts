import { randomUUID } from "node:crypto";
import {
  applyMarketOrder,
  availableMargin,
  balanceOf,
  buildLeaderboard,
  equity,
  equityWithPositions,
  pnl,
  positionPnl,
  validateOpenPosition,
  InsufficientBalanceError,
  MissingPriceError,
  PAPER_STARTING_EQUITY,
  QUOTE_CURRENCY,
} from "@tide/core";
import type {
  Balances,
  Fill,
  LeaderboardEntry,
  MarketOrderInput,
  OpenPositionInput,
  Position,
  PriceMap,
} from "@tide/core";
import {
  AccountExistsError,
  AccountNotFoundError,
  InvalidStartingEquityError,
  InvalidUserError,
  PositionNotFoundError,
} from "./errors";
import { InMemoryAccountStore } from "../store/account-store";
import type { AccountStore } from "../store/account-store";

/** Ligne de portefeuille : une devise détenue, valorisée en devise de référence. */
export interface Holding {
  readonly currency: string;
  readonly amount: number;
  /** Valeur en devise de référence (amount × prix ; = amount pour la devise de réf). */
  readonly value: number;
  /** Coût restant des unités détenues, selon la méthode du coût moyen pondéré. */
  readonly costBasis: number | null;
  /** Prix d'achat moyen des unités encore détenues. */
  readonly averagePrice: number | null;
  /** PnL latent de l'avoir spot (valeur courante − coût restant). */
  readonly unrealizedPnl: number | null;
}

/** Portefeuille agrégé d'un compte : soldes valorisés, equity et PnL. */
export interface Portfolio {
  readonly balances: Balances;
  readonly holdings: Holding[];
  readonly equity: number;
  readonly pnl: number;
}

/** Résultat de la fermeture d'une position : la position fermée et le PnL réalisé. */
export interface ClosedPosition {
  readonly position: Position;
  readonly realizedPnl: number;
}

/**
 * Service de paper trading : gère les comptes virtuels, applique les ordres (via
 * le moteur pur `@tide/core`) et produit le classement. La persistance est
 * déléguée à un `AccountStore` injecté (en mémoire par défaut, SQLite en option)
 * → le service ne contient que la logique métier.
 *
 * Deux modèles d'exposition coexistent : le **spot** modifie les soldes
 * (`placeOrder`, le cash est réellement dépensé), le **perp** est une position
 * à levier (`openPosition`/`closePosition`, la marge est réservée puis le PnL
 * crédité). L'equity additionne les deux.
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

  /**
   * Un compte est supprimable seulement s'il est strictement vierge : aucun
   * ordre, aucune position et le solde initial intact. Le contrôle du solde
   * évite d'effacer un compte qui aurait déjà fermé une position (donc 0
   * position ouverte mais un PnL réalisé).
   */
  isInactiveAccount(userId: string): boolean {
    const balances = this.store.getBalances(userId);
    if (balances === undefined) return false;
    if ((this.store.getOrders(userId)?.length ?? 0) !== 0) return false;
    if ((this.store.getPerpOrders(userId)?.length ?? 0) !== 0) return false;
    if ((this.store.getPositions(userId)?.length ?? 0) !== 0) return false;
    return this.hasInitialBalances(balances);
  }

  /** Suppression locale définitive d'un compte Paper strictement vierge. */
  deleteInactiveAccount(userId: string): boolean {
    if (!this.isInactiveAccount(userId)) return false;
    return this.store.deleteAccount(userId);
  }

  /** Applique un ordre marché spot et l'enregistre atomiquement. Retourne le fill. */
  placeOrder(userId: string, order: MarketOrderInput): Fill {
    const balances = this.requireBalances(userId);
    const result = applyMarketOrder(balances, order);
    this.store.applyOrder(userId, result.balances, result.fill);
    return result.fill;
  }

  /**
   * Ouvre une position perp (marge réservée, frais débités du cash). Refuse si
   * la marge + frais dépasse le cash disponible (marge déjà immobilisée déduite).
   */
  openPosition(userId: string, input: OpenPositionInput): Position {
    validateOpenPosition(input);
    const balances = this.requireBalances(userId);
    const positions = this.store.getPositions(userId) ?? [];
    const available = availableMargin(balances, positions, QUOTE_CURRENCY);
    if (input.margin + input.fee > available) {
      throw new InsufficientBalanceError(
        `Marge + frais (${String(input.margin + input.fee)}) > disponible (${String(available)})`,
      );
    }
    const cash = balanceOf(balances, QUOTE_CURRENCY);
    const newBalances = { ...balances, [QUOTE_CURRENCY]: cash - input.fee };
    const position: Position = { id: randomUUID(), ...input };
    this.store.openPosition(userId, newBalances, position);
    return position;
  }

  /**
   * Ferme une position au prix de marché serveur (autoritatif). Crédite le PnL
   * réalisé au cash, plancher à -marge (modèle isolated margin : on ne perd
   * jamais plus que la marge engagée). Retourne la position fermée et le PnL.
   */
  closePosition(userId: string, positionId: string, prices: PriceMap): ClosedPosition {
    const balances = this.requireBalances(userId);
    const positions = this.store.getPositions(userId) ?? [];
    const position = positions.find((p) => p.id === positionId);
    if (position === undefined) {
      throw new PositionNotFoundError(`Position introuvable: ${positionId}`);
    }
    const mark = prices[position.symbol];
    if (mark === undefined) {
      throw new MissingPriceError(`Prix manquant pour ${position.symbol}`);
    }
    const realizedPnl = Math.max(positionPnl(position, mark), -position.margin);
    const cash = balanceOf(balances, QUOTE_CURRENCY);
    const newBalances = { ...balances, [QUOTE_CURRENCY]: cash + realizedPnl };
    this.store.closePosition(userId, newBalances, positionId);
    return { position, realizedPnl };
  }

  /** Positions perp ouvertes du compte. */
  positionsOf(userId: string): readonly Position[] {
    const positions = this.store.getPositions(userId);
    if (positions === undefined) {
      throw new AccountNotFoundError(`Compte introuvable: ${userId}`);
    }
    return positions;
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

  /** Historique persistant des ouvertures de positions perp. */
  perpOrdersOf(userId: string): readonly Position[] {
    const orders = this.store.getPerpOrders(userId);
    if (orders === undefined) {
      throw new AccountNotFoundError(`Compte introuvable: ${userId}`);
    }
    return orders;
  }

  /**
   * Nombre historique de trades : ordres spot + ouvertures perp. Pour les
   * comptes créés avant l'historique perp, un solde modifié constitue une
   * preuve certaine d'au moins une activité et vaut donc un minimum de 1.
   */
  tradeCountOf(userId: string): number {
    const balances = this.requireBalances(userId);
    const recorded =
      (this.store.getOrders(userId)?.length ?? 0) +
      (this.store.getPerpOrders(userId)?.length ?? 0);
    if (recorded > 0) return recorded;
    const openPositions = this.store.getPositions(userId)?.length ?? 0;
    if (openPositions > 0) return openPositions;
    return this.hasInitialBalances(balances) ? 0 : 1;
  }

  /** Equity du compte (soldes spot + PnL des positions ouvertes). */
  equityOf(userId: string, prices: PriceMap): number {
    const balances = this.requireBalances(userId);
    const positions = this.store.getPositions(userId) ?? [];
    return equityWithPositions(balances, positions, prices, QUOTE_CURRENCY);
  }

  /** PnL du compte vs capital de départ. */
  pnlOf(userId: string, prices: PriceMap): number {
    return pnl(this.equityOf(userId, prices), this.startingEquity);
  }

  /**
   * Portefeuille agrégé : chaque devise détenue valorisée en devise de référence,
   * plus l'equity totale (soldes + PnL des positions) et le PnL. La valorisation
   * par devise réutilise `equity` du domaine → une seule règle de prix.
   */
  portfolioOf(userId: string, prices: PriceMap): Portfolio {
    const balances = this.requireBalances(userId);
    const positions = this.store.getPositions(userId) ?? [];
    const orders = this.store.getOrders(userId) ?? [];
    const holdings = Object.entries(balances).map(([currency, amount]) => {
      const value = equity({ [currency]: amount }, prices, QUOTE_CURRENCY);
      const averagePrice = spotAveragePrice(currency, orders);
      const costBasis = averagePrice === null ? null : averagePrice * amount;
      return {
        currency,
        amount,
        value,
        costBasis,
        averagePrice,
        unrealizedPnl: costBasis === null ? null : value - costBasis,
      };
    });
    const equityValue = equityWithPositions(balances, positions, prices, QUOTE_CURRENCY);
    return {
      balances,
      holdings,
      equity: equityValue,
      pnl: pnl(equityValue, this.startingEquity),
    };
  }

  /**
   * Classement des comptes sélectionnés. Le filtre est appliqué avant le calcul
   * des rangs : les profils techniques ne peuvent donc pas déformer le rang des
   * utilisateurs visibles sur les surfaces publiques.
   */
  leaderboard(
    prices: PriceMap,
    includeUser: (userId: string) => boolean = () => true,
  ): LeaderboardEntry[] {
    return buildLeaderboard(
      this.store.snapshots().filter((account) => includeUser(account.userId)),
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

  private hasInitialBalances(balances: Balances): boolean {
    const currencies = Object.keys(balances);
    return (
      currencies.length === 1 &&
      currencies[0] === QUOTE_CURRENCY &&
      balances[QUOTE_CURRENCY] === this.startingEquity
    );
  }
}

/**
 * Coût moyen pondéré des unités spot encore détenues. Une vente retire du coût
 * au prix moyen historique : son produit ne doit jamais être pris pour du PnL
 * latent des unités restantes.
 */
function spotAveragePrice(currency: string, orders: readonly Fill[]): number | null {
  if (currency === QUOTE_CURRENCY) {
    return null;
  }
  let quantity = 0;
  let cost = 0;
  for (const fill of orders) {
    if (fill.pair.base !== currency || fill.pair.quote !== QUOTE_CURRENCY) {
      continue;
    }
    if (fill.side === "buy") {
      quantity += fill.amount;
      cost += fill.quoteAmount;
      continue;
    }
    if (quantity <= 0) {
      continue;
    }
    const sold = Math.min(fill.amount, quantity);
    cost -= (cost / quantity) * sold;
    quantity -= sold;
    if (quantity < Number.EPSILON) {
      quantity = 0;
      cost = 0;
    }
  }
  return quantity > 0 ? cost / quantity : null;
}
