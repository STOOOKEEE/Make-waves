import { describe, expect, it, vi } from "vitest";
import { Wallet } from "xrpl";
import type { NftIssuer } from "@tide/xrpl";
import { BadgeService } from "../src/services/badge-service";
import { ManagedExternalWalletService } from "../src/services/managed-external-wallet-service";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import { InMemoryBadgeStore } from "../src/store/badge-store";
import { InMemoryManagedExternalWalletStore } from "../src/store/managed-external-wallet-store";
import { BADGE_CODES } from "../src/badges/catalog";

const MASTER_KEY = "11".repeat(32);

class FakeIssuer implements NftIssuer {
  readonly destinations: string[] = [];

  async issueBadge(params: { uri: string; taxon: number; destination: string }): Promise<{
    nftTokenId: string;
    sellOfferId: string;
    mintHash: string;
    offerHash: string;
  }> {
    this.destinations.push(params.destination);
    return {
      nftTokenId: "C".repeat(64),
      sellOfferId: "D".repeat(64),
      mintHash: "MINT",
      offerHash: "OFFER",
    };
  }
}

function setup() {
  const paper = new PaperService();
  const badgeStore = new InMemoryBadgeStore();
  const issuer = new FakeIssuer();
  const guard = vi.fn(async () => undefined);
  const badges = new BadgeService({
    paper,
    competition: new CompetitionService(),
    store: badgeStore,
    issuer,
    sourceTag: 2_606_210_009,
    managedClaimCodes: new Set([BADGE_CODES.FIRST_TRADE]),
    managedExternalGuard: guard,
  });
  const store = new InMemoryManagedExternalWalletStore();
  const accepted: Array<{ seed: string; offer: string }> = [];
  const service = new ManagedExternalWalletService({
    store,
    badges,
    paper,
    getPrices: () => ({ XRP: 0.5 }),
    gateway: {
      acceptNft: async (seed, offer) => {
        accepted.push({ seed, offer });
        return { hash: "CLAIM" };
      },
    },
    masterKeyHex: MASTER_KEY,
    masterKeyId: "vault-v1",
    now: () => 123,
  });
  return { service, store, badgeStore, issuer, guard, accepted };
}

describe("ManagedExternalWalletService", () => {
  it("importe une seed chiffrée sans jamais l'exposer dans le DTO", async () => {
    const { service, store } = setup();
    const generated = Wallet.generate();
    expect(generated.seed).toBeTruthy();
    const summary = await service.importSeed("Test 01", generated.seed ?? "");

    expect(summary).toMatchObject({
      address: generated.classicAddress,
      label: "Test 01",
      paperTrades: 0,
    });
    expect(JSON.stringify(summary)).not.toContain(generated.seed);
    const persisted = await store.get(generated.classicAddress);
    expect(persisted?.encryptedSeed).not.toContain(generated.seed ?? "");
    expect(persisted?.masterKeyId).toBe("vault-v1");
  });

  it("trade puis claim par le parcours externe avec signature serveur", async () => {
    const { service, issuer, guard, accepted, badgeStore } = setup();
    const generated = Wallet.generate();
    const seed = generated.seed ?? "";
    await service.importSeed("Managed", seed);

    const afterTrade = await service.recordPaperTrade(generated.classicAddress);
    expect(afterTrade.paperTrades).toBe(1);
    expect(afterTrade.badges.find((badge) => badge.code === BADGE_CODES.FIRST_TRADE)).toMatchObject({
      earned: true,
      status: "unclaimed",
    });

    const result = await service.claimBadge(generated.classicAddress, BADGE_CODES.FIRST_TRADE);
    expect(result).toMatchObject({
      address: generated.classicAddress,
      badgeCode: BADGE_CODES.FIRST_TRADE,
      claimHash: "CLAIM",
    });
    expect(issuer.destinations).toEqual([generated.classicAddress]);
    expect(guard).toHaveBeenCalledWith(
      generated.classicAddress,
      generated.classicAddress,
      BADGE_CODES.FIRST_TRADE,
    );
    expect(accepted).toEqual([{ seed, offer: "D".repeat(64) }]);
    expect(await badgeStore.get(generated.classicAddress, BADGE_CODES.FIRST_TRADE)).toMatchObject({
      status: "claimed",
      claimTxHash: "CLAIM",
    });
  });

  it("reprend une offre en attente sans remint après un échec d'accept", async () => {
    const { store } = setup();
    const paper = new PaperService();
    const badgeStore = new InMemoryBadgeStore();
    const issuer = new FakeIssuer();
    const badges = new BadgeService({
      paper,
      competition: new CompetitionService(),
      store: badgeStore,
      issuer,
      sourceTag: 2_606_210_009,
    });
    let attempts = 0;
    const service = new ManagedExternalWalletService({
      store,
      badges,
      paper,
      getPrices: () => ({ XRP: 0.5 }),
      gateway: {
        acceptNft: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("ledger indisponible");
          return { hash: "CLAIM-RETRY" };
        },
      },
      masterKeyHex: MASTER_KEY,
      masterKeyId: "vault-v1",
    });
    const generated = Wallet.generate();
    await service.importSeed("Retry", generated.seed ?? "");
    await service.recordPaperTrade(generated.classicAddress);

    await expect(
      service.claimBadge(generated.classicAddress, BADGE_CODES.FIRST_TRADE),
    ).rejects.toThrow("ledger indisponible");
    await expect(
      service.claimBadge(generated.classicAddress, BADGE_CODES.FIRST_TRADE),
    ).resolves.toMatchObject({ claimHash: "CLAIM-RETRY" });
    expect(issuer.destinations).toHaveLength(1);
  });

  it("efface uniquement la custody et conserve le compte et ses preuves", async () => {
    const { service, store } = setup();
    const generated = Wallet.generate();
    await service.importSeed("À retirer", generated.seed ?? "");

    await expect(service.remove(generated.classicAddress, "wrong")).rejects.toThrow(
      "Confirmation",
    );
    await expect(
      service.remove(generated.classicAddress, generated.classicAddress),
    ).resolves.toEqual({ deleted: true });
    expect(await store.get(generated.classicAddress)).toBeNull();
  });
});
