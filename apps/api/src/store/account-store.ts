import type { Balances, Fill } from "@tide/core";

/** Instantané d'un compte pour le leaderboard. */
export interface AccountSnapshotRow {
  readonly userId: string;
  readonly balances: Balances;
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
  /** Atomique : remplace les soldes ET ajoute le fill (cohérence garantie). */
  applyOrder(userId: string, balances: Balances, fill: Fill): void;
  /** Tous les comptes (pour le leaderboard). */
  snapshots(): AccountSnapshotRow[];
}

interface AccountRecord {
  balances: Balances;
  readonly orders: Fill[];
}

/** Implémentation en mémoire (défaut, sans dépendance). */
export class InMemoryAccountStore implements AccountStore {
  private readonly accounts = new Map<string, AccountRecord>();

  has(userId: string): boolean {
    return this.accounts.has(userId);
  }

  open(userId: string, balances: Balances): void {
    this.accounts.set(userId, { balances: { ...balances }, orders: [] });
  }

  getBalances(userId: string): Balances | undefined {
    const account = this.accounts.get(userId);
    return account === undefined ? undefined : { ...account.balances };
  }

  getOrders(userId: string): readonly Fill[] | undefined {
    const account = this.accounts.get(userId);
    return account === undefined ? undefined : [...account.orders];
  }

  applyOrder(userId: string, balances: Balances, fill: Fill): void {
    const account = this.accounts.get(userId);
    if (account === undefined) {
      return;
    }
    account.balances = { ...balances };
    account.orders.push(fill);
  }

  snapshots(): AccountSnapshotRow[] {
    return [...this.accounts.entries()].map(([userId, account]) => ({
      userId,
      balances: { ...account.balances },
    }));
  }
}
