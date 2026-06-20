import {
  assertValidBuyIn,
  assertValidParticipantCount,
  assertValidRakeRatio,
} from "./validate";

/** Pool total = buy-in × nombre de participants. */
export function prizePool(buyIn: number, participantCount: number): number {
  assertValidBuyIn(buyIn);
  assertValidParticipantCount(participantCount);
  return buyIn * participantCount;
}

/** Montant prélevé par la plateforme (rake). */
export function rakeAmount(pool: number, rakeRatio: number): number {
  assertValidRakeRatio(rakeRatio);
  return pool * rakeRatio;
}

/** Montant réellement distribué aux gagnants = pool - rake. */
export function distributable(pool: number, rakeRatio: number): number {
  return pool - rakeAmount(pool, rakeRatio);
}
