import { describe, expect, it, vi } from "vitest";
import type { NftIssuer } from "@tide/xrpl";
import { InMemoryPaperBadgeRewardStore } from "../store/paper-badge-reward-store";
import { InMemoryPaperWalletStore, type PaperWallet } from "../store/paper-wallet-store";
import {
  DELETE_CONFIRMATION,
  PaperWalletAdminService,
  type PaperWalletAdminGateway,
  type WalletLedgerSnapshot,
} from "./paper-wallet-admin-service";

const USER_ID = "paper:admin-test-user";
const WALLET_ADDRESS = "rPaperWallet";
const ISSUER_ADDRESS = "rIssuer";
const WALLET: PaperWallet = {
  userId: USER_ID,
  address: WALLET_ADDRESS,
  encryptedSeed: "encrypted",
  masterKeyId: "v1",
  status: "funded",
  fundingTxHash: "funding",
  fundedAt: 1,
  createdAt: 1,
  deleteTxHash: null,
};

function snapshot(overrides: Partial<WalletLedgerSnapshot> = {}): WalletLedgerSnapshot {
  return {
    balanceXrp: 1.25,
    ownerCount: 0,
    sequence: 10,
    currentLedger: 1_000,
    deleteFeeDrops: "200000",
    nftIds: [],
    ...overrides,
  };
}

async function waitForJob(service: PaperWalletAdminService): Promise<void> {
  for (let attempt = 0; attempt < 20 && service.status().state === "running"; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

async function fixture(
  snapshots: readonly WalletLedgerSnapshot[] = [snapshot()],
) {
  const store = new InMemoryPaperWalletStore();
  const rewardStore = new InMemoryPaperWalletStore();
  await store.create(WALLET);
  let snapshotIndex = 0;
  const gateway: PaperWalletAdminGateway = {
    snapshot: vi.fn(async () => snapshots[Math.min(snapshotIndex++, snapshots.length - 1)] ?? snapshot()),
    burnNft: vi.fn(async () => ({ hash: "burn-hash" })),
    deleteAccount: vi.fn(async () => ({ hash: "delete-hash" })),
    acceptNft: vi.fn(async () => ({ hash: "claim-hash" })),
  };
  const issuer: NftIssuer = {
    issueBadge: vi.fn(async () => ({
      nftTokenId: "nft-id",
      sellOfferId: "offer-id",
      mintHash: "mint-hash",
      offerHash: "offer-hash",
    })),
  };
  const rewards = new InMemoryPaperBadgeRewardStore();
  const service = new PaperWalletAdminService({
    store,
    rewardStore,
    rewards,
    wallets: { decryptSeed: vi.fn(async () => "sTestSeed") },
    paperUserActivity: () => ({ exists: true, hasTraded: true }),
    badgeEligibility: () => true,
    issuer,
    recoveryAddress: ISSUER_ADDRESS,
    network: "mainnet",
    gateway,
    metadataBaseUrl: "https://api.test",
    sleep: async () => undefined,
  });
  return { service, store, rewardStore, rewards, gateway, issuer };
}

describe("PaperWalletAdminService", () => {
  it("ne crée ni ne finance un wallet pour une attribution admin", async () => {
    const { service, store, issuer } = await fixture();
    await expect(service.grantBadge("paper:missing", "first_trade")).rejects.toThrow("Wallet déjà financé requis");
    expect(await store.get("paper:missing")).toBeNull();
    await store.create({ ...WALLET, userId: "paper:pending", status: "pending_funding" });
    await expect(service.grantBadge("paper:pending", "first_trade")).rejects.toThrow("Wallet déjà financé requis");
    expect((await store.get("paper:pending"))?.status).toBe("pending_funding");
    expect(issuer.issueBadge).not.toHaveBeenCalled();
  });

  it("distribue un badge individuel et persiste le claim", async () => {
    const { service, rewards, issuer, gateway } = await fixture();

    const result = await service.grantBadge(USER_ID, "first_trade");

    expect(result).toMatchObject({
      userId: USER_ID,
      walletAddress: WALLET_ADDRESS,
      nftTokenId: "nft-id",
      claimHash: "claim-hash",
    });
    expect(issuer.issueBadge).toHaveBeenCalledWith({
      uri: "https://api.test/nft-metadata/first_trade",
      taxon: 1,
      destination: WALLET_ADDRESS,
    });
    expect(gateway.acceptNft).toHaveBeenCalledWith("sTestSeed", "offer-id");
    expect(await rewards.get(USER_ID, "first_trade")).toMatchObject({ status: "claimed" });
  });

  it("utilise le wallet principal mais récupère encore une ancienne ligne wallet 2", async () => {
    const { service, store, rewardStore, issuer } = await fixture();
    const rewardWallet = { ...WALLET, address: "rRewardWallet", fundingTxHash: "linked" };
    await rewardStore.create(rewardWallet);

    const grant = await service.grantBadge(USER_ID, "first_trade");
    expect(grant.walletAddress).toBe(WALLET_ADDRESS);
    expect(issuer.issueBadge).toHaveBeenCalledWith(expect.objectContaining({
      destination: WALLET_ADDRESS,
    }));

    await service.startReclaimOne(USER_ID, USER_ID);
    await waitForJob(service);
    expect(service.status()).toMatchObject({ state: "succeeded", total: 2, completed: 2 });
    expect((await rewardStore.get(USER_ID))?.status).toBe("reclaimed");
    expect((await store.get(USER_ID))?.status).toBe("reclaimed");
    expect((await store.get(USER_ID))?.encryptedSeed).toBe("");
  });

  it("brûle les NFT puis supprime le compte vers l'issuer", async () => {
    const { service, store, gateway } = await fixture([
      snapshot({ nftIds: ["nft-held"], ownerCount: 1 }),
      snapshot({ sequence: 11 }),
    ]);

    await service.startReclaimOne(USER_ID, USER_ID);
    await waitForJob(service);

    expect(gateway.burnNft).toHaveBeenCalledWith("sTestSeed", "nft-held");
    expect(gateway.deleteAccount).toHaveBeenCalledWith(
      "sTestSeed",
      ISSUER_ADDRESS,
      "200000",
    );
    expect(service.status()).toMatchObject({
      state: "succeeded",
      completed: 1,
      failed: 0,
      destination: ISSUER_ADDRESS,
      results: [{ state: "succeeded", recoveredXrpEstimate: 1.05, burnedNfts: 1 }],
    });
    expect((await store.get(USER_ID))?.status).toBe("reclaimed");
  });

  it("refuse une confirmation globale approximative", async () => {
    const { service } = await fixture();
    await expect(service.startReclaimAll("delete all")).rejects.toThrow(/Confirmation/);
    await expect(service.startReclaimAll(DELETE_CONFIRMATION)).resolves.toMatchObject({
      state: "running",
      total: 1,
    });
    await waitForJob(service);
  });
});
