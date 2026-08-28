/* ===== Bac à sable — validation des objectifs d'étape =====
 *
 * C'est ce qui sépare un vrai tutoriel cliquable d'un carrousel de texte :
 * chaque étape attend une action précise, et sait dire si elle a eu lieu.
 *
 * Module pur : il prend un instantané du bac à sable et rend un booléen. Aucune
 * géométrie, aucun DOM — donc entièrement testable sous happy-dom, où
 * `getBoundingClientRect()` renvoie des zéros.
 */
import type {
  SimClosed,
  SimFill,
  SimLiquidity,
  SimPosition,
  SimProduct,
  SimSide,
} from "./engine";
import { riskAtStop } from "./engine";

export type StepGoal =
  | { kind: "read" }
  | { kind: "select-market" }
  | { kind: "chart-mode"; value: "candles" | "line" }
  | { kind: "select-product"; value: SimProduct }
  | { kind: "select-order-kind"; value: "market" | "limit" }
  | { kind: "select-execution"; value: SimLiquidity }
  | { kind: "select-side"; value: SimSide }
  | { kind: "set-amount"; min: number }
  | { kind: "set-leverage"; min: number }
  | { kind: "set-take-profit" }
  | { kind: "set-stop-loss" }
  /** Dimensionner pour ne risquer au plus `maxRiskPct` % de l'équité au stop. */
  | { kind: "risk-budget"; maxRiskPct: number }
  | { kind: "place-order"; product?: SimProduct; minLeverage?: number }
  | { kind: "close-position" }
  | { kind: "accelerate" };

export interface SandboxSnapshot {
  readonly symbol: string;
  readonly product: SimProduct;
  readonly orderKind: "market" | "limit";
  readonly liquidity: SimLiquidity;
  readonly side: SimSide;
  readonly amount: number;
  readonly leverage: number;
  readonly takeProfit: number | null;
  readonly stopLoss: number | null;
  readonly chartMode: "candles" | "line";
  readonly mark: number;
  readonly equity: number;
  readonly positions: readonly SimPosition[];
  readonly fills: readonly SimFill[];
  readonly closed: readonly SimClosed[];
  /** Horodatages des « accélérer » demandés par l'utilisateur. */
  readonly accelerations: readonly number[];
  /** Nombre de fois où l'utilisateur a changé de marché. */
  readonly marketSelections: number;
}

/**
 * `since` est l'horodatage d'entrée dans l'étape, et il est indispensable :
 * sans lui, une position ouverte à l'étape 10 validerait automatiquement
 * l'étape 15. Les objectifs d'**état** lisent l'instantané ; les objectifs
 * d'**événement** ne regardent que ce qui s'est produit après `since`.
 */
export function isGoalMet(goal: StepGoal, s: SandboxSnapshot, since: number): boolean {
  switch (goal.kind) {
    case "read":
      return true;
    case "select-market":
      return s.marketSelections > 0;
    case "chart-mode":
      return s.chartMode === goal.value;
    case "select-product":
      return s.product === goal.value;
    case "select-order-kind":
      return s.orderKind === goal.value;
    case "select-execution":
      return s.liquidity === goal.value;
    case "select-side":
      return s.side === goal.value;
    case "set-amount":
      return s.amount >= goal.min;
    case "set-leverage":
      return s.product === "perp" && s.leverage >= goal.min;
    case "set-take-profit":
      return s.takeProfit !== null && s.takeProfit > 0;
    case "set-stop-loss":
      return s.stopLoss !== null && s.stopLoss > 0;
    case "risk-budget":
      return meetsRiskBudget(s, goal.maxRiskPct);
    case "place-order":
      return s.fills.some(
        (fill) =>
          fill.at > since &&
          (goal.product === undefined || fill.product === goal.product) &&
          (goal.minLeverage === undefined || fill.leverage >= goal.minLeverage),
      );
    case "close-position":
      return s.closed.some((close) => close.at > since);
    case "accelerate":
      return s.accelerations.some((at) => at > since);
  }
}

/**
 * La règle du 1 % rendue tangible : on ne compare pas la taille de position à
 * l'équité, mais **la perte encourue si le stop est touché**. L'utilisateur peut
 * la faire baisser en réduisant le montant *ou* en rapprochant le stop, et c'est
 * exactement la relation qu'il faut avoir comprise.
 */
function meetsRiskBudget(s: SandboxSnapshot, maxRiskPct: number): boolean {
  if (s.stopLoss === null || s.stopLoss <= 0 || s.amount <= 0 || s.mark <= 0) return false;
  const leverage = s.product === "perp" ? Math.max(1, s.leverage) : 1;
  const qty = (s.amount * leverage) / s.mark;
  const loss = riskAtStop({ entry: s.mark, stopLoss: s.stopLoss, qty });
  if (loss === null) return false;
  return loss <= (s.equity * maxRiskPct) / 100;
}

/** Perte au stop pour l'état courant du ticket, en devise de quote. */
export function plannedRisk(s: SandboxSnapshot): number | null {
  if (s.stopLoss === null || s.stopLoss <= 0 || s.amount <= 0 || s.mark <= 0) return null;
  const leverage = s.product === "perp" ? Math.max(1, s.leverage) : 1;
  const qty = (s.amount * leverage) / s.mark;
  return Math.abs(s.mark - s.stopLoss) * qty;
}
