import { BADGE_CODES } from "./catalog";

// Dérivation du mérite : quels badges un utilisateur a GAGNÉS, calculé depuis
// son activité paper réelle (pas de système d'événements, pas de persistance
// du mérite — seul le claim est persisté).

/** Seuil du badge « Ten Trades ». */
export const TEN_TRADES_THRESHOLD = 10;

/** Activité paper agrégée d'un utilisateur, source du mérite. */
export interface BadgeActivity {
  /** Nombre d'ordres exécutés (fills). */
  readonly fillCount: number;
  /** Nombre de compétitions rejointes. */
  readonly competitionCount: number;
}

/** Codes des badges mérités pour une activité donnée. */
export function earnedCodes(activity: BadgeActivity): string[] {
  const codes: string[] = [];
  if (activity.fillCount >= 1) {
    codes.push(BADGE_CODES.FIRST_TRADE);
  }
  if (activity.fillCount >= TEN_TRADES_THRESHOLD) {
    codes.push(BADGE_CODES.TEN_TRADES);
  }
  if (activity.competitionCount >= 1) {
    codes.push(BADGE_CODES.FIRST_COMPETITION);
  }
  return codes;
}
