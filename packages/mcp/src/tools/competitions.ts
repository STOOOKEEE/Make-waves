// Outils compétitions — délégateurs vers ctx.competitions (impl dans @tide/api).
// Tous auditent via recordAction (traçabilité LLM → quelle compétition a été
// lue/préparée). `join_competition` ne crée jamais une entrée directement : il
// renvoie le Payment exact à signer. L'inscription n'existe qu'après signature
// puis confirmation du hash via l'API Tide.
import { McpError } from "../lib/errors";
import { recordAction } from "../lib/audit";
import { clampLimit } from "./market";
import type { ToolDef } from "./index";

// ID de compétition / compétition tolérant (lettres/chiffres/_/-/., 1..64 chars) —
// les compétitions réelles sont des ids courts (`cup-2026`, `season-01`), mais on
// laisse une marge pour les slugs futurs.
const ID_RE = /^[A-Z0-9_.-]{1,64}$/i;

async function audit(
  ctx: { actions: import("../types").AgentActionsStore; mandate: import("../types").Mandate | null },
  toolName: string,
  params: unknown,
  result: unknown,
): Promise<void> {
  if (!ctx.mandate) return; // tools lecture-seule : audit best-effort si mandate présent
  await recordAction(ctx.actions, {
    agentId: ctx.mandate.agentId,
    userId: ctx.mandate.userId,
    toolName,
    params,
    result,
    error: null,
    idempotencyKey: null,
  });
}

function assertValidId(value: unknown, field: string): string {
  const id = String(value ?? "").trim();
  if (!ID_RE.test(id)) {
    throw new McpError("INVALID_PARAMS", `${field} required (1..64 [A-Z0-9_.-])`);
  }
  return id;
}

export const listCompetitionsTool: ToolDef = {
  name: "list_competitions",
  description: "List all open and running competitions.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    const competitions = await ctx.competitions.list();
    await audit(ctx, "list_competitions", {}, { count: competitions.length });
    return { competitions };
  },
};

export const getCompetitionTool: ToolDef = {
  name: "get_competition",
  description: "Get the live state of a competition (pot, participants, status) by id.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const id = assertValidId(args["id"], "id");
    const competition = await ctx.competitions.get(id);
    await audit(ctx, "get_competition", { id }, competition ? { id } : null);
    return { competition };
  },
};

export const joinCompetitionTool: ToolDef = {
  name: "join_competition",
  description:
    "Prepare a competition entry. Returns the exact unsigned XRP Payment; the user must sign it, and Tide only joins after the validated hash is confirmed.",
  inputSchema: {
    type: "object",
    properties: {
      competition_id: { type: "string" },
    },
    required: ["competition_id"],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const competitionId = assertValidId(args["competition_id"], "competition_id");
    const mandate = ctx.mandate;
    if (!mandate) {
      throw new McpError("MANDATE_INVALID", "No active mandate");
    }
    const auditParams = { competitionId };
    try {
      const result = await ctx.competitions.join(mandate.userId, competitionId);
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "join_competition",
        params: auditParams,
        result,
        error: null,
        idempotencyKey: null,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "join_competition",
        params: auditParams,
        result: null,
        error: message,
        idempotencyKey: null,
      });
      throw new McpError("TRADING_ERROR", message);
    }
  },
};

export const getCompetitionLeaderboardTool: ToolDef = {
  name: "get_competition_leaderboard",
  description:
    "Get the live leaderboard of a competition (top traders by equity within the competition).",
  inputSchema: {
    type: "object",
    properties: {
      competition_id: { type: "string" },
      limit: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
    required: ["competition_id"],
    additionalProperties: false,
  },
  handler: async (args, ctx) => {
    const competitionId = assertValidId(args["competition_id"], "competition_id");
    const limit = clampLimit(args["limit"], 20, 1, 100);
    const entries = await ctx.competitions.getLeaderboard(competitionId, limit);
    await audit(ctx, "get_competition_leaderboard", { competitionId, limit }, { count: entries.length });
    return { entries };
  },
};
