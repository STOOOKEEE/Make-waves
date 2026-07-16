import { describe, expect, it } from "vitest";
import { Wallet } from "xrpl";
import { InMemoryAgentStore } from "../store/agent-store";
import { InMemoryMandateStore } from "../store/mandate-store";
import { InMemoryWeeklyRewardStore } from "../store/weekly-reward-store";
import { AgentService } from "../services/agent-service";
import { PaperService } from "../services/paper-service";
import { TestnetE2EFlowRunner } from "./testnet-e2e-runner";
import { isTechnicalTestUserId } from "./arena-ids";

const TEST_ISSUER_SEED = Wallet.generate().seed ?? (() => { throw new Error("missing test seed"); })();

describe("TestnetE2EFlowRunner", () => {
  it("enchaîne le wallet faucet, l'agent LLM, l'ordre Paper et le claim NFT", async () => {
    const paper = new PaperService(1_000);
    const agentsStore = new InMemoryAgentStore();
    const mandates = new InMemoryMandateStore();
    let funded = 0;
    let recorded = 0;
    let claimed = 0;
    const runner = new TestnetE2EFlowRunner({
      config: {
        users: 1,
        wssUrl: "wss://s.altnet.rippletest.net:51233",
        issuerSeed: TEST_ISSUER_SEED,
        sourceTag: 123,
        metadataBaseUrl: "https://api.example.test",
      },
      paper,
      agents: new AgentService(agentsStore, mandates),
      mandates,
      chatCtx: async () => ({}) as never,
      chat: {
        async *stream(input) {
          paper.placeOrder(input.userId, {
            pair: { base: "XRP", quote: "RLUSD" }, side: "buy", amount: 10, price: 0.5,
          });
          yield { type: "done" as const };
        },
      },
      weeklyRewardsStore: new InMemoryWeeklyRewardStore(),
      walletProvider: {
        async fundWallet() {
          funded += 1;
          return { address: "rTestnetWallet", seed: "sEdTestnetSeed" };
        },
      },
      weeklyRewards: {
        async recordTrade() { recorded += 1; },
        async claim() {
          claimed += 1;
          return { week: "2026-07-13", qualifiedAt: 1, status: "claimed" as const, nftTokenId: "NFT", claimedAt: 1 };
        },
      },
      now: () => 1_784_073_600_000,
    });

    const status = await runner.run();

    expect(status).toMatchObject({ state: "succeeded", completedUsers: 1 });
    expect(funded).toBe(1);
    expect(recorded).toBe(1);
    expect(claimed).toBe(1);
    const technical = paper.leaderboard({ XRP: 0.5 })[0]?.userId;
    expect(technical).toBeDefined();
    expect(isTechnicalTestUserId(technical ?? "")).toBe(true);
  });

  it("échoue explicitement si le LLM n'appelle pas place_order", async () => {
    const paper = new PaperService(1_000);
    const mandates = new InMemoryMandateStore();
    const runner = new TestnetE2EFlowRunner({
      config: {
        users: 1, wssUrl: "wss://s.altnet.rippletest.net:51233",
        issuerSeed: TEST_ISSUER_SEED, sourceTag: 123,
        metadataBaseUrl: "https://api.example.test",
      },
      paper,
      agents: new AgentService(new InMemoryAgentStore(), mandates),
      mandates,
      chatCtx: async () => ({}) as never,
      chat: { async *stream() { yield { type: "done" as const }; } },
      weeklyRewardsStore: new InMemoryWeeklyRewardStore(),
      walletProvider: { async fundWallet() { return { address: "rTestnetWallet", seed: "sEdTestnetSeed" }; } },
      weeklyRewards: {
        async recordTrade() { throw new Error("should not run"); },
        async claim() { throw new Error("should not run"); },
      },
    });

    const status = await runner.run();

    expect(status).toMatchObject({ state: "failed", completedUsers: 0 });
    expect(status.lastError).toContain("LLM agent did not place");
  });
});
