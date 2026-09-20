import { ref } from "vue";
import type {
  CompetitionLeaderboardEntry,
  CompetitionSummary,
  TideClient,
} from "@tide/client";
import { errorMessage } from "./messages";

/** État des compétitions provenant exclusivement de l'API persistante. */
export function useCompetitions(client: TideClient) {
  const items = ref<CompetitionSummary[]>([]);
  const current = ref<CompetitionSummary | null>(null);
  const participants = ref<string[]>([]);
  const leaderboard = ref<CompetitionLeaderboardEntry[]>([]);
  const loading = ref(false);
  const error = ref("");

  async function load(): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      items.value = await client.competitions();
    } catch (cause) {
      error.value = errorMessage(cause);
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: string): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const [competition, registered] = await Promise.all([
        client.competition(id),
        client.participants(id),
      ]);
      current.value = competition;
      participants.value = registered;
      try {
        leaderboard.value = await client.competitionLeaderboard(id);
      } catch (cause) {
        // Une compétition Live sans indexeur PnL reste visible mais n'affiche
        // jamais un classement Paper de substitution.
        leaderboard.value = [];
        error.value = errorMessage(cause);
      }
    } catch (cause) {
      current.value = null;
      participants.value = [];
      leaderboard.value = [];
      error.value = errorMessage(cause);
    } finally {
      loading.value = false;
    }
  }

  return { items, current, participants, leaderboard, loading, error, load, loadOne };
}
