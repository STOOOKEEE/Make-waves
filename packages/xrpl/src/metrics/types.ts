/**
 * Transaction observée on-chain et rattachée à une app via son `SourceTag`.
 * Le `volume` est supposé déjà normalisé en devise de référence par l'appelant
 * (la conversion multi-devises dépend du feed de prix, hors de ce module pur).
 */
export interface ObservedTx {
  /** Compte émetteur (sert au comptage des comptes actifs distincts). */
  readonly account: string;
  /** SourceTag porté par la tx. */
  readonly sourceTag: number;
  /** Volume normalisé en devise de référence (≥ 0). */
  readonly volume: number;
  /** Index du ledger (pour le fenêtrage, ex. leaderboard hebdo). */
  readonly ledgerIndex: number;
}

/** Métriques d'attribution = ce que le hackathon mesure pour Tide. */
export interface AttributionMetrics {
  /** Volume total attribué (devise de référence). */
  readonly totalVolume: number;
  /** Nombre de comptes actifs distincts. */
  readonly activeAccounts: number;
  /** Nombre de transactions attribuées. */
  readonly txCount: number;
}
