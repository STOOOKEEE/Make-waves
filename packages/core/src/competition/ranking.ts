import { assertValidEquity } from "./validate";
import type { Participant, RankedParticipant } from "./types";

/**
 * Classe les participants par equity décroissante (meilleur = rang 1).
 *
 * - Pur : ne modifie pas le tableau d'entrée.
 * - Déterministe : à equity égale, départage par `userId` croissant (le résultat
 *   ne dépend donc pas de l'ordre d'insertion).
 * - Rangs « compétition standard » : les ex-aequo partagent le même rang et le
 *   rang suivant saute (ex. equities [300, 200, 200, 100] -> rangs [1, 2, 2, 4]).
 *   La répartition des gains (cf. payout) mutualise les tiers des ex-aequo.
 *
 * Lève `InvalidCompetitionError` si une equity n'est pas finie.
 */
export function rankByEquity(
  participants: readonly Participant[],
): RankedParticipant[] {
  for (const participant of participants) {
    assertValidEquity(participant.equity, participant.userId);
  }

  const sorted = [...participants].sort((a, b) => {
    if (b.equity !== a.equity) {
      return b.equity - a.equity;
    }
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });

  const ranked: RankedParticipant[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const participant = sorted[index];
    if (participant === undefined) {
      continue;
    }
    const previous = ranked[index - 1];
    const sharesRankWithPrevious =
      previous !== undefined && previous.equity === participant.equity;
    const rank = sharesRankWithPrevious ? previous.rank : index + 1;
    ranked.push({ ...participant, rank });
  }
  return ranked;
}
