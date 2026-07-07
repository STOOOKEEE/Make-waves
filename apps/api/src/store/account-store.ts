import type { Balances, Fill, Position } from "@tide/core";

/** Instantané d'un compte pour le leaderboard (soldes + positions ouvertes). */
export interface AccountSnapshotRow {
  readonly userId: string;
  readonly balances: Balances;
  readonly positions: readonly Position[];
}

/**
 * Persistance des comptes de paper trading. Abstraction permettant de basculer
 * entre une implémentation en mémoire et SQLite sans toucher au `PaperService`.
 * Le service garde la logique métier ; le store ne fait que stocker/lire.
 */
export interface AccountStore {
  has(userId: string): boolean;
  /** Crée un compte avec ses soldes initiaux. */
  open(userId: string, balances: Balances): void;
  /** Soldes du compte, `undefined` si le compte n'existe pas. */
  getBalances(userId: string): Balances | undefined;
  /** Ordres exécutés, `undefined` si le compte n'existe pas. */
  getOrders(userId: string): readonly Fill[] | undefined;
  /** Positions ouvertes, `undefined` si le compte n'existe pas. */
  getPositions(userId: string): readonly Position[] | undefined;
  /** Atomique : remplace les soldes ET ajoute le fill (cohérence garantie). */
  applyOrder(userId: string, balances: Balances, fill: Fill): void;
  /** Atomique : remplace les soldes (frais débités) ET ouvre la position. */
  openPosition(userId: string, balances: Balances, position: Position): void;
  /** Atomique : remplace les soldes (PnL crédité) ET retire la position. */
  closePosition(userId: string, balances: Balances, positionId: string): void;
  /** Tous les comptes (pour le leaderboard). */
  snapshots(): AccountSnapshotRow[];
}

interface AccountRecord {
  balances: Balances;
  readonly orders: Fill[];
  positions: Position[];
}

/** Implémentation en mémoire (défaut, sans dépendance). */
export class InMemoryAccountStore implements AccountStore {
  private readonly accounts = new Map<string, AccountRecord>();

  has(userId: string): boolean {
    return this.accounts.has(userId);
  }

  open(userId: string, balances: Balances): void {
    this.accounts.set(userId, { balances: { ...balances }, orders: [], positions: [] });
  }

  getBalances(userId: string): Balances | undefined {
    const account = this.accounts.get(userId);
    return account === undefined ? undefined : { ...account.balances };
  }

  getOrders(userId: string): readonly Fill[] | undefined {
    const account = this.accounts.get(userId);
    return account === undefined ? undefined : [...account.orders];
  }

  getPositions(userId: string): readonly Position[] | undefined {
    const account = this.accounts.get(userId);
    return account === undefined ? undefined : [...account.positions];
  }

  applyOrder(userId: string, balances: Balances, fill: Fill): void {
    const account = this.accounts.get(userId);
    if (account === undefined) {
      return;
    }
    account.balances = { ...balances };
    account.orders.push(fill);
  }

  openPosition(userId: string, balances: Balances, position: Position): void {
    const account = this.accounts.get(userId);
    if (account === undefined) {
      return;
    }
    account.balances = { ...balances };
    account.positions.push(position);
  }

  closePosition(userId: string, balances: Balances, positionId: string): void {
    const account = this.accounts.get(userId);
    if (account === undefined) {
      return;
    }
    account.balances = { ...balances };
    account.positions = account.positions.filter((p) => p.id !== positionId);
  }

  snapshots(): AccountSnapshotRow[] {
    return [...this.accounts.entries()].map(([userId, account]) => ({
      userId,
      balances: { ...account.balances },
      positions: [...account.positions],
    }));
  }
}
