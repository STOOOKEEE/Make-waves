import { describe, it, expect } from "vitest";
import { startMcpServer } from "../src/server";

describe("startMcpServer", () => {
  it("est exporté et appelable (signature : prend une config en argument)", () => {
    // On ne lance pas vraiment le serveur (bloque sur stdio),
    // on vérifie juste la signature publique.
    expect(typeof startMcpServer).toBe("function");
    expect(startMcpServer.length).toBeGreaterThanOrEqual(1);
  });
});