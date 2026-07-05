// MCP stdio server bootstrap. Tools branchés en Tasks 11+.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { McpError, ERROR_CODES, sanitizeError } from "./lib/errors";
import type { McpContext } from "./types";
import { tools as allTools } from "./tools";

export interface ServerConfig {
  readonly apiBaseUrl: string;
  readonly agentId: string;
  readonly userId: string;
}

export async function startMcpServer(config: ServerConfig): Promise<void> {
  const server = new Server(
    { name: "tide-mcp", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = allTools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
    try {
      const ctx: McpContext = {
        agent: {
          id: config.agentId,
          userId: config.userId,
          // Ces champs sont fictifs côté bootstrap — le vrai contexte viendra
          // d'une couche supérieure (loadContext) dans les Tasks suivantes.
          name: "",
          type: "external",
          status: "active",
          hasLiveAccount: false,
          createdAt: 0,
          updatedAt: 0,
        },
        userId: config.userId,
        mandate: null,
      };
      const result = await tool.handler(args ?? {}, ctx);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err) {
      const code = err instanceof McpError ? err.code : "INFRA_ERROR";
      const message = sanitizeError(
        err instanceof Error ? err.message : String(err),
      );
      const mcpCode = ERROR_CODES[code];
      return {
        content: [{ type: "text", text: `${code}: ${message}` }],
        isError: true,
        _meta: { code, mcpCode },
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Le serveur tourne jusqu'à EOF sur stdin.
}