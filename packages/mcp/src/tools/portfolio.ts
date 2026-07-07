// Outils portefeuille — délégateurs vers ctx.paper (impl dans @tide/api).
import type { ToolDef } from "./index";
import { clampLimit } from "./market";

export const getBalanceTool: ToolDef = {
  name: "get_balance",
  description: "Get the spot balances of the user (currency → amount).",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    const balances = await ctx.paper.getBalance(ctx.userId);
    return { balances };
  },
};

export const getPortfolioTool: ToolDef = {
  name: "get_portfolio",
  description: "Get the user's full portfolio: balances + equity + PnL.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    return await ctx.paper.getPortfolio(ctx.userId);
  },
};

export const getPositionsTool: ToolDef = {
  name: "get_positions",
  description: "Get the user's open perpetual positions.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    const positions = await ctx.paper.listPositions(ctx.userId);
    return { positions };
  },
};

export const getLeaderboardTool: ToolDef = {
  name: "get_leaderboard",
  description: "Get the global leaderboard (top traders by equity).",
  inputSchema: {
    type: "object",
    properties: { limit: { type: "number", minimum: 1, maximum: 100, default: 20 } },
  },
  handler: async (args, ctx) => {
    const limit = clampLimit(args["limit"], 20, 1, 100);
    const entries = await ctx.paper.getLeaderboard(limit);
    return { entries };
  },
};