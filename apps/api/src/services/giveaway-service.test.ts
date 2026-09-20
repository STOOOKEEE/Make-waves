import { describe, expect, it } from "vitest";
import {
  GiveawayInvalidHandleError,
  GiveawayService,
  GiveawayTermsVersionError,
  GIVEAWAY_CLOSES_AT,
  GIVEAWAY_TERMS_VERSION,
} from "./giveaway-service";
import { GiveawayIdentityConflictError, InMemoryGiveawayStore } from "../store/giveaway-store";

describe("GiveawayService", () => {
  it("lie le handle au wallet, additionne le premier trade et reste idempotent", async () => {
    const service = new GiveawayService({
      store: new InMemoryGiveawayStore(),
      now: () => GIVEAWAY_CLOSES_AT - 1_000,
      resolveIdentity: async () => ({ walletAddress: "rWallet", hasFirstTrade: true }),
    });

    const first = await service.saveConsent({
      userId: "paper:user-1",
      xHandle: "@Alice",
      termsVersion: GIVEAWAY_TERMS_VERSION,
    });
    const second = await service.saveConsent({
      userId: "paper:user-1",
      xHandle: "alice",
      termsVersion: GIVEAWAY_TERMS_VERSION,
    });

    expect(first).toMatchObject({ userId: "paper:user-1", walletAddress: "rWallet", xHandle: "alice", entries: 4 });
    expect(second.entries).toBe(4);
    expect(await service.adminList()).toHaveLength(1);
  });

  it("refuse de réutiliser un wallet et ajoute le bonus quand le trade arrive après", async () => {
    let hasFirstTrade = false;
    const service = new GiveawayService({
      store: new InMemoryGiveawayStore(),
      now: () => GIVEAWAY_CLOSES_AT - 1_000,
      resolveIdentity: async () => ({ walletAddress: "rWallet", hasFirstTrade }),
    });

    await service.saveConsent({
      userId: "paper:user-1",
      xHandle: "alice",
      termsVersion: GIVEAWAY_TERMS_VERSION,
    });
    await expect(
      service.saveConsent({
        userId: "paper:user-2",
        xHandle: "bob",
        termsVersion: GIVEAWAY_TERMS_VERSION,
      }),
    ).rejects.toBeInstanceOf(GiveawayIdentityConflictError);

    hasFirstTrade = true;
    await service.recordFirstTrade("paper:user-1");
    expect((await service.status("paper:user-1")).entries).toBe(4);
  });

  it("valide le règlement et le format du handle", async () => {
    const service = new GiveawayService({
      store: new InMemoryGiveawayStore(),
      now: () => GIVEAWAY_CLOSES_AT - 1_000,
      resolveIdentity: async () => ({ walletAddress: "rWallet", hasFirstTrade: false }),
    });

    await expect(
      service.saveConsent({ userId: "paper:user", xHandle: "bad handle", termsVersion: GIVEAWAY_TERMS_VERSION }),
    ).rejects.toBeInstanceOf(GiveawayInvalidHandleError);
    await expect(
      service.saveConsent({ userId: "paper:user", xHandle: "alice", termsVersion: "old" }),
    ).rejects.toBeInstanceOf(GiveawayTermsVersionError);
  });
});
