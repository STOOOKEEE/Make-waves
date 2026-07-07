import type { Currency } from "../paper/types";

/** Sens d'une position ouverte. */
export type PositionSide = "long" | "short";

/** Nature du produit suivi en paper (le champ sert surtout à l'affichage). */
export type Product = "spot" | "perp";

/**
 * Position paper ouverte (perp simulé à levier).
 *
 * Montants en `number` JS : dette de précision assumée pour le paper, comme
 * pour les soldes (cf. `paper/equity.ts`). La marge reste comptée dans le cash
 * du compte (elle est *réservée*, pas dépensée) ; seul le PnL non réalisé
 * s'ajoute à l'equity (cf. `position/equity.ts`).
 */
export interface Position {
  readonly id: string;
  readonly product: Product;
  /** Devise de base de la position (ex. "XRP"). */
  readonly symbol: Currency;
  readonly side: PositionSide;
  /** Quantité exprimée dans la devise de base. */
  readonly qty: number;
  /** Prix d'entrée (unités de quote par unité de base). */
  readonly entry: number;
  /** Effet de levier (1 = pas de levier). */
  readonly leverage: number;
  /** Marge immobilisée en devise de quote (notional / leverage). */
  readonly margin: number;
  /** Frais payés à l'ouverture, en devise de quote. */
  readonly fee: number;
}

/** Paramètres d'ouverture d'une position : une `Position` sans son `id` (attribué au stockage). */
export type OpenPositionInput = Omit<Position, "id">;
