import { ref } from "vue";
import type { TideClient } from "@tide/client";
import type { LeaderboardEntry } from "@tide/core";
import { errorMessage } from "./messages";

/** Logique du leaderboard : chargement du classement. */
export function useLeaderboard(client: TideClient) {
  const entries = ref<LeaderboardEntry[]>([]);
  const error = ref("");

  async function load(): Promise<void> {
    error.value = "";
    try {
      entries.value = await client.leaderboard();
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  return { entries, error, load };
}
