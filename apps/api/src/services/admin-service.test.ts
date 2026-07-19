import { describe, expect, it } from "vitest";
import { AdminService } from "./admin-service";
import { PaperService } from "./paper-service";
import { InMemoryAccountStore } from "../store/account-store";
import { InMemoryAgentStore, type Agent } from "../store/agent-store";
import { InMemoryMandateStore, type Mandate } from "../store/mandate-store";
import { InMemoryAgentActionsStore } from "../store/agent-actions-store";
import type { PriceMap } from "@tide/core";
import { ArenaSimulationService } from "../simulation/arena-simulation-service";
import { InMemoryPaperWalletStore } from "../store/paper-wallet-store";

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
) {
  const accounts = new InMemoryAccountStore();
  const paper = new PaperService(undefined, accounts);
  const agents = new InMemoryAgentStore();
  const mandates = new InMemoryMandateStore();
  const actions = new InMemoryAgentActionsStore();
  const paperWallets = new InMemoryPaperWalletStore();
  const service = new AdminService({
    paper,
    agents,
    mandates,
    actions,
    prizePoolAddress: "rPrizePoolXXXXXXXXXXXXXXXXXXXXXXXXX",
    operatorUserIds: new Set(operatorUserIds),
    paperWallets,
    ...(addressesWithNfts === undefined
      ? {}
      : { paperWalletNftInventory: { addressesWithNfts } }),
  });
  return { paper, agents, mandates, actions, paperWallets, service };
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
    expect(totals.fundedWalletsWithNft).toBeNull();
  });

  it("compte sur XRPL les wallets financés détenant au moins un NFT", async () => {
    const seen: string[][] = [];
    const { paper, paperWallets, service } = makeService([], async (addresses) => {
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
      });
    }

    const overview = await service.overview(PRICES);

    expect(seen).toEqual([["rWithNft", "rWithoutNft"]]);
    expect(overview.totals.fundedWalletsWithNft).toBe(1);
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
    });
    expect(JSON.stringify(wallets)).not.toContain("secret-chiffré-interne");
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

  it("sépare les profils de simulation des totaux humains", async () => {
    const { paper, agents, mandates, actions } = makeService([]);
    paper.openAccount("visitor");
    const arena = new ArenaSimulationService(paper, {
      users: 2,
      tradesPerTick: 1,
      tickIntervalMs: 60_000,
    });
    arena.provision();
    const service = new AdminService({
      paper,
      agents,
      mandates,
      actions,
      prizePoolAddress: null,
      operatorUserIds: new Set(),
      simulation: arena,
    });

    const overview = await service.overview(PRICES);

    expect(overview.totals.users).toBe(1);
    expect(overview.users.map((user) => user.userId)).toEqual(["visitor"]);
    expect(overview.simulation).toMatchObject({ enabled: true, provisionedUsers: 2 });
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
      masterKeyId: "v1", status: "funded", fundingTxHash: "HASH", fundedAt: 1, createdAt: 1,
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
