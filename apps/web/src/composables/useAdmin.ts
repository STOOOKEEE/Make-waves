import { ref } from "vue";
import type {
  AdminNftGrantDto,
  AdminBatchNftGrantDto,
  AdminOverviewDto,
  AdminReclaimJobDto,
  AdminWalletProvisionDto,
  AdminCompetitionCloseDto,
  AdminCompetitionInput,
  AdminInactiveUserDeleteDto,
  AdminPaperWorkflowBatchDto,
  AdminPortfolioManagerExecutionDto,
  AdminPortfolioManagerPlanDto,
  AdminPortfolioManagerStatusDto,
  AdminManagedWalletDto,
  AdminManagedWalletClaimDto,
} from "@tide/client";
import { TideApiError } from "@tide/client";
import { errorMessage } from "./messages";

const TOKEN_KEY = "tide.adminToken";

/** Contrat du client admin, implémenté dans un chunk réservé au dev local. */
export interface AdminClient {
  adminOverview(token: string): Promise<AdminOverviewDto>;
  walletOpsStatus(token: string): Promise<AdminReclaimJobDto>;
  managedWallets(token: string): Promise<readonly AdminManagedWalletDto[]>;
  importManagedWallet(token: string, label: string, seed: string): Promise<AdminManagedWalletDto>;
  tradeManagedWallet(token: string, address: string): Promise<AdminManagedWalletDto>;
  claimManagedWalletBadge(token: string, address: string, badgeCode: string): Promise<AdminManagedWalletClaimDto>;
  removeManagedWallet(token: string, address: string): Promise<{ readonly deleted: true }>;
  provisionWallets(token: string, count: number): Promise<AdminWalletProvisionDto>;
  createUserWallets(token: string, userIds: readonly string[]): Promise<AdminWalletProvisionDto>;
  fundUserWallets(token: string, userIds: readonly string[], confirmation: string): Promise<AdminWalletProvisionDto>;
  deleteInactiveUsers(token: string, userIds: readonly string[], confirmation: string): Promise<AdminInactiveUserDeleteDto>;
  grantWalletNft(token: string, userId: string, badgeCode: string): Promise<AdminNftGrantDto>;
  grantWalletNftBatch(token: string, userIds: readonly string[], badgeCode: string): Promise<AdminBatchNftGrantDto>;
  setupPaperWorkflow(token: string, userIds: readonly string[], badgeCode: string): Promise<AdminPaperWorkflowBatchDto>;
  reclaimWallet(token: string, userId: string): Promise<AdminReclaimJobDto>;
  reclaimAllWallets(token: string, confirmation: string): Promise<AdminReclaimJobDto>;
  createCompetition(token: string, input: AdminCompetitionInput): Promise<{ id: string }>;
  closeCompetition(token: string, id: string): Promise<AdminCompetitionCloseDto>;
  portfolioManagerStatus(token: string): Promise<AdminPortfolioManagerStatusDto>;
  preparePortfolioManager(token: string, userIds: readonly string[]): Promise<AdminPortfolioManagerPlanDto>;
  executePortfolioManager(token: string, planId: string, confirmation: string): Promise<AdminPortfolioManagerExecutionDto>;
}

/** État de la console admin : token (persisté en sessionStorage), overview, chargement. */
export function useAdmin(client: AdminClient) {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) ?? "");
  const overview = ref<AdminOverviewDto | null>(null);
  const error = ref("");
  const loading = ref(false);
  const walletJob = ref<AdminReclaimJobDto | null>(null);
  const managedWallets = ref<readonly AdminManagedWalletDto[]>([]);
  const lastManagedWalletClaim = ref<AdminManagedWalletClaimDto | null>(null);
  const provisionResult = ref<AdminWalletProvisionDto | null>(null);
  const competitionPayout = ref<AdminCompetitionCloseDto | null>(null);
  const lastNftGrant = ref<AdminNftGrantDto | null>(null);
  const lastBatchNftGrant = ref<AdminBatchNftGrantDto | null>(null);
  const lastInactiveDelete = ref<AdminInactiveUserDeleteDto | null>(null);
  const lastPaperWorkflow = ref<AdminPaperWorkflowBatchDto | null>(null);
  const portfolioManager = ref<AdminPortfolioManagerStatusDto | null>(null);
  const portfolioPlan = ref<AdminPortfolioManagerPlanDto | null>(null);
  const portfolioExecution = ref<AdminPortfolioManagerExecutionDto | null>(null);

  function logout(): void {
    token.value = "";
    overview.value = null;
    sessionStorage.removeItem(TOKEN_KEY);
  }

  async function load(): Promise<void> {
    if (token.value === "") {
      error.value = "Token requis.";
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      const [nextOverview, nextWalletJob, nextPortfolioManager, nextManagedWallets] = await Promise.all([
        client.adminOverview(token.value),
        client.walletOpsStatus(token.value),
        client.portfolioManagerStatus(token.value),
        client.managedWallets(token.value),
      ]);
      overview.value = nextOverview;
      walletJob.value = nextWalletJob;
      portfolioManager.value = nextPortfolioManager;
      portfolioPlan.value = nextPortfolioManager.preparedPlan;
      managedWallets.value = nextManagedWallets;
      sessionStorage.setItem(TOKEN_KEY, token.value);
    } catch (err) {
      overview.value = null;
      if (err instanceof TideApiError && err.status === 401) {
        logout();
        error.value = "Token invalide.";
      } else {
        error.value = errorMessage(err);
      }
    } finally {
      loading.value = false;
    }
  }

  async function refreshWalletJob(): Promise<void> {
    if (token.value === "") return;
    try {
      walletJob.value = await client.walletOpsStatus(token.value);
    } catch (err) {
      error.value = errorMessage(err);
    }
  }

  async function importManagedWallet(label: string, seed: string): Promise<boolean> {
    if (token.value === "") return false;
    loading.value = true;
    error.value = "";
    try {
      await client.importManagedWallet(token.value, label, seed);
      await load();
      return true;
    } catch (err) {
      error.value = errorMessage(err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function tradeManagedWallet(address: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      await client.tradeManagedWallet(token.value, address);
      await load();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function claimManagedWalletBadge(address: string, badgeCode: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      lastManagedWalletClaim.value = await client.claimManagedWalletBadge(
        token.value,
        address,
        badgeCode,
      );
      await load();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function removeManagedWallet(address: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      await client.removeManagedWallet(token.value, address);
      await load();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function provisionWallets(count: number): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      provisionResult.value = await client.provisionWallets(token.value, count);
      await load();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function createUserWallets(userIds: readonly string[]): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      provisionResult.value = await client.createUserWallets(token.value, userIds);
      await load();
    } catch (err) {
      const message = errorMessage(err);
      await load();
      error.value = message;
    } finally {
      loading.value = false;
    }
  }

  async function fundUserWallets(userIds: readonly string[], confirmation: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      provisionResult.value = await client.fundUserWallets(token.value, userIds, confirmation);
      await load();
    } catch (err) {
      const message = errorMessage(err);
      await load();
      error.value = message;
    } finally {
      loading.value = false;
    }
  }

  async function deleteInactiveUsers(userIds: readonly string[], confirmation: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      lastInactiveDelete.value = await client.deleteInactiveUsers(
        token.value,
        userIds,
        confirmation,
      );
      await load();
    } catch (err) {
      const message = errorMessage(err);
      await load();
      error.value = message;
    } finally {
      loading.value = false;
    }
  }

  async function grantNft(userId: string, badgeCode: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      lastNftGrant.value = await client.grantWalletNft(token.value, userId, badgeCode);
      await load();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function grantNftBatch(userIds: readonly string[], badgeCode: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    lastBatchNftGrant.value = null;
    try {
      lastBatchNftGrant.value = await client.grantWalletNftBatch(token.value, userIds, badgeCode);
      await load();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function setupPaperWorkflow(userIds: readonly string[], badgeCode: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    lastPaperWorkflow.value = null;
    try {
      lastPaperWorkflow.value = await client.setupPaperWorkflow(token.value, userIds, badgeCode);
      await load();
    } catch (err) {
      const message = errorMessage(err);
      await load();
      error.value = message;
    } finally {
      loading.value = false;
    }
  }

  async function reclaimOne(userId: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      walletJob.value = await client.reclaimWallet(token.value, userId);
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function reclaimAll(confirmation: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      walletJob.value = await client.reclaimAllWallets(token.value, confirmation);
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function createCompetition(input: AdminCompetitionInput): Promise<boolean> {
    if (token.value === "") return false;
    loading.value = true;
    error.value = "";
    try {
      await client.createCompetition(token.value, input);
      return true;
    } catch (err) {
      error.value = errorMessage(err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function closeCompetition(id: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      competitionPayout.value = await client.closeCompetition(token.value, id);
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function preparePortfolio(userIds: readonly string[]): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    portfolioExecution.value = null;
    try {
      portfolioPlan.value = await client.preparePortfolioManager(token.value, userIds);
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  async function executePortfolio(planId: string, confirmation: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      portfolioExecution.value = await client.executePortfolioManager(
        token.value,
        planId,
        confirmation,
      );
      await load();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  return {
    token,
    overview,
    error,
    loading,
    walletJob,
    managedWallets,
    lastManagedWalletClaim,
    provisionResult,
    competitionPayout,
    lastNftGrant,
    lastBatchNftGrant,
    lastInactiveDelete,
    lastPaperWorkflow,
    portfolioManager,
    portfolioPlan,
    portfolioExecution,
    load,
    refreshWalletJob,
    importManagedWallet,
    tradeManagedWallet,
    claimManagedWalletBadge,
    removeManagedWallet,
    provisionWallets,
    createUserWallets,
    fundUserWallets,
    deleteInactiveUsers,
    grantNft,
    grantNftBatch,
    setupPaperWorkflow,
    reclaimOne,
    reclaimAll,
    createCompetition,
    closeCompetition,
    preparePortfolio,
    executePortfolio,
    logout,
  };
}
