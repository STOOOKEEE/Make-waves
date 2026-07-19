import { describe, expect, it } from "vitest";
import { PaperService } from "../src/services/paper-service";
import {
  PORTFOLIO_MANAGER_AGENT_ID,
  PortfolioManagerService,
} from "../src/services/portfolio-manager-service";
import { InMemoryAgentStore } from "../src/store/agent-store";
import { InMemoryAgentActionsStore } from "../src/store/agent-actions-store";
import { InMemoryPaperWalletStore } from "../src/store/paper-wallet-store";

async function setup() {
  const paper = new PaperService();
  const agents = new InMemoryAgentStore();
  const actions = new InMemoryAgentActionsStore();
  const wallets = new InMemoryPaperWalletStore();
  for (const [index, userId] of ["paper:a", "paper:b", "paper:c"].entries()) {
    paper.openAccount(userId);
    await wallets.create({
      userId,
      address: `rWallet${String(index)}`,
      encryptedSeed: "encrypted",
      masterKeyId: "v1",
      status: index === 2 ? "pending_funding" : "funded",
      fundingTxHash: index === 2 ? null : `hash-${String(index)}`,
      fundedAt: index === 2 ? null : 1,
      createdAt: index,
    });
  }
  let nextId = 0;
  const service = new PortfolioManagerService({
    paper,
    agents,
    actions,
    wallets,
    getPrices: () => ({ XRP: 1, BTC: 50_000, ETH: 2_000, SOL: 100, BNB: 500 }),
    now: () => 1_000,
    newId: () => `id-${String(++nextId)}`,
  });
  return { paper, agents, actions, service };
}

describe("PortfolioManagerService", () => {
  it("prépare un batch diversifié uniquement pour les wallets financés, sans LLM", async () => {
    const { agents, service } = await setup();
    const plan = await service.prepare([]);

    expect(plan.llmCalls).toBe(0);
    expect(plan.trades).toHaveLength(2);
    expect(new Set(plan.trades.map((trade) => trade.notionalUsd)).size).toBe(2);
    expect((await service.status()).maxAccountsPerCycle).toBe(300);
    expect(plan.trades.map((trade) => trade.userId).sort()).toEqual(["paper:a", "paper:b"]);
    expect(await agents.get(PORTFOLIO_MANAGER_AGENT_ID)).toMatchObject({
      name: "Tide Portfolio Manager",
      status: "active",
    });
  });

  it("refuse un wallet non financé", async () => {
    const { service } = await setup();
    await expect(service.prepare(["paper:c"])).rejects.toThrow("Wallet non financé");
  });

  it("exige la confirmation puis ouvre et audite une position par compte", async () => {
    const { actions, paper, service } = await setup();
    const plan = await service.prepare(["paper:a", "paper:b"]);

    await expect(service.execute(plan.id, "wrong")).rejects.toThrow("Confirmation requise");
    const result = await service.execute(plan.id, plan.confirmation);

    expect(result).toMatchObject({ requested: 2, succeeded: 2, failed: 0 });
    expect(paper.positionsOf("paper:a")).toHaveLength(1);
    expect(paper.positionsOf("paper:b")).toHaveLength(1);
    expect(await actions.listByAgent(PORTFOLIO_MANAGER_AGENT_ID)).toHaveLength(2);
    await expect(service.execute(plan.id, plan.confirmation)).rejects.toThrow("déjà exécuté");
  });
});
