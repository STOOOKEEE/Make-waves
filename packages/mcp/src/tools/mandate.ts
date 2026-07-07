// Mandate inspection tools (read-only).
import type { ToolDef } from "./index";

export const getMandateTool: ToolDef = {
  name: "get_mandate",
  description:
    "Get the active mandate for this agent (capital, perte, trades, leviers, paires).",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    // loadContext lance MANDATE_INVALID si pas de mandate, mais on garde
    // une branche défensive pour les appels directs (ex. tests).
    const mandate = ctx.mandate;
    if (!mandate) return { mandate: null };
    return { mandate };
  },
};

export const getRiskLimitsTool: ToolDef = {
  name: "get_risk_limits",
  description:
    "Get current usage: capital engaged, perte today, trades today, remaining budget.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    const mandate = ctx.mandate;
    if (!mandate) return { mandate: null };
    const tradesToday = await ctx.actions.countToday(
      mandate.agentId,
      mandate.userId,
    );
    return {
      capitalMax: mandate.capitalMax,
      // capitalEngaged / perteJour : calculés côté backend (snapshots positions
      // + PnL réalisé du jour). Pas encore câblés — placeholder 0 honnête
      // jusqu'à la Tâche câblage runtime.
      capitalEngaged: 0,
      perteMaxJour: mandate.perteMaxJour,
      perteJour: 0,
      maxTradesPerDay: mandate.maxTradesPerDay,
      tradesToday,
      maxLeverage: mandate.maxLeverage,
      pairesAutorisees: mandate.pairesAutorisees,
    };
  },
};
