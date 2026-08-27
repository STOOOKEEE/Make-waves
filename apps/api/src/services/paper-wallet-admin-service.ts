import { randomUUID } from "node:crypto";
import { Client, Wallet, type AccountDelete, type NFTokenBurn } from "xrpl";
import type { NftIssuer, NftIssueResult } from "@tide/xrpl";
import { badgeByCode } from "../badges/catalog";
import type { PaperBadgeRewardStore } from "../store/paper-badge-reward-store";
import type { PaperWallet, PaperWalletStore } from "../store/paper-wallet-store";
import type { PaperWalletService } from "./paper-wallet-service";

const DELETE_LEDGER_DELAY = 255;
const DELETE_CONFIRMATION = "DELETE ALL MAINNET WALLETS";
const MAX_DELETE_WAIT_MS = 45 * 60 * 1000;
const LEDGER_POLL_MS = 4_000;
const RECLAIM_CONCURRENCY = 3;
const MAX_PROVISION_COUNT = 10;
const MAX_USER_BATCH_COUNT = 50;
const XRPL_CONNECTION_TIMEOUT_MS = 20_000;
const XRPL_SNAPSHOT_ATTEMPTS = 3;
const XRPL_RETRY_DELAY_MS = 1_000;
const NFT_INVENTORY_CONCURRENCY = 8;

export interface WalletLedgerSnapshot {
  readonly balanceXrp: number;
  readonly ownerCount: number;
  readonly sequence: number;
  readonly currentLedger: number;
  readonly deleteFeeDrops: string;
  readonly nftIds: readonly string[];
}

export interface PaperWalletAdminGateway {
  snapshot(address: string): Promise<WalletLedgerSnapshot>;
  burnNft(seed: string, nftTokenId: string): Promise<{ hash: string }>;
  deleteAccount(seed: string, destination: string, feeDrops: string): Promise<{ hash: string }>;
  acceptNft(seed: string, sellOfferId: string): Promise<{ hash: string }>;
}

export interface ReclaimResult {
  readonly userId: string;
  readonly address: string;
  readonly state: "queued" | "burning" | "waiting" | "deleting" | "succeeded" | "failed";
  readonly burnedNfts: number;
  readonly deleteTxHash: string | null;
  readonly recoveredXrpEstimate: number;
  readonly error: string | null;
}

export interface ReclaimJobStatus {
  readonly enabled: boolean;
  readonly network: "mainnet";
  readonly id: string | null;
  readonly state: "idle" | "running" | "succeeded" | "failed";
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly destination: string | null;
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
  readonly results: readonly ReclaimResult[];
}

export interface AdminNftGrantResult extends NftIssueResult {
  readonly userId: string;
  readonly walletAddress: string;
  readonly badgeCode: string;
  readonly claimHash: string;
}

export interface AdminWalletProvisionResult {
  readonly network: "mainnet";
  readonly requested: number;
  readonly funded: number;
  readonly wallets: readonly {
    readonly userId: string;
    readonly address: string;
    readonly status: PaperWallet["status"];
    readonly fundingTxHash: string | null;
  }[];
}

export interface AdminBatchNftGrantResult {
  readonly badgeCode: string;
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly (
    | { readonly userId: string; readonly status: "succeeded"; readonly grant: AdminNftGrantResult }
    | { readonly userId: string; readonly status: "failed"; readonly error: string }
  )[];
}

export interface PaperUserActivity {
  readonly exists: boolean;
  readonly hasTraded: boolean;
}

export interface PaperWalletAdminServiceDeps {
  readonly store: Pick<PaperWalletStore, "get" | "list" | "markReclaimed" | "eraseSeed">;
  /** Wallets secondaires qui détiennent les NFT du nouveau funnel. */
  readonly rewardStore?: Pick<PaperWalletStore, "get" | "list" | "markReclaimed" | "eraseSeed">;
  readonly rewards: PaperBadgeRewardStore;
  readonly wallets: Pick<PaperWalletService, "decryptSeed">;
  readonly provisioner: Pick<PaperWalletService, "ensureCreated" | "ensureFunded">;
  readonly ensurePaperAccount: (userId: string) => void;
  readonly paperUserActivity: (userId: string) => PaperUserActivity;
  readonly issuer: NftIssuer;
  readonly recoveryAddress: string;
  readonly network: "mainnet";
  readonly gateway: PaperWalletAdminGateway;
  readonly metadataBaseUrl: string;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly now?: () => number;
}

/**
 * Opérations sensibles de la console locale, strictement câblées au runtime
 * wallet Paper Mainnet. Les seeds ne quittent jamais ce service et ne sont
 * jamais incluses dans les DTO admin.
 */
export class PaperWalletAdminService {
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly now: () => number;
  private job: ReclaimJobStatus;

  constructor(private readonly deps: PaperWalletAdminServiceDeps) {
    this.sleep = deps.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.now = deps.now ?? Date.now;
    this.job = idleJob(deps.network);
  }

  status(): ReclaimJobStatus {
    return this.job;
  }

  /**
   * Crée et finance séquentiellement des wallets gérés. Le séquencement évite
   * que plusieurs Payments du même funder réutilisent la même Sequence XRPL.
   */
  async provision(count: number): Promise<AdminWalletProvisionResult> {
    if (!Number.isInteger(count) || count < 1 || count > MAX_PROVISION_COUNT) {
      throw new Error(`Le nombre de wallets doit être compris entre 1 et ${String(MAX_PROVISION_COUNT)}`);
    }
    const wallets: AdminWalletProvisionResult["wallets"][number][] = [];
    for (let index = 0; index < count; index += 1) {
      const userId = `wallet:${this.deps.network}:${randomUUID()}`;
      this.deps.ensurePaperAccount(userId);
      const wallet = await this.deps.provisioner.ensureFunded(userId);
      wallets.push({
        userId: wallet.userId,
        address: wallet.address,
        status: wallet.status,
        fundingTxHash: wallet.fundingTxHash,
      });
    }
    return {
      network: this.deps.network,
      requested: count,
      funded: wallets.filter((wallet) => wallet.status === "funded").length,
      wallets,
    };
  }

  /** Crée sans XRP les adresses manquantes des comptes Paper sélectionnés. */
  async createForUsers(userIds: readonly string[]): Promise<AdminWalletProvisionResult> {
    const ids = this.validatePaperUsers(userIds, false);
    const wallets: AdminWalletProvisionResult["wallets"][number][] = [];
    for (const userId of ids) {
      const wallet = await this.deps.provisioner.ensureCreated(userId);
      wallets.push(this.provisionRow(wallet));
    }
    return this.provisionResult(ids.length, wallets);
  }

  /** Finance uniquement des comptes Paper ayant déjà exécuté un trade. */
  async fundForUsers(
    userIds: readonly string[],
    confirmation: string,
  ): Promise<AdminWalletProvisionResult> {
    const ids = this.validatePaperUsers(userIds, true);
    const expected = `FUND ${String(ids.length)} MAINNET WALLETS`;
    if (confirmation !== expected) throw new Error(`Confirmation requise: ${expected}`);
    const wallets: AdminWalletProvisionResult["wallets"][number][] = [];
    for (const userId of ids) {
      const wallet = await this.deps.provisioner.ensureFunded(userId);
      wallets.push(this.provisionRow(wallet));
    }
    return this.provisionResult(ids.length, wallets);
  }

  /** Distribue un même badge en série afin de préserver les séquences XRPL. */
  async grantBadgeBatch(
    userIds: readonly string[],
    badgeCode: string,
  ): Promise<AdminBatchNftGrantResult> {
    const ids = this.normalizeBatchUserIds(userIds);
    const results: AdminBatchNftGrantResult["results"][number][] = [];
    for (const userId of ids) {
      try {
        results.push({ userId, status: "succeeded", grant: await this.grantBadge(userId, badgeCode) });
      } catch (error) {
        results.push({
          userId,
          status: "failed",
          error: error instanceof Error ? error.message : "Distribution NFT refusée",
        });
      }
    }
    return {
      badgeCode,
      requested: ids.length,
      succeeded: results.filter((result) => result.status === "succeeded").length,
      failed: results.filter((result) => result.status === "failed").length,
      results,
    };
  }

  async grantBadge(userId: string, badgeCode: string): Promise<AdminNftGrantResult> {
    const badge = badgeByCode(badgeCode);
    if (badge === undefined) throw new Error("Badge inconnu");
    const wallet = await this.requireFundedWallet(userId);
    const existing = await this.deps.rewards.get(userId, badge.code);
    if (existing?.status === "claimed") {
      throw new Error("Ce badge a déjà été distribué à ce wallet");
    }
    if (existing !== null) {
      throw new Error(`Distribution déjà engagée (${existing.status})`);
    }
    await this.deps.rewards.ensureEligible({
      userId,
      badgeCode: badge.code,
      qualifiedAt: this.now(),
      status: "eligible",
      nftTokenId: null,
      sellOfferId: null,
      claimTxHash: null,
      claimedAt: null,
    });
    if (!(await this.deps.rewards.startMinting(userId, badge.code))) {
      throw new Error("Distribution concurrente détectée");
    }
    const issued = await this.deps.issuer.issueBadge({
      uri: `${this.deps.metadataBaseUrl}/nft-metadata/${badge.code}`,
      taxon: badge.taxon,
      destination: wallet.address,
    });
    await this.deps.rewards.markOfferPending(
      userId,
      badge.code,
      issued.nftTokenId,
      issued.sellOfferId,
    );
    const claim = await this.deps.gateway.acceptNft(
      await this.deps.wallets.decryptSeed(wallet),
      issued.sellOfferId,
    );
    await this.deps.rewards.markClaimed(userId, badge.code, claim.hash, this.now());
    return {
      ...issued,
      userId,
      walletAddress: wallet.address,
      badgeCode: badge.code,
      claimHash: claim.hash,
    };
  }

  async startReclaimOne(userId: string, confirmation: string): Promise<ReclaimJobStatus> {
    if (confirmation !== userId) throw new Error("Confirmation wallet incorrecte");
    const [starter, reward] = await Promise.all([
      this.deps.store.get(userId),
      this.deps.rewardStore?.get(userId) ?? null,
    ]);
    // Le wallet NFT passe en premier dans le journal opérateur ; les deux sont
    // récupérés lors d'une seule confirmation utilisateur.
    const wallets = [reward, starter].filter(
      (wallet): wallet is PaperWallet => wallet?.status === "funded",
    );
    if (wallets.length === 0) throw new Error("Aucun wallet financé à récupérer");
    return this.startJob(wallets);
  }

  async startReclaimAll(confirmation: string): Promise<ReclaimJobStatus> {
    if (confirmation !== this.deleteConfirmation()) throw new Error("Confirmation globale incorrecte");
    const [starters, rewards] = await Promise.all([
      this.deps.store.list(),
      this.deps.rewardStore?.list() ?? [],
    ]);
    const wallets = [...rewards, ...starters].filter((wallet) => wallet.status === "funded");
    if (wallets.length === 0) throw new Error("Aucun wallet financé à récupérer");
    return this.startJob(wallets);
  }

  private startJob(wallets: readonly PaperWallet[]): ReclaimJobStatus {
    if (this.job.state === "running") throw new Error("Une récupération est déjà en cours");
    const startedAt = this.now();
    this.job = {
      enabled: true,
      network: this.deps.network,
      id: randomUUID(),
      state: "running",
      total: wallets.length,
      completed: 0,
      failed: 0,
      destination: this.deps.recoveryAddress,
      startedAt,
      finishedAt: null,
      results: wallets.map((wallet) => queuedResult(wallet)),
    };
    void this.runJob(wallets);
    return this.job;
  }

  private async runJob(wallets: readonly PaperWallet[]): Promise<void> {
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < wallets.length) {
        const index = next++;
        const wallet = wallets[index];
        if (wallet === undefined) return;
        try {
          const result = await this.reclaimFully(wallet, (update) => this.updateResult(index, update));
          this.updateResult(index, result);
        } catch (error) {
          this.updateResult(index, {
            ...queuedResult(wallet),
            state: "failed",
            error: error instanceof Error ? error.message : "Erreur de récupération",
          });
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(RECLAIM_CONCURRENCY, wallets.length) }, () => worker()),
    );
    const failed = this.job.results.filter((result) => result.state === "failed").length;
    this.job = {
      ...this.job,
      state: failed === 0 ? "succeeded" : "failed",
      completed: this.job.results.filter((result) => result.state === "succeeded").length,
      failed,
      finishedAt: this.now(),
    };
  }

  private async reclaimFully(
    wallet: PaperWallet,
    progress: (result: ReclaimResult) => void,
  ): Promise<ReclaimResult> {
    const seed = await this.deps.wallets.decryptSeed(wallet);
    let snapshot = await this.deps.gateway.snapshot(wallet.address);
    let burnedNfts = 0;
    for (const nftTokenId of snapshot.nftIds) {
      progress({ ...queuedResult(wallet), state: "burning", burnedNfts });
      await this.deps.gateway.burnNft(seed, nftTokenId);
      burnedNfts += 1;
    }
    if (burnedNfts > 0) snapshot = await this.deps.gateway.snapshot(wallet.address);

    const deadline = this.now() + MAX_DELETE_WAIT_MS;
    while (snapshot.currentLedger < snapshot.sequence + DELETE_LEDGER_DELAY) {
      if (this.now() >= deadline) throw new Error("Délai XRPL de 256 ledgers dépassé");
      progress({ ...queuedResult(wallet), state: "waiting", burnedNfts });
      await this.sleep(LEDGER_POLL_MS);
      snapshot = await this.deps.gateway.snapshot(wallet.address);
    }
    if (snapshot.nftIds.length !== 0 || snapshot.ownerCount !== 0) {
      throw new Error(
        `Suppression bloquée: ${String(snapshot.nftIds.length)} NFT, ${String(snapshot.ownerCount)} objet(s)`,
      );
    }
    progress({ ...queuedResult(wallet), state: "deleting", burnedNfts });
    const deleted = await this.deps.gateway.deleteAccount(
      seed,
      this.deps.recoveryAddress,
      snapshot.deleteFeeDrops,
    );
    await this.markReclaimed(wallet);
    const feeXrp = Number(snapshot.deleteFeeDrops) / 1_000_000;
    return {
      ...queuedResult(wallet),
      state: "succeeded",
      burnedNfts,
      deleteTxHash: deleted.hash,
      recoveredXrpEstimate: Math.max(0, snapshot.balanceXrp - feeXrp),
    };
  }

  private updateResult(index: number, result: ReclaimResult): void {
    const results = this.job.results.map((current, currentIndex) =>
      currentIndex === index ? result : current
    );
    this.job = {
      ...this.job,
      results,
      completed: results.filter((current) => current.state === "succeeded").length,
      failed: results.filter((current) => current.state === "failed").length,
    };
  }

  private async requireFundedWallet(userId: string): Promise<PaperWallet> {
    const rewardWallet = await this.deps.rewardStore?.get(userId);
    const wallet = rewardWallet?.status === "funded"
      ? rewardWallet
      : await this.deps.store.get(userId);
    if (wallet === null) throw new Error("Wallet Paper introuvable");
    if (wallet.status !== "funded") throw new Error(`Wallet non disponible (${wallet.status})`);
    return wallet;
  }

  private async markReclaimed(wallet: PaperWallet): Promise<void> {
    const reward = await this.deps.rewardStore?.get(wallet.userId);
    if (reward?.address === wallet.address) {
      await this.deps.rewardStore?.markReclaimed(wallet.userId);
      await this.deps.rewardStore?.eraseSeed(wallet.userId);
      return;
    }
    await this.deps.store.markReclaimed(wallet.userId);
    await this.deps.store.eraseSeed(wallet.userId);
  }

  private validatePaperUsers(userIds: readonly string[], requireTrade: boolean): string[] {
    const ids = this.normalizeBatchUserIds(userIds);
    for (const userId of ids) {
      const activity = this.deps.paperUserActivity(userId);
      if (!activity.exists) throw new Error(`Compte Paper inconnu: ${userId}`);
      if (requireTrade && !activity.hasTraded) {
        throw new Error(`Aucun trade Paper exécuté pour ${userId}`);
      }
    }
    return ids;
  }

  private normalizeBatchUserIds(userIds: readonly string[]): string[] {
    const ids = [...new Set(userIds.map((userId) => userId.trim()).filter(Boolean))];
    if (ids.length < 1 || ids.length > MAX_USER_BATCH_COUNT) {
      throw new Error(`La sélection doit contenir entre 1 et ${String(MAX_USER_BATCH_COUNT)} utilisateurs`);
    }
    return ids;
  }

  private provisionRow(wallet: PaperWallet): AdminWalletProvisionResult["wallets"][number] {
    return {
      userId: wallet.userId,
      address: wallet.address,
      status: wallet.status,
      fundingTxHash: wallet.fundingTxHash,
    };
  }

  private provisionResult(
    requested: number,
    wallets: readonly AdminWalletProvisionResult["wallets"][number][],
  ): AdminWalletProvisionResult {
    return {
      network: this.deps.network,
      requested,
      funded: wallets.filter((wallet) => wallet.status === "funded").length,
      wallets,
    };
  }

  private deleteConfirmation(): string {
    return `DELETE ALL ${this.deps.network.toUpperCase()} WALLETS`;
  }
}

/** Gateway réel, construit uniquement par le runtime Paper Mainnet. */
export class XrplPaperWalletAdminGateway implements PaperWalletAdminGateway {
  constructor(
    private readonly serverUrl: string,
    private readonly sourceTag: number,
  ) {}

  async snapshot(address: string): Promise<WalletLedgerSnapshot> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= XRPL_SNAPSHOT_ATTEMPTS; attempt += 1) {
      try {
        return await this.snapshotOnce(address);
      } catch (error) {
        lastError = error;
        if (attempt < XRPL_SNAPSHOT_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, XRPL_RETRY_DELAY_MS));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Lecture XRPL Mainnet impossible");
  }

  /**
   * Lit l'inventaire réel Mainnet sur une seule connexion XRPL. Une limite de
   * 1 NFT suffit puisque la console compte les wallets qui en ont au moins un.
   */
  async addressesWithNfts(addresses: readonly string[]): Promise<ReadonlySet<string>> {
    const unique = [...new Set(addresses)];
    const matches = new Set<string>();
    if (unique.length === 0) return matches;
    const client = new Client(this.serverUrl, { connectionTimeout: XRPL_CONNECTION_TIMEOUT_MS });
    await client.connect();
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < unique.length) {
        const address = unique[cursor];
        cursor += 1;
        if (address === undefined) continue;
        const response = await client.request({
          command: "account_nfts",
          account: address,
          ledger_index: "validated",
          limit: 1,
        });
        if (response.result.account_nfts.length > 0) matches.add(address);
      }
    };
    try {
      await Promise.all(
        Array.from(
          { length: Math.min(NFT_INVENTORY_CONCURRENCY, unique.length) },
          () => worker(),
        ),
      );
      return matches;
    } finally {
      await client.disconnect();
    }
  }

  private async snapshotOnce(address: string): Promise<WalletLedgerSnapshot> {
    const client = new Client(this.serverUrl, { connectionTimeout: XRPL_CONNECTION_TIMEOUT_MS });
    await client.connect();
    try {
      const [account, nfts, ledger, server] = await Promise.all([
        client.request({ command: "account_info", account: address, ledger_index: "validated" }),
        client.request({ command: "account_nfts", account: address, ledger_index: "validated", limit: 400 }),
        client.request({ command: "ledger_current" }),
        client.request({ command: "server_info" }),
      ]);
      const reserve = server.result.info.validated_ledger?.reserve_inc_xrp;
      if (reserve === undefined) throw new Error("Owner reserve XRPL indisponible");
      return {
        balanceXrp: Number(account.result.account_data.Balance) / 1_000_000,
        ownerCount: account.result.account_data.OwnerCount,
        sequence: account.result.account_data.Sequence,
        currentLedger: ledger.result.ledger_current_index,
        deleteFeeDrops: String(Math.ceil(Number(reserve) * 1_000_000)),
        nftIds: nfts.result.account_nfts.map((nft) => nft.NFTokenID),
      };
    } finally {
      await client.disconnect();
    }
  }

  burnNft(seed: string, nftTokenId: string): Promise<{ hash: string }> {
    const wallet = Wallet.fromSeed(seed);
    return this.submit(wallet, {
      TransactionType: "NFTokenBurn",
      Account: wallet.classicAddress,
      NFTokenID: nftTokenId,
      SourceTag: this.sourceTag,
    });
  }

  deleteAccount(seed: string, destination: string, feeDrops: string): Promise<{ hash: string }> {
    const wallet = Wallet.fromSeed(seed);
    return this.submit(
      wallet,
      {
        TransactionType: "AccountDelete",
        Account: wallet.classicAddress,
        Destination: destination,
        SourceTag: this.sourceTag,
        Fee: feeDrops,
      },
      true,
    );
  }

  acceptNft(seed: string, sellOfferId: string): Promise<{ hash: string }> {
    const wallet = Wallet.fromSeed(seed);
    return this.submit(wallet, {
      TransactionType: "NFTokenAcceptOffer",
      Account: wallet.classicAddress,
      NFTokenSellOffer: sellOfferId,
      SourceTag: this.sourceTag,
    });
  }

  private async submit(
    wallet: Wallet,
    tx: NFTokenBurn | AccountDelete | {
      readonly TransactionType: "NFTokenAcceptOffer";
      readonly Account: string;
      readonly NFTokenSellOffer: string;
      readonly SourceTag: number;
    },
    failHard = false,
  ): Promise<{ hash: string }> {
    const client = new Client(this.serverUrl, { connectionTimeout: XRPL_CONNECTION_TIMEOUT_MS });
    await client.connect();
    try {
      const prepared = await client.autofill(tx);
      const signed = wallet.sign(prepared);
      const submitted = await client.submitAndWait(signed.tx_blob, { failHard });
      const meta = submitted.result.meta;
      if (
        typeof meta !== "object" ||
        meta === null ||
        (meta as unknown as { readonly TransactionResult?: unknown }).TransactionResult !==
          "tesSUCCESS"
      ) {
        throw new Error(`Transaction XRPL refusée: ${JSON.stringify(meta)}`);
      }
      return { hash: submitted.result.hash };
    } finally {
      await client.disconnect();
    }
  }
}

function queuedResult(wallet: PaperWallet): ReclaimResult {
  return {
    userId: wallet.userId,
    address: wallet.address,
    state: "queued",
    burnedNfts: 0,
    deleteTxHash: null,
    recoveredXrpEstimate: 0,
    error: null,
  };
}

function idleJob(network: "mainnet"): ReclaimJobStatus {
  return {
    enabled: true,
    network,
    id: null,
    state: "idle",
    total: 0,
    completed: 0,
    failed: 0,
    destination: null,
    startedAt: null,
    finishedAt: null,
    results: [],
  };
}

export { DELETE_CONFIRMATION, MAX_PROVISION_COUNT };
