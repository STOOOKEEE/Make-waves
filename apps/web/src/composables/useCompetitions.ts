import { ref } from "vue";
import type { CloseResult, TideClient } from "@tide/client";
import type { Competition } from "@tide/core";
import { errorMessage } from "./messages";

/** Logique des compétitions : créer, rejoindre, participants, clôturer. */
export function useCompetitions(client: TideClient) {
  const participants = ref<string[]>([]);
  const lastResult = ref<CloseResult | null>(null);
  const error = ref("");

  async function create(competition: Competition): Promise<boolean> {
    error.value = "";
    try {
      await client.createCompetition(competition);
      return true;
    } catch (e) {
      error.value = errorMessage(e);
      return false;
    }
  }

  async function join(competitionId: string, userId: string): Promise<void> {
    error.value = "";
    try {
      await client.joinCompetition(competitionId, userId);
      participants.value = await client.participants(competitionId);
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  async function loadParticipants(competitionId: string): Promise<void> {
    error.value = "";
    try {
      participants.value = await client.participants(competitionId);
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  async function close(competitionId: string): Promise<void> {
    error.value = "";
    try {
      lastResult.value = await client.closeCompetition(competitionId);
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  return { participants, lastResult, error, create, join, loadParticipants, close };
}
