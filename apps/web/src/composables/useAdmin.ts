import { ref } from "vue";
import type { AdminOverviewDto, TideClient } from "@tide/client";
import { TideApiError } from "@tide/client";
import { errorMessage } from "./messages";

const TOKEN_KEY = "tide.adminToken";

/** État de la console admin : token (persisté en sessionStorage), overview, chargement. */
export function useAdmin(client: TideClient) {
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

  return { token, overview, error, loading, load, logout };
}
