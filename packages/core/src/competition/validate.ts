import { InvalidCompetitionError } from "../errors";
import { WEIGHT_SUM_EPSILON } from "../constants";

/** Buy-in : fini et strictement positif. */
export function assertValidBuyIn(buyIn: number): void {
  if (!Number.isFinite(buyIn) || buyIn <= 0) {
    throw new InvalidCompetitionError(`Buy-in invalide: ${String(buyIn)}`);
  }
}

/** Nombre de participants : entier ≥ 0. */
export function assertValidParticipantCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new InvalidCompetitionError(
      `Nombre de participants invalide: ${String(count)}`,
    );
  }
}

/**
 * Equity d'un participant : finie. C'est la donnée qui décide du classement
 * (donc des gains) ; une equity NaN/Infinity corromprait le tri silencieusement.
 */
export function assertValidEquity(equity: number, userId: string): void {
  if (!Number.isFinite(equity)) {
    throw new InvalidCompetitionError(
      `Equity invalide pour ${userId}: ${String(equity)}`,
    );
  }
}

/** Taux de rake : fini, dans [0, 1[ (on ne prélève jamais tout le pool). */
export function assertValidRakeRatio(rakeRatio: number): void {
  if (!Number.isFinite(rakeRatio) || rakeRatio < 0 || rakeRatio >= 1) {
    throw new InvalidCompetitionError(`Taux de rake invalide: ${String(rakeRatio)}`);
  }
}

/** Poids de répartition : non vides, chacun ≥ 0, somme = 1 (à epsilon près). */
export function assertValidPayoutWeights(weights: readonly number[]): void {
  if (weights.length === 0) {
    throw new InvalidCompetitionError("payoutWeights ne peut pas être vide");
  }
  let sum = 0;
  for (const weight of weights) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new InvalidCompetitionError(`Poids invalide: ${String(weight)}`);
    }
    sum += weight;
  }
  if (Math.abs(sum - 1) > WEIGHT_SUM_EPSILON) {
    throw new InvalidCompetitionError(
      `Somme des poids de répartition ≠ 1: ${String(sum)}`,
    );
  }
}
