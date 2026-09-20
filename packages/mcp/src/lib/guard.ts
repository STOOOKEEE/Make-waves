import type { Mandate } from "../types";
import { McpError } from "./errors";

export interface GuardInput {
  readonly mandate: Mandate;
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly qty: number;
  readonly leverage: number;
  readonly capitalEngaged: number;
  readonly perteJour: number;
  readonly tradesJour: number;
  readonly priceUsd: number;
}

export async function enforceRiskLimits(input: GuardInput): Promise<void> {
  const { mandate } = input;
  if (input.qty <= 0 || !Number.isFinite(input.qty)) {
    throw new McpError("INVALID_PARAMS", "qty must be positive and finite");
  }
  if (!mandate.pairesAutorisees.includes(input.symbol)) {
    throw new McpError("RISK_LIMIT",
      `Symbol ${input.symbol} not in mandate's paires_autorisees [${mandate.pairesAutorisees.join(",")}]`);
  }
  if (input.leverage < 1 || input.leverage > mandate.maxLeverage) {
    throw new McpError("RISK_LIMIT",
      `Leverage ${input.leverage} outside [1, ${mandate.maxLeverage}]`);
  }
  if (input.tradesJour + 1 > mandate.maxTradesPerDay) {
    throw new McpError("RISK_LIMIT",
      `Trades today ${input.tradesJour + 1} would exceed max ${mandate.maxTradesPerDay}`);
  }
  if (input.perteJour >= mandate.perteMaxJour) {
    throw new McpError("RISK_LIMIT",
      `Perte journalière ${input.perteJour.toFixed(2)} >= max ${mandate.perteMaxJour.toFixed(2)}`);
  }
  // Capital (marge) réellement engagé par ce trade — déjà calculé par le tool
  // appelant (perp : notionnel/levier ; spot : notionnel plein, levier 1). On le
  // borne par capitalMax. NB : borne PAR TRADE — l'engagement cumulé entre
  // positions ouvertes n'est pas suivi ici (dette assumée en paper).
  if (input.capitalEngaged > mandate.capitalMax) {
    throw new McpError("RISK_LIMIT",
      `Capital engaged ${input.capitalEngaged.toFixed(2)} exceeds mandate max ${mandate.capitalMax.toFixed(2)}`);
  }
}