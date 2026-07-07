/** Arguments (en unités de base du token) pour `MarginVault.openAccounting`. */
export interface OpenSettlement {
  /** Marge à verrouiller. */
  readonly marginBase: bigint;
  /** Frais d'ouverture à débiter (vers le pool). */
  readonly feeBase: bigint;
}

/** Arguments (en unités de base du token) pour `MarginVault.closeAccounting`. */
export interface CloseSettlement {
  /** Marge à libérer. */
  readonly marginReleaseBase: bigint;
  /** PnL réalisé signé (négatif = perte vers le pool), plafonné à -marge. */
  readonly pnlBase: bigint;
}
