/** Code d'une devise XRPL (ex. "XRP", "RLUSD"). */
export type Currency = string;

/** Sens d'un ordre. */
export type Side = "buy" | "sell";

/** Paire de trading : on achète/vend la `base`, valorisée en `quote`. */
export interface Pair {
  readonly base: Currency;
  readonly quote: Currency;
}

/** Soldes d'un portefeuille, indexés par devise. */
export interface Balances {
  readonly [currency: Currency]: number;
}

/** Carte de prix : devise -> prix en devise de référence (quote). */
export interface PriceMap {
  readonly [currency: Currency]: number;
}

/** Ordre marché paper, exécuté au prix réel fourni (pas de slippage en MVP). */
export interface MarketOrderInput {
  readonly pair: Pair;
  readonly side: Side;
  /** Quantité exprimée dans la devise de base. */
  readonly amount: number;
  /** Prix réel (unités de quote par unité de base) au moment de l'ordre. */
  readonly price: number;
}

/** Résultat d'exécution d'un ordre marché. */
export interface Fill {
  readonly pair: Pair;
  readonly side: Side;
  readonly amount: number;
  readonly price: number;
  /** Montant en devise de quote : coût (achat) ou produit (vente). */
  readonly quoteAmount: number;
}
