import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limiter";

describe("createRateLimiter (fenêtre fixe)", () => {
  it("autorise jusqu'à max puis refuse dans la fenêtre", () => {
    const now = 0;
    const rl = createRateLimiter(3, 1000, () => now);
    expect(rl.hit("ip")).toBe(true);
    expect(rl.hit("ip")).toBe(true);
    expect(rl.hit("ip")).toBe(true);
    expect(rl.hit("ip")).toBe(false); // 4e dans la fenêtre
  });

  it("réinitialise après la fenêtre", () => {
    let now = 0;
    const rl = createRateLimiter(1, 1000, () => now);
    expect(rl.hit("ip")).toBe(true);
    expect(rl.hit("ip")).toBe(false);
    now += 1000;
    expect(rl.hit("ip")).toBe(true);
  });

  it("compte chaque clé indépendamment", () => {
    const now = 0;
    const rl = createRateLimiter(1, 1000, () => now);
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("b")).toBe(true);
    expect(rl.hit("a")).toBe(false);
  });
});
