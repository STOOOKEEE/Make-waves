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

async function fixture(snapshots: readonly WalletLedgerSnapshot[] = [snapshot()]) {
  const store = new InMemoryPaperWalletStore();
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
  const provisioner = {
    ensureFunded: vi.fn(async (userId: string) => {
      const wallet: PaperWallet = {
        userId,
        address: `r${userId.slice(-12)}`,
        encryptedSeed: "encrypted-generated",
        masterKeyId: "v1",
        status: "funded",
        fundingTxHash: `fund-${userId}`,
        fundedAt: 2,
        createdAt: 2,
      };
      await store.create(wallet);
      return wallet;
    }),
  };
  const service = new PaperWalletAdminService({
    store,
    rewards,
    wallets: { decryptSeed: vi.fn(async () => "sTestSeed") },
    provisioner,
    issuer,
    recoveryAddress: ISSUER_ADDRESS,
    network: "mainnet",
    gateway,
    metadataBaseUrl: "https://api.test",
    sleep: async () => undefined,
  });
  return { service, store, rewards, gateway, issuer, provisioner };
}

describe("PaperWalletAdminService", () => {
  it("crée et finance un lot borné de wallets techniques Mainnet", async () => {
    const { service, provisioner } = await fixture();

    const result = await service.provision(2);

    expect(result).toMatchObject({ network: "mainnet", requested: 2, funded: 2 });
    expect(result.wallets).toHaveLength(2);
    expect(result.wallets.every((wallet) => wallet.userId.startsWith("wallet:mainnet:"))).toBe(true);
    expect(provisioner.ensureFunded).toHaveBeenCalledTimes(2);
  });

  it("refuse un provisioning trop large ou non entier", async () => {
    const { service } = await fixture();
    await expect(service.provision(0)).rejects.toThrow(/entre 1 et 10/);
    await expect(service.provision(11)).rejects.toThrow(/entre 1 et 10/);
    await expect(service.provision(1.5)).rejects.toThrow(/entre 1 et 10/);
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
