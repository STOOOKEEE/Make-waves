import { ref } from "vue";
import type {
  AdminNftGrantDto,
  AdminOverviewDto,
  AdminReclaimJobDto,
} from "@tide/client";
import { TideApiError } from "@tide/client";
import { errorMessage } from "./messages";

const TOKEN_KEY = "tide.adminToken";

/** Contrat du client admin, implémenté dans un chunk réservé au dev local. */
export interface AdminClient {
  adminOverview(token: string): Promise<AdminOverviewDto>;
  runTestnetE2E(token: string): Promise<AdminOverviewDto["testnetE2E"]>;
  walletOpsStatus(token: string): Promise<AdminReclaimJobDto>;
  grantWalletNft(token: string, userId: string, badgeCode: string): Promise<AdminNftGrantDto>;
  reclaimWallet(token: string, userId: string): Promise<AdminReclaimJobDto>;
  reclaimAllWallets(token: string, confirmation: string): Promise<AdminReclaimJobDto>;
}

/** État de la console admin : token (persisté en sessionStorage), overview, chargement. */
export function useAdmin(client: AdminClient) {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) ?? "");
  const overview = ref<AdminOverviewDto | null>(null);
  const error = ref("");
  const loading = ref(false);
  const walletJob = ref<AdminReclaimJobDto | null>(null);

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
      overview.value = await client.adminOverview(token.value);
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

  async function runTestnetE2E(): Promise<void> {
    if (token.value === "") {
      error.value = "Token requis.";
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      const status = await client.runTestnetE2E(token.value);
      if (overview.value !== null) overview.value = { ...overview.value, testnetE2E: status };
    } catch (err) {
      error.value = errorMessage(err);
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

  async function grantNft(userId: string, badgeCode: string): Promise<void> {
    if (token.value === "") return;
    loading.value = true;
    error.value = "";
    try {
      await client.grantWalletNft(token.value, userId, badgeCode);
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

  return {
    token,
    overview,
    error,
    loading,
    walletJob,
    load,
    runTestnetE2E,
    refreshWalletJob,
    grantNft,
    reclaimOne,
    reclaimAll,
    logout,
  };
}
