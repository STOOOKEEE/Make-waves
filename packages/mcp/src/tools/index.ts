// Outils MCP — Tasks 11+ peuplent ce tableau.
import type { McpContext } from "../types";
import {
  getMarketTool,
  getMarketsTool,
  getHistoryTool,
  getOrderbookTool,
} from "./market";
import {
  getBalanceTool,
  getPortfolioTool,
  getPositionsTool,
  getLeaderboardTool,
} from "./portfolio";
import { placeOrderTool, cancelOrderTool } from "./trading-spot";
import { openPositionTool, closePositionTool } from "./trading-perp";

export interface ToolDef {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  handler(args: Record<string, unknown>, ctx: McpContext): Promise<unknown>;
}

export const tools: readonly ToolDef[] = [
  getMarketTool,
  getMarketsTool,
  getHistoryTool,
  getOrderbookTool,
  getBalanceTool,
  getPortfolioTool,
  getPositionsTool,
  getLeaderboardTool,
  placeOrderTool,
  cancelOrderTool,
  openPositionTool,
  closePositionTool,
];