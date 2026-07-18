import { randomUUID } from "node:crypto";
import { Client } from "xrpl";
import { XrplCustodialWalletGateway, XrplNftIssuer } from "@tide/xrpl";
import type { AgentChatCtxFactory } from "../agent/chat-context";
import type { AgentChatEvent } from "../services/agent-chat-service";
import type { AgentService } from "../services/agent-service";
import type { PaperService } from "../services/paper-service";
import { WeeklyRewardService, weekKey } from "../services/weekly-reward-service";
import type { MandateStore } from "../store/mandate-store";
import type { PaperWallet } from "../store/paper-wallet-store";
import { TESTNET_E2E_USER_PREFIX } from "./arena-ids";

export interface TestnetE2EConfig {
  readonly users: number;
  readonly wssUrl: string;
  readonly issuerSeed: string;
  readonly sourceTag: number;
  readonly metadataBaseUrl: string;
}

export interface TestnetE2EStatus {
  readonly enabled: boolean;
  readonly state: "idle" | "running" | "succeeded" | "failed";
  readonly configuredUsers: number;
  readonly completedUsers: number;
  readonly lastRunAt: number | null;
  readonly lastError: string | null;
}

export interface TestnetE2ERunner {
  status(): TestnetE2EStatus;
  run(): Promise<TestnetE2EStatus>;
}

interface TestnetWalletCredentials {
  readonly address: string;
  readonly seed: string;
}

interface TestnetWalletProvider {
  fundWallet(): Promise<TestnetWalletCredentials>;
}

interface AgentChatRunner {
  stream(input: {
    readonly agentId: string;
    readonly userId: string;
    readonly mandate: unknown;
    readonly message: string;
    readonly systemPrompt?: string;
    readonly ctx: Awaited<ReturnType<AgentChatCtxFactory>>;
  }): AsyncGenerator<AgentChatEvent, void, void>;
}

/** Adaptateur de faucet Testnet : aucun seed ni XRP Mainnet ne passe ici. */
export class XrplTestnetFaucetWalletProvider implements TestnetWalletProvider {
  constructor(private readonly wssUrl: string) {}

  async fundWallet(): Promise<TestnetWalletCredentials> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const funded = await client.fundWallet();
      if (funded.wallet.seed === undefined) throw new Error("Testnet faucet returned no wallet seed");
      return { address: funded.wallet.classicAddress, seed: funded.wallet.seed };
    } finally {
      await client.disconnect();
    }
  }
}

/**
 * Wallets éphémères, mémoire seulement : une relance exige de nouveaux comptes
 * faucet. Les seeds Testnet ne sont donc jamais écrites dans SQLite.
 */
class EphemeralTestnetWallets {
  private readonly records = new Map<string, { wallet: PaperWallet; seed: string }>();

  constructor(private readonly provider: TestnetWalletProvider) {}

  async ensureFunded(userId: string): Promise<PaperWallet> {
    const known = this.records.get(userId);
    if (known !== undefined) return known.wallet;
    const credentials = await this.provider.fundWallet();
    const wallet: PaperWallet = {
      userId,
      address: credentials.address,
      encryptedSeed: "testnet-memory-only",
      masterKeyId: "testnet-ephemeral",
      status: "funded",
      fundingTxHash: null,
      fundedAt: Date.now(),
      createdAt: Date.now(),
    };
    this.records.set(userId, { wallet, seed: credentials.seed });
    return wallet;
  }

  async decryptSeed(wallet: PaperWallet): Promise<string> {
    const record = this.records.get(wallet.userId);
    if (record === undefined || record.wallet.address !== wallet.address) {
      throw new Error("Testnet wallet is not available in this process");
    }
    return record.seed;
  }
}

/**
 * Un run est intentionnellement manuel : il démontre le vrai parcours sans
 * transformer le démarrage du serveur en source de trafic ou de mints Testnet.
 */
export class TestnetE2EFlowRunner implements TestnetE2ERunner {
  private state: TestnetE2EStatus["state"] = "idle";
  private completedUsers = 0;
  private lastRunAt: number | null = null;
  private lastError: string | null = null;
  private running: Promise<TestnetE2EStatus> | undefined;
  private readonly wallets: EphemeralTestnetWallets;
  private readonly rewards: Pick<WeeklyRewardService, "recordTrade" | "claim">;

  constructor(
    private readonly deps: {
      readonly config: TestnetE2EConfig;
      readonly paper: PaperService;
      readonly agents: AgentService;
      readonly mandates: MandateStore;
      readonly chat: AgentChatRunner;
      readonly chatCtx: AgentChatCtxFactory;
      readonly weeklyRewardsStore: ConstructorParameters<typeof WeeklyRewardService>[0]["store"];
      readonly walletProvider?: TestnetWalletProvider;
      readonly weeklyRewards?: Pick<WeeklyRewardService, "recordTrade" | "claim">;
      readonly now?: () => number;
    },
  ) {
    this.wallets = new EphemeralTestnetWallets(
      deps.walletProvider ?? new XrplTestnetFaucetWalletProvider(deps.config.wssUrl),
    );
    const issuer = new XrplNftIssuer({
      serverUrl: deps.config.wssUrl,
      issuerSeed: deps.config.issuerSeed,
      sourceTag: deps.config.sourceTag,
    });
    // Cette gateway n'est utilisée que pour `acceptNft` ; le funding passe
    // exclusivement par le faucet Testnet ci-dessus.
    const acceptance = new XrplCustodialWalletGateway({
      serverUrl: deps.config.wssUrl,
      funderSeed: deps.config.issuerSeed,
      sourceTag: deps.config.sourceTag,
    });
    this.rewards = deps.weeklyRewards ?? new WeeklyRewardService({
      store: deps.weeklyRewardsStore,
      wallets: this.wallets,
      issuer,
      gateway: acceptance,
      metadataBaseUrl: deps.config.metadataBaseUrl,
      now: deps.now,
    });
  }

  run(): Promise<TestnetE2EStatus> {
    if (this.running !== undefined) return this.running;
    this.running = this.runOnce().finally(() => { this.running = undefined; });
    return this.running;
  }

  status(): TestnetE2EStatus {
    return {
      enabled: true,
      state: this.state,
      configuredUsers: this.deps.config.users,
      completedUsers: this.completedUsers,
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
    };
  }

  private async runOnce(): Promise<TestnetE2EStatus> {
    this.state = "running";
    this.completedUsers = 0;
    this.lastRunAt = (this.deps.now ?? Date.now)();
    this.lastError = null;
    const runId = randomUUID();
    try {
      for (let index = 0; index < this.deps.config.users; index += 1) {
        await this.runProfile(`${TESTNET_E2E_USER_PREFIX}${runId}:${String(index + 1)}`);
        this.completedUsers += 1;
      }
      this.state = "succeeded";
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : "Testnet E2E run failed";
    }
    return this.status();
  }

  private async runProfile(userId: string): Promise<void> {
    this.deps.paper.ensureAccount(userId);
    await this.wallets.ensureFunded(userId);
    const agent = await this.deps.agents.create({
      userId,
      name: "Testnet E2E verification agent",
      type: "integrated",
    });
    const now = (this.deps.now ?? Date.now)();
    const mandate = {
      id: randomUUID(), agentId: agent.id, userId, capitalMax: 100, perteMaxJour: 25,
      maxTradesPerDay: 1, maxLeverage: 1, pairesAutorisees: ["XRP"], style: "dca" as const,
      validUntil: now + 10 * 60_000, signedAt: now, signature: "testnet-e2e-operator", status: "active" as const,
    };
    await this.deps.mandates.create(mandate);
    const ctx = await this.deps.chatCtx(agent.id, userId);
    for await (const event of this.deps.chat.stream({
      agentId: agent.id,
      userId,
      mandate,
      ctx,
      systemPrompt: "You are an automated Testnet E2E verification agent. Use the available tools.",
      message: "Place exactly one small market BUY order for XRP in Paper using place_order, then stop.",
    })) {
      // Le service exécute réellement les tool calls ; le résultat est vérifié ci-dessous.
      void event;
    }
    if (this.deps.paper.ordersOf(userId).length === 0) {
      throw new Error("LLM agent did not place the required Paper order");
    }
    await this.rewards.recordTrade(userId);
    const reward = await this.rewards.claim(userId, weekKey(now));
    if (reward.status !== "claimed" || reward.nftTokenId === null) {
      throw new Error("Testnet NFT claim did not complete");
    }
  }
}
