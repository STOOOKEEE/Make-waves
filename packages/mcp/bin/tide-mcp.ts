#!/usr/bin/env node
import { startMcpServer } from "../src/server";

startMcpServer({
  // Ces deps seront injectées via env vars en v1 (TIDE_API_URL, TIDE_AGENT_ID, etc.)
  // Pour le MVP, le serveur MCP consomme directement les stores via des adapters.
  apiBaseUrl: process.env["TIDE_API_BASE_URL"] ?? "http://localhost:3000",
  agentId: process.env["TIDE_AGENT_ID"] ?? "",
  userId: process.env["TIDE_USER_ID"] ?? "",
}).catch((err: unknown) => {
  // stderr uniquement — ne pas polluer stdout qui porte le protocole MCP.
  console.error("[tide-mcp] fatal:", err);
  process.exit(1);
});