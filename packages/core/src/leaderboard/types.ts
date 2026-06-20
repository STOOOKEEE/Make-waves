import type { Balances } from "../paper/types";

/** Portefeuille paper d'un joueur à un instant donné. */
export interface AccountSnapshot {
  readonly userId: string;
  readonly balances: Balances;
}

/** Ligne de classement : valeur du portefeuille, PnL et rang. */
export interface LeaderboardEntry {
  readonly userId: string;
  /** Equity en devise de référence. */
  readonly equity: number;
  /** PnL absolu vs capital de départ. */
  readonly pnl: number;
  /** Rang 1 = meilleur (ex-aequo partagent le rang). */
  readonly rank: number;
}
