import { ref } from "vue";
import type { AdminOverviewDto } from "@tide/client";
import { TideApiError } from "@tide/client";
import { errorMessage } from "./messages";

const TOKEN_KEY = "tide.adminToken";

/** Contrat du client admin, implémenté dans un chunk réservé au dev local. */
export interface AdminClient {
  adminOverview(token: string): Promise<AdminOverviewDto>;
  runTestnetE2E(token: string): Promise<AdminOverviewDto["testnetE2E"]>;
}

/** État de la console admin : token (persisté en sessionStorage), overview, chargement. */
export function useAdmin(client: AdminClient) {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) ?? "");
  const overview = ref<AdminOverviewDto | null>(null);
  const error = ref("");
  const loading = ref(false);

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

  return { token, overview, error, loading, load, runTestnetE2E, logout };
}
