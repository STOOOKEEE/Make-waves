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

function makeService(operatorUserIds: string[]) {
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
      network: "testnet",
    });
    expect(JSON.stringify(wallets)).not.toContain("secret-chiffré-interne");
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
