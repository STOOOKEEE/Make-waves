import { ref } from "vue";
import type { CompetitionSummary, TideClient } from "@tide/client";
import type { CompetitionMock } from "../data/competitions";

/** Formate un montant en devise de référence façon « $1,234 ». */
function formatPot(amount: number): string {
  return "$" + Math.round(amount).toLocaleString("en-US");
}

/**
 * État live des compétitions (participants, pot, clôture) récupéré du backend et
 * fusionné dans le catalogue de présentation. Les données dynamiques réelles
 * écrasent le décor mock ; le contenu éditorial (nom, visuel, descriptif) reste.
 * Backend indisponible → le catalogue est servi tel quel (dégradation propre).
 */
export function useCompetitionsLive(client: TideClient) {
  const live = ref<Map<string, CompetitionSummary>>(new Map());
  const loaded = ref(false);
  const error = ref("");

  async function load(): Promise<void> {
    try {
      const summaries = await client.competitions();
      live.value = new Map(summaries.map((summary) => [summary.id, summary]));
      loaded.value = true;
    } catch {
      error.value = "État live indisponible";
    }
  }

  /** Fusionne l'état live dans une compétition du catalogue (si connue du backend). */
  function merge(mock: CompetitionMock): CompetitionMock {
    const summary = live.value.get(mock.id);
    if (summary === undefined) {
      return mock;
    }
    return {
      ...mock,
      players: String(summary.participants),
      pot: formatPot(summary.pot),
      status: summary.closed ? "ended" : mock.status,
    };
  }

  return { live, loaded, error, load, merge };
}
