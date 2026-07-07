// Meta inspection tools (read-only).
import type { ToolDef } from "./index";

export const getConfigTool: ToolDef = {
  name: "get_config",
  description:
    "Get Tide's runtime config (mode Paper/Live, sourceTag, available pairs).",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    // ctx.config est garanti non-null : le bootstrap et loadContext injectent
    // defaultPublicConfig si pas branché.
    return ctx.config;
  },
};

export const getAgentStatusTool: ToolDef = {
  name: "get_agent_status",
  description:
    "Get this agent's current status (active/paused/stopped), live account flag, last action timestamp.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: async (_args, ctx) => {
    const agent = ctx.agent;
    const actions = await ctx.actions.listByAgent(agent.id, 1);
    return {
      agentId: agent.id,
      status: agent.status,
      hasLiveAccount: agent.hasLiveAccount,
      lastAction: actions[0] ?? null,
    };
  },
};
