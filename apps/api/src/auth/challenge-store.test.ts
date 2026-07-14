import { describe, expect, it } from "vitest";
import { InMemoryChallengeStore } from "./challenge-store";

const ADDR = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const TTL = 5 * 60_000;

describe("InMemoryChallengeStore", () => {
  it("émet un nonce non vide et le consomme une seule fois", () => {
    const store = new InMemoryChallengeStore(TTL);
    const nonce = store.issue(ADDR);
    expect(nonce).not.toBe("");
    expect(store.consume(ADDR, nonce)).toBe(true);
    // Usage unique : un second consume échoue.
    expect(store.consume(ADDR, nonce)).toBe(false);
  });

  it("rejette un nonce qui ne correspond pas", () => {
    const store = new InMemoryChallengeStore(TTL);
    store.issue(ADDR);
    expect(store.consume(ADDR, "mauvais-nonce")).toBe(false);
  });

  it("rejette un nonce expiré", () => {
    let now = 1_000;
    const store = new InMemoryChallengeStore(TTL, () => now);
    const nonce = store.issue(ADDR);
    now += TTL + 1;
    expect(store.consume(ADDR, nonce)).toBe(false);
  });

  it("une nouvelle émission invalide le nonce précédent", () => {
    const store = new InMemoryChallengeStore(TTL);
    const first = store.issue(ADDR);
    store.issue(ADDR);
    expect(store.consume(ADDR, first)).toBe(false);
  });

  it("rejette la consommation d'une adresse sans challenge", () => {
    const store = new InMemoryChallengeStore(TTL);
    expect(store.consume(ADDR, "peu-importe")).toBe(false);
  });
});
