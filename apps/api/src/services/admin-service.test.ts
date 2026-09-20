import { describe, expect, it } from "vitest";
import { AdminService } from "./admin-service";
import { PaperService } from "./paper-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryAgentStore, type Agent } from "../store/agent-store";
import { InMemoryMandateStore, type Mandate } from "../store/mandate-store";
import { InMemoryAgentActionsStore } from "../store/agent-actions-store";
import type { PriceMap } from "@tide/core";
import { InMemoryPaperWalletStore } from "../store/paper-wallet-store";
import { Wallet } from "xrpl";
import type { GiveawayParticipant } from "../store/giveaway-store";

const PRICES: PriceMap = { XRP: 0.5 };

function agent(id: string, userId: string): Agent {
  return {
    id,
    userId,
    name: `agent-${id}`,
    type: "external",
    status: "active",
    hasLiveAccount: false,
    createdAt: 1,
    updatedAt: 1,
  };
}

function mandate(agentId: string, userId: string): Mandate {
  return {
    id: `m-${agentId}`,
    agentId,
    userId,
    capitalMax: 1000,
    perteMaxJour: 100,
    maxTradesPerDay: 10,
    maxLeverage: 3,
    pairesAutorisees: ["XRP"],
    style: null,
    validUntil: Number.MAX_SAFE_INTEGER,
    signedAt: 1,
    signature: "sig",
    status: "active",
  };
}

function makeService(
  operatorUserIds: string[],
  addressesWithNfts?: (addresses: readonly string[]) => Promise<ReadonlySet<string>>,
  giveawayParticipants?: readonly GiveawayParticipant[],
  addressesWithFirstTradeNftAndTaggedTx?: (addresses: readonly string[]) => Promise<ReadonlySet<string>>,
) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  const agents = new InMemoryAgentStore();
  const mandates = new InMemoryMandateStore();
  const actions = new InMemoryAgentActionsStore();
  const paperWallets = new InMemoryPaperWalletStore();
  const paperRewardWallets = new InMemoryPaperWalletStore();
  const service = new AdminService({
    paper,
    agents,
    mandates,
    actions,
    prizePoolAddress: "rPrizePoolXXXXXXXXXXXXXXXXXXXXXXXXX",
    operatorUserIds: new Set(operatorUserIds),
    paperWallets,
    paperRewardWallets,
    ...(addressesWithNfts === undefined && addressesWithFirstTradeNftAndTaggedTx === undefined
      ? {}
      : {
          paperWalletNftInventory: {
            addressesWithNfts: addressesWithNfts ?? (async () => new Set<string>()),
            ...(addressesWithFirstTradeNftAndTaggedTx === undefined
              ? {}
              : { addressesWithFirstTradeNftAndTaggedTx }),
          },
        }),
    ...(giveawayParticipants === undefined
      ? {}
      : { giveaway: { adminList: async () => giveawayParticipants } }),
  });
  return { paper, agents, mandates, actions, paperWallets, paperRewardWallets, service };
}

describe("AdminService.overview", () => {
  it("classe les comptes par origine avec précédence operator > agent > frontend", async () => {
    const { paper, agents, service } = makeService(["me", "me-with-agent"]);
    paper.openAccount("me"); // operator (allowlist)
    paper.openAccount("visitor"); // frontend
    paper.openAccount("agentOwner"); // agent (owner d'un agent)
    paper.openAccount("me-with-agent"); // operator (gagne malgré l'agent)
    await agents.create(agent("a1", "agentOwner"));
    await agents.create(agent("a2", "me-with-agent"));

    const overview = await service.overview(PRICES);
    const segOf = (userId: string) =>
      overview.users.find((u) => u.userId === userId)?.segment;

    expect(segOf("me")).toBe("operator");
    expect(segOf("me-with-agent")).toBe("operator");
    expect(segOf("agentOwner")).toBe("agent");
    expect(segOf("visitor")).toBe("frontend");
  });

  it("totalise la population : somme des segments = total users", async () => {
    const { paper, agents, service } = makeService(["me"]);
    paper.openAccount("me");
    paper.openAccount("visitor1");
    paper.openAccount("visitor2");
    paper.openAccount("agentOwner");
    await agents.create(agent("a1", "agentOwner"));

    const { totals } = await service.overview(PRICES);

    expect(totals.users).toBe(4);
    expect(totals.bySegment.operator).toBe(1);
    expect(totals.bySegment.agent).toBe(1);
    expect(totals.bySegment.frontend).toBe(2);
    expect(
      totals.bySegment.operator + totals.bySegment.agent + totals.bySegment.frontend,
    ).toBe(totals.users);
    expect(totals.agents.total).toBe(1);
    expect(totals.agents.active).toBe(1);
    expect(totals.activeUsers).toBeNull();
    expect(totals.fundedWalletsWithNft).toBeNull();
  });

  it("déduplique Paper, externe et giveaway dans le compteur admin", async () => {
    const externalGiveaway = Wallet.generate().classicAddress;
    const participant = (userId: string, walletAddress: string): GiveawayParticipant => ({
      profile: {
        operationId: "airpods-max-2026",
        userId,
        walletAddress,
        xHandle: userId.replace(/[^a-z]/gi, "").toLowerCase().slice(0, 5) || "user",
        termsVersion: "2026-09-11",
        acceptedAt: 1,
      },
      entries: [],
    });
    const { paper, paperWallets, service } = makeService([], undefined, [
      participant("paper:base", "rBase"),
      participant("paper:giveaway-only", "rGiveaway"),
      participant(externalGiveaway, externalGiveaway),
    ]);
    paper.openAccount("paper:base");
    await paperWallets.create({
      userId: "paper:wallet-only",
      address: "rWalletOnly",
      encryptedSeed: "hidden",
      masterKeyId: "v1",
      status: "funded",
      fundingTxHash: "FUND",
      fundedAt: 1,
      createdAt: 1,
      deleteTxHash: null,
    });

    const overview = await service.overview(PRICES);

    expect(new Set(overview.users.map((user) => user.userId)).size).toBe(4);
    expect(overview.totals.users).toBe(4);
    expect(overview.totals.userSources).toEqual({ paper: 2, external: 0, giveaway: 2 });
    expect(
      overview.totals.userSources.paper +
        overview.totals.userSources.external +
        overview.totals.userSources.giveaway,
    ).toBe(overview.totals.users);
  });

  it("compte sur XRPL les wallets financés détenant au moins un NFT", async () => {
    const seen: string[][] = [];
    const { paper, paperWallets, paperRewardWallets, service } = makeService([], async (addresses) => {
      seen.push([...addresses]);
      return new Set(["rWithNft"]);
    });
    paper.openAccount("paper:with-nft");
    paper.openAccount("paper:without-nft");
    paper.openAccount("paper:not-funded");
    for (const [userId, address, status] of [
      ["paper:with-nft", "rWithNft", "funded"],
      ["paper:without-nft", "rWithoutNft", "funded"],
      ["paper:not-funded", "rPending", "pending_funding"],
    ] as const) {
      await paperWallets.create({
        userId, address, encryptedSeed: "encrypted", masterKeyId: "v1", status,
        fundingTxHash: status === "funded" ? `fund-${address}` : null,
        fundedAt: status === "funded" ? 1 : null,
        createdAt: 1,
        deleteTxHash: null,
      });
    }
    await paperRewardWallets.create({
      userId: "paper:with-nft",
      address: "rRewardWithNft",
      encryptedSeed: "encrypted",
      masterKeyId: "v1",
      status: "funded",
      fundingTxHash: "linked-fund",
      fundedAt: 2,
      createdAt: 2,
      deleteTxHash: null,
    });

    const overview = await service.overview(PRICES);

    expect(seen).toEqual([["rWithNft", "rWithoutNft", "rRewardWithNft"]]);
    expect(overview.totals.fundedWalletsWithNft).toBe(1);
  });

  it("ne compte comme actif qu'un wallet financé avec First Trade et tx taggée", async () => {
    const externalAddress = Wallet.generate().classicAddress;
    const seen: string[][] = [];
    const { paper, paperWallets, paperRewardWallets, service } = makeService(
      [],
      undefined,
      undefined,
      async (addresses) => {
        seen.push([...addresses]);
        return new Set(["rFirstTrade", "rLegacyFirstTrade", externalAddress]);
      },
    );
    paper.openAccount("paper:first-trade");
    paper.openAccount("paper:other-nft");
    paper.openAccount("paper:pending");
    paper.openAccount(externalAddress);
    for (const [userId, address, status] of [
      ["paper:first-trade", "rFirstTrade", "funded"],
      ["paper:other-nft", "rOtherNft", "funded"],
      ["paper:pending", "rPending", "pending_funding"],
    ] as const) {
      await paperWallets.create({
        userId, address, encryptedSeed: "encrypted", masterKeyId: "v1", status,
        fundingTxHash: status === "funded" ? `fund-${address}` : null,
        fundedAt: status === "funded" ? 1 : null,
        createdAt: 1,
        deleteTxHash: null,
      });
    }
    await paperRewardWallets.create({
      userId: "paper:first-trade",
      address: "rLegacyFirstTrade",
      encryptedSeed: "encrypted",
      masterKeyId: "v1",
      status: "funded",
      fundingTxHash: "legacy-fund",
      fundedAt: 2,
      createdAt: 2,
      deleteTxHash: null,
    });

    const overview = await service.overview(PRICES);

    expect(new Set(seen[0])).toEqual(new Set(["rFirstTrade", "rOtherNft", "rLegacyFirstTrade", externalAddress]));
    expect(overview.totals.activeUsers).toBe(3);
  });

  it("compte un ordre perp fermé tout en gardant zéro position ouverte", async () => {
    const { paper, service } = makeService([]);
    paper.openAccount("paper:perp");
    const position = paper.openPosition("paper:perp", {
      product: "perp", symbol: "XRP", side: "long", qty: 10,
      entry: 0.5, leverage: 1, margin: 5, fee: 0,
    });
    paper.closePosition("paper:perp", position.id, { XRP: 0.6 });

    const user = (await service.overview(PRICES)).users.find(
      (row) => row.userId === "paper:perp",
    );
    expect(user).toMatchObject({ orders: 1, positions: 0 });
  });

  it("expose le mandat actif et la dernière action d'un agent", async () => {
    const { paper, agents, mandates, actions, service } = makeService([]);
    paper.openAccount("owner");
    await agents.create(agent("a1", "owner"));
    await mandates.create(mandate("a1", "owner"));
    await actions.record({
      id: "act1",
      agentId: "a1",
      userId: "owner",
      toolName: "place_order",
      toolParams: "{}",
      result: "ok",
      error: null,
      idempotencyKey: null,
      executedAt: 42,
    });

    const { agents: rows } = await service.overview(PRICES);
    const row = rows.find((a) => a.id === "a1");

    expect(row?.mandate?.capitalMax).toBe(1000);
    expect(row?.mandate?.maxLeverage).toBe(3);
    expect(row?.lastAction?.toolName).toBe("place_order");
    expect(row?.lastAction?.executedAt).toBe(42);
  });

  it("liste le prize pool dans les wallets", async () => {
    const { service } = makeService([]);
    const { wallets } = await service.overview(PRICES);
    expect(wallets).toContainEqual({
      address: "rPrizePoolXXXXXXXXXXXXXXXXXXXXXXXXX",
      kind: "prize_pool",
      agentId: null,
      userId: null,
      live: true,
      status: null,
      network: null,
      fundingTxHash: null,
      fundedAt: null,
      createdAt: null,
      deleteTxHash: null,
    });
  });

  it("liste les wallets Paper sans exposer leur seed chiffrée", async () => {
    const { paperWallets, service } = makeService([]);
    await paperWallets.create({
      userId: "paper:user-1",
      address: "rPaperWalletXXXXXXXXXXXXXXXXXXXXXXXX",
      encryptedSeed: "secret-chiffré-interne",
      masterKeyId: "paper-v1",
      status: "funded",
      fundingTxHash: "ABC",
      fundedAt: 10,
      createdAt: 10,
      deleteTxHash: null,
    });

    const { wallets } = await service.overview(PRICES);

    expect(wallets).toContainEqual({
      address: "rPaperWalletXXXXXXXXXXXXXXXXXXXXXXXX",
      kind: "paper",
      agentId: null,
      userId: "paper:user-1",
      live: false,
      status: "funded",
      network: "mainnet",
      fundingTxHash: "ABC",
      fundedAt: 10,
      createdAt: 10,
      deleteTxHash: null,
    });
    expect(JSON.stringify(wallets)).not.toContain("secret-chiffré-interne");
  });

  it("sépare un compte XRPL connecté du wallet Paper custodial", async () => {
    const externalAddress = Wallet.generate().classicAddress;
    const { paper, service } = makeService([]);
    paper.openAccount(externalAddress);

    const { wallets } = await service.overview(PRICES);

    expect(wallets).toContainEqual(expect.objectContaining({
      address: externalAddress,
      kind: "external",
      userId: externalAddress,
      live: true,
      status: null,
      network: "mainnet",
    }));
    expect(wallets.filter((wallet) => wallet.kind === "paper" && wallet.userId === externalAddress)).toHaveLength(0);
  });

  it("expose le wallet 2 avec un rôle distinct sans seed", async () => {
    const { paper, paperRewardWallets, service } = makeService([]);
    paper.openAccount("paper:reward-row");
    await paperRewardWallets.create({
      userId: "paper:reward-row",
      address: "rRewardRow",
      encryptedSeed: "secret-reward",
      masterKeyId: "v1",
      status: "funded",
      fundingTxHash: "REWARD_FUND",
      fundedAt: 2,
      createdAt: 2,
      deleteTxHash: null,
    });

    const { wallets } = await service.overview(PRICES);
    expect(wallets).toContainEqual(expect.objectContaining({
      address: "rRewardRow",
      kind: "paper",
      walletRole: "reward",
      userId: "paper:reward-row",
    }));
    expect(JSON.stringify(wallets)).not.toContain("secret-reward");
  });

  it("affiche chaque compte Paper même si son wallet n'est pas encore créé", async () => {
    const { paper, paperWallets, service } = makeService([]);
    paper.openAccount("paper:with-wallet");
    paper.openAccount("paper:without-wallet");
    await paperWallets.create({
      userId: "paper:with-wallet",
      address: "rExistingWallet",
      encryptedSeed: "hidden",
      masterKeyId: "v1",
      status: "funded",
      fundingTxHash: "FUND_TX",
      fundedAt: 20,
      createdAt: 10,
      deleteTxHash: null,
    });

    const { wallets } = await service.overview(PRICES);
    const rows = wallets.filter((wallet) => wallet.kind === "paper");

    expect(rows).toHaveLength(2);
    expect(rows.find((wallet) => wallet.userId === "paper:with-wallet")).toMatchObject({
      status: "funded",
      fundingTxHash: "FUND_TX",
    });
    expect(rows.find((wallet) => wallet.userId === "paper:without-wallet")).toMatchObject({
      address: null,
      status: "not_created",
      fundingTxHash: null,
    });
  });

  it("exclut l'arène de charge mais compte les wallets gérés comme agents", async () => {
    const { paper, agents, mandates, actions } = makeService([]);
    paper.openAccount("visitor");
    paper.openAccount("sim:arena:001");
    paper.openAccount("sim:arena:002");
    paper.openAccount("wallet:mainnet:managed-agent");
    const service = new AdminService({
      paper,
      agents,
      mandates,
      actions,
      prizePoolAddress: null,
      operatorUserIds: new Set(),
    });

    const overview = await service.overview(PRICES);

    expect(overview.totals.users).toBe(2);
    expect(overview.totals.bySegment).toMatchObject({ agent: 1, frontend: 1 });
    expect(overview.users.map((user) => user.userId).sort()).toEqual([
      "visitor",
      "wallet:mainnet:managed-agent",
    ]);
  });
});

describe("AdminService.deleteInactiveUsers", () => {
  it("supprime un compte vierge et son adresse locale non financée", async () => {
    const { paper, paperWallets, service } = makeService([]);
    paper.openAccount("paper:empty");
    await paperWallets.create({
      userId: "paper:empty",
      address: "rEmpty",
      encryptedSeed: "encrypted",
      masterKeyId: "v1",
      status: "pending_funding",
      fundingTxHash: null,
      fundedAt: null,
      createdAt: 1,
      deleteTxHash: null,
    });

    await expect(service.deleteInactiveUsers(
      ["paper:empty"],
      "DELETE 1 INACTIVE PAPER ACCOUNTS",
    )).resolves.toMatchObject({ deleted: 1, walletRowsDeleted: 1 });
    expect(await paperWallets.get("paper:empty")).toBeNull();
    expect(paper.leaderboard(PRICES)).toEqual([]);
  });

  it("refuse un compte ayant tradé, un wallet financé et un compte agent", async () => {
    const { paper, agents, paperWallets, service } = makeService([]);
    paper.openAccount("paper:traded");
    paper.placeOrder("paper:traded", {
      pair: { base: "XRP", quote: "RLUSD" }, side: "buy", amount: 1, price: 0.5,
    });
    paper.openAccount("paper:funded");
    await paperWallets.create({
      userId: "paper:funded", address: "rFunded", encryptedSeed: "encrypted",
      masterKeyId: "v1", status: "funded", fundingTxHash: "HASH", fundedAt: 1, createdAt: 1, deleteTxHash: null
    });
    paper.openAccount("paper:agent");
    await agents.create(agent("a-delete", "paper:agent"));

    await expect(service.deleteInactiveUsers(
      ["paper:traded"], "DELETE 1 INACTIVE PAPER ACCOUNTS",
    )).rejects.toThrow(/non vierge/);
    await expect(service.deleteInactiveUsers(
      ["paper:funded"], "DELETE 1 INACTIVE PAPER ACCOUNTS",
    )).rejects.toThrow(/déjà actif/);
    await expect(service.deleteInactiveUsers(
      ["paper:agent"], "DELETE 1 INACTIVE PAPER ACCOUNTS",
    )).rejects.toThrow(/lié à un agent/);
  });
});
