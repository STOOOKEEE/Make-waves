/** Paramètres d'une compétition (tournoi). */
export interface Competition {
  readonly id: string;
  /** Buy-in par participant, en devise de référence. */
  readonly buyIn: number;
  /** Part prélevée par la plateforme sur le pool, dans [0, 1[. */
  readonly rakeRatio: number;
  /**
   * Répartition des gains entre les premiers du classement (somme = 1).
   * `payoutWeights[0]` = part du 1er, `[1]` = du 2e, etc.
   */
  readonly payoutWeights: readonly number[];
}

/** Participant évalué (equity issue du moteur paper). */
export interface Participant {
  readonly userId: string;
  /** Valeur du portefeuille en devise de référence (cf. paper/equity). */
  readonly equity: number;
}

/** Participant après classement. */
export interface RankedParticipant extends Participant {
  /** Rang 1 = meilleur. */
  readonly rank: number;
}

/** Gain attribué à un gagnant. */
export interface Payout {
  readonly userId: string;
  readonly rank: number;
  /** Montant en devise de référence. */
  readonly amount: number;
}
