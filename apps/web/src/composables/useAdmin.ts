import { ref } from "vue";
import type {
  AdminNftGrantDto,
  AdminOverviewDto,
  AdminReclaimJobDto,
  AdminWalletProvisionDto,
  AdminCompetitionCloseDto,
  AdminCompetitionInput,
} from "@tide/client";
import { TideApiError } from "@tide/client";
import { errorMessage } from "./messages";

const TOKEN_KEY = "tide.adminToken";

/** Contrat du client admin, implémenté dans un chunk réservé au dev local. */
export interface AdminClient {
  adminOverview(token: string): Promise<AdminOverviewDto>;
  walletOpsStatus(token: string): Promise<AdminReclaimJobDto>;
  provisionWallets(token: string, count: number): Promise<AdminWalletProvisionDto>;
  grantWalletNft(token: string, userId: string, badgeCode: string): Promise<AdminNftGrantDto>;
  reclaimWallet(token: string, userId: string): Promise<AdminReclaimJobDto>;
  reclaimAllWallets(token: string, confirmation: string): Promise<AdminReclaimJobDto>;
  createCompetition(token: string, input: AdminCompetitionInput): Promise<{ id: string }>;
  closeCompetition(token: string, id: string): Promise<AdminCompetitionCloseDto>;
}

/** État de la console admin : token (persisté en sessionStorage), overview, chargement. */
export function useAdmin(client: AdminClient) {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) ?? "");
  const overview = ref<AdminOverviewDto | null>(null);
  const error = ref("");
  const loading = ref(false);
  const walletJob = ref<AdminReclaimJobDto | null>(null);
  const provisionResult = ref<AdminWalletProvisionDto | null>(null);
  const competitionPayout = ref<AdminCompetitionCloseDto | null>(null);
  const lastNftGrant = ref<AdminNftGrantDto | null>(null);

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
      const [nextOverview, nextWalletJob] = await Promise.all([
        client.adminOverview(token.value),
        client.walletOpsStatus(token.value),
      ]);
      overview.value = nextOverview;
      walletJob.value = nextWalletJob;
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

  return {
    token,
    overview,
    error,
    loading,
    walletJob,
    provisionResult,
    competitionPayout,
    lastNftGrant,
    load,
    refreshWalletJob,
    provisionWallets,
    grantNft,
    reclaimOne,
    reclaimAll,
    createCompetition,
    closeCompetition,
    logout,
  };
}
