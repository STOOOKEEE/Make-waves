import { describe, it, expect } from "vitest";
import { McpError, sanitizeError, ERROR_CODES } from "../src/lib/errors";

describe("McpError", () => {
  it("carries code + message + optional details", () => {
    const err = new McpError("RISK_LIMIT", "cap exceeded", { capital: 100 });
    expect(err.code).toBe("RISK_LIMIT");
    expect(err.message).toBe("cap exceeded");
    expect(err.details).toEqual({ capital: 100 });
    expect(err).toBeInstanceOf(Error);
  });
  it("toMcpCode maps internal codes to JSON-RPC codes", () => {
    expect(ERROR_CODES.INVALID_PARAMS).toBe(-32602);
    expect(ERROR_CODES.INFRA_ERROR).toBe(-32603);
    expect(ERROR_CODES.MARKET_ERROR).toBe(-32004);
    expect(ERROR_CODES.RISK_LIMIT).toBe(-32005);
    expect(ERROR_CODES.LLM_ERROR).toBe(-32006);
  });
});

describe("sanitizeError", () => {
  it("strips absolute paths from messages", () => {
    const cleaned = sanitizeError("Error at /Users/armandsechon/dev/hackathon/make-waves/apps/api/src/foo.ts:42");
    expect(cleaned).not.toContain("/Users/armandsechon");
    expect(cleaned).not.toContain("foo.ts");
  });
  it("strips hex-looking secrets (≥32 hex chars)", () => {
    const secret = "a".repeat(64); // fake 64-hex secret
    const cleaned = sanitizeError(`Key was ${secret} and it failed`);
    expect(cleaned).not.toContain(secret);
  });
  it("truncates long messages to 500 chars", () => {
    const long = "x".repeat(2000);
    const cleaned = sanitizeError(long);
    expect(cleaned.length).toBeLessThanOrEqual(500);
  });
  it("replaces newlines with spaces (LLM-safe)", () => {
    const cleaned = sanitizeError("line1\nline2\nline3");
    expect(cleaned).not.toContain("\n");
  });
});