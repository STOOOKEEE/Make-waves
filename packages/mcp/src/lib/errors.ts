/** Internal error codes — categorized so the LLM gets a meaningful message. */
export type McpErrorCode =
  | "INVALID_PARAMS"
  | "MARKET_ERROR"
  | "TRADING_ERROR"
  | "RISK_LIMIT"
  | "MANDATE_INVALID"
  | "AGENT_STOPPED"
  | "LLM_ERROR"
  | "INFRA_ERROR";

/** Mapping to JSON-RPC error codes (standard + custom). */
export const ERROR_CODES: Record<McpErrorCode, number> = {
  INVALID_PARAMS: -32602,
  MARKET_ERROR: -32004,
  TRADING_ERROR: -32004,
  RISK_LIMIT: -32005,
  MANDATE_INVALID: -32005,
  AGENT_STOPPED: -32005,
  LLM_ERROR: -32006,
  INFRA_ERROR: -32603,
};

export class McpError extends Error {
  constructor(
    public readonly code: McpErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "McpError";
  }
}

const ABS_PATH = /\/[\w./-]+\.(ts|js|tsx|jsx)(:\d+)?/g;
const HEX_SECRET = /\b[0-9a-f]{32,}\b/gi;

export function sanitizeError(message: string): string {
  let out = message;
  out = out.replace(ABS_PATH, "<internal>");
  out = out.replace(HEX_SECRET, "<redacted>");
  out = out.replace(/[\r\n]+/g, " ");
  if (out.length > 500) out = out.slice(0, 497) + "...";
  return out;
}