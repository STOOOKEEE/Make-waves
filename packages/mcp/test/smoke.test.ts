import { describe, it, expect } from "vitest";
import { MCP_PACKAGE_VERSION } from "../src/index";

describe("@tide/mcp", () => {
  it("exports a version", () => {
    expect(MCP_PACKAGE_VERSION).toBe("0.0.0");
  });
});
