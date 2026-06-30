import type { Balances } from "../paper/types";
import type { Position } from "../position/types";

/** Portefeuille paper d'un joueur à un instant donné. */
export interface AccountSnapshot {
  readonly userId: string;
  readonly balances: Balances;
  /** Positions ouvertes (perp). Absent = aucune (rétrocompat soldes-only). */
  readonly positions?: readonly Position[];
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
