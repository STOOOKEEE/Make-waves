import { distributable, prizePool } from "./prize";
import { assertValidPayoutWeights } from "./validate";
import type { Competition, Payout, RankedParticipant } from "./types";

/**
 * Somme du poids de répartition pour les positions `[startPos, startPos+size[`.
 * Les positions au-delà des tiers payés (≥ weights.length) ne comptent pas.
 */
function groupWeight(
  weights: readonly number[],
  startPos: number,
  size: number,
): number {
  let total = 0;
  for (let pos = startPos; pos < startPos + size; pos += 1) {
    const weight = weights[pos];
    if (weight !== undefined) {
      total += weight;
    }
  }
  return total;
}

/**
 * Calcule les gains d'une compétition à partir du classement final.
 *
 * Le pool (buy-in × participants) moins le rake est réparti selon
 * `payoutWeights`. Les ex-aequo (même rang) **mutualisent** les tiers qu'ils
 * occupent (split-pot poker) : ex. deux joueurs à égalité aux rangs 1-2 se
 * partagent `(weights[0] + weights[1]) / 2` chacun.
 *
 * Cas limites assumés (MVP) :
 * - moins de participants que de tiers : les tiers sans gagnant ne sont pas
 *   versés ; le reliquat reste en trésorerie (voir `undistributedAmount`).
 * - montants en `number` : au paiement on-chain (drops XRPL = entiers), arrondir
 *   avec la méthode du plus grand reste pour garantir `Σ versé = distribuable
 *   arrondi`. À faire au point de signature des `Payment`. Voir docs/DEVLOG.md.
 */
export function computePayouts(
  competition: Competition,
  ranked: readonly RankedParticipant[],
): Payout[] {
  assertValidPayoutWeights(competition.payoutWeights);

  const pool = prizePool(competition.buyIn, ranked.length);
  const toDistribute = distributable(pool, competition.rakeRatio);
  const weights = competition.payoutWeights;

  const payouts: Payout[] = [];
  let i = 0;
  while (i < ranked.length) {
    const head = ranked[i];
    if (head === undefined) {
      i += 1;
      continue;
    }

    // Regrouper les ex-aequo (même rang), en conservant l'ordre du classement.
    const group: RankedParticipant[] = [];
    let j = i;
    while (j < ranked.length) {
      const member = ranked[j];
      if (member === undefined || member.rank !== head.rank) {
        break;
      }
      group.push(member);
      j += 1;
    }

    // Positions 0-based occupées par le groupe : (rank-1) .. (rank-1+taille-1).
    const startPos = head.rank - 1;
    const weight = groupWeight(weights, startPos, group.length);
    if (weight > 0) {
      const share = (toDistribute * weight) / group.length;
      for (const member of group) {
        payouts.push({ userId: member.userId, rank: member.rank, amount: share });
      }
    }
    i = j;
  }
  return payouts;
}

/**
 * Montant du pool NON distribué (reliquat) = distribuable - Σ payouts. Non nul
 * quand le tournoi est sous-rempli (moins de participants que de tiers payés).
 * L'appelant est responsable de récupérer ce reliquat en trésorerie.
 */
export function undistributedAmount(
  competition: Competition,
  ranked: readonly RankedParticipant[],
): number {
  const pool = prizePool(competition.buyIn, ranked.length);
  const toDistribute = distributable(pool, competition.rakeRatio);
  const paid = computePayouts(competition, ranked).reduce(
    (sum, payout) => sum + payout.amount,
    0,
  );
  return toDistribute - paid;
}
