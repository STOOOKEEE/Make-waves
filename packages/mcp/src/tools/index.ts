// Outils MCP — Tasks 11+ peuplent ce tableau.
import type { McpContext } from "../types";
import { getMarketTool } from "./market";

export interface ToolDef {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  handler(args: Record<string, unknown>, ctx: McpContext): Promise<unknown>;
}

export const tools: readonly ToolDef[] = [getMarketTool];