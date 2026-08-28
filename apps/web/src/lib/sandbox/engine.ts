/* ===== Bac à sable du tutoriel — moteur de simulation =====
 *
 * 100 % pur et 100 % local : ce module ne connaît ni le réseau, ni Vue, ni le
 * DOM. Il calcule des remplissages, de la marge, un prix de liquidation et des
 * déclencheurs TP/SL sur des prix réels lus ailleurs.
 *
 * Deux principes non négociables :
 *  1. **Aucune écriture serveur.** Le bac à sable n'a aucun chemin vers les
 *     routes gardées `POST /accounts/:id/orders` et `.../positions` : il ne peut
 *     donc structurellement pas interférer avec le funnel wallet Paper.
 *  2. **Les mêmes chiffres que le vrai terminal.** Frais, formule de PnL et
 *     prix de liquidation sont repris du produit (`@tide/core` pour le PnL),
 *     pour que ce qui est appris ici se retrouve tel quel là-bas.
 */
import { positionPnl } from "@tide/core";
import type { BookDepth } from "@tide/client";

/** Capital de départ, aligné sur le compte Paper réel. */
export const SIM_STARTING_EQUITY = 10_000;
/** Frais du vrai ticket : poster de la liquidité coûte moins cher que la prendre. */
export const SIM_MAKER_FEE = 0.0002;
export const SIM_TAKER_FEE = 0.0006;

export type SimProduct = "spot" | "perp";
export type SimSide = "buy" | "sell";
export type SimLiquidity = "maker" | "taker";
export type SimCloseReason = "manual" | "take-profit" | "stop-loss" | "liquidation";

export interface SimPosition {
  readonly id: string;
  readonly at: number;
  readonly symbol: string;
  readonly product: SimProduct;
  readonly side: "long" | "short";
  readonly qty: number;
  readonly entry: number;
  readonly leverage: number;
  readonly margin: number;
  readonly fee: number;
  readonly takeProfit: number | null;
  readonly stopLoss: number | null;
}

export interface SimFill {
  readonly id: string;
  readonly at: number;
  readonly symbol: string;
  readonly side: SimSide;
  readonly product: SimProduct;
  readonly qty: number;
  readonly price: number;
  readonly fee: number;
  readonly liquidity: SimLiquidity;
  readonly leverage: number;
}

export interface SimClosed {
  readonly position: SimPosition;
  readonly at: number;
  readonly exit: number;
  readonly pnl: number;
  readonly fee: number;
  readonly reason: SimCloseReason;
}

export interface OpenInput {
  readonly symbol: string;
  readonly product: SimProduct;
  readonly side: SimSide;
  /** Montant engagé en devise de quote (la marge en perp, le notionnel en spot). */
  readonly amount: number;
  readonly leverage: number;
  readonly liquidity: SimLiquidity;
  readonly takeProfit: number | null;
  readonly stopLoss: number | null;
}

/**
 * Prix effectivement obtenu. Un ordre taker traverse le spread et paie le
 * meilleur ask (à l'achat) ou le meilleur bid (à la vente) ; un ordre maker se
 * pose du bon côté et obtient le prix médian au mieux. C'est la démonstration
 * concrète de « le spread est un coût réel ».
 */
export function fillPrice(
  mark: number,
  side: SimSide,
  liquidity: SimLiquidity,
  book: BookDepth | null,
): number {
  if (liquidity === "maker" || book === null) return mark;
  const level = side === "buy" ? book.asks[0]?.price : book.bids[0]?.price;
  return level !== undefined && level > 0 ? level : mark;
}

/** Le levier n'existe qu'en perp : le spot est toujours à 1x. */
export function effectiveLeverage(product: SimProduct, leverage: number): number {
  return product === "perp" ? Math.max(1, Math.trunc(leverage)) : 1;
}

/**
 * Prix auquel la marge est entièrement consommée. À 20x il suffit d'un
 * mouvement de 5 % à contresens ; à 2x il en faut 50 %. C'est le chiffre que le
 * tutoriel fait bouger sous les yeux de l'utilisateur.
 */
export function liquidationPrice(position: SimPosition): number | null {
  if (position.product !== "perp" || position.leverage <= 1) return null;
  const direction = position.side === "long" ? -1 : 1;
  return position.entry * (1 + (direction * 1) / position.leverage);
}

/**
 * Perte encourue si le stop est touché, en devise de quote. Signature
 * structurelle : sert aussi bien à une position ouverte qu'à un ticket en cours
 * de saisie, sans conversion de type.
 */
export function riskAtStop(input: {
  readonly entry: number;
  readonly stopLoss: number | null;
  readonly qty: number;
}): number | null {
  if (input.stopLoss === null) return null;
  return Math.abs(input.entry - input.stopLoss) * input.qty;
}

export function unrealizedPnl(position: SimPosition, mark: number): number {
  // Réutilise la formule du domaine : une seule règle de PnL dans tout Tide.
  return positionPnl(
    {
      id: position.id,
      product: position.product,
      symbol: position.symbol,
      side: position.side,
      qty: position.qty,
      entry: position.entry,
      leverage: position.leverage,
      margin: position.margin,
      fee: position.fee,
    },
    mark,
  );
}

export function openSim(
  input: OpenInput,
  mark: number,
  book: BookDepth | null,
  now: number,
  id: string,
): { position: SimPosition; fill: SimFill } {
  const leverage = effectiveLeverage(input.product, input.leverage);
  const price = fillPrice(mark, input.side, input.liquidity, book);
  const notional = input.amount * leverage;
  const qty = notional / price;
  const feeRate = input.liquidity === "maker" ? SIM_MAKER_FEE : SIM_TAKER_FEE;
  const fee = notional * feeRate;

  const position: SimPosition = {
    id,
    at: now,
    symbol: input.symbol,
    product: input.product,
    side: input.side === "buy" ? "long" : "short",
    qty,
    entry: price,
    leverage,
    margin: input.amount,
    fee,
    takeProfit: input.takeProfit,
    stopLoss: input.stopLoss,
  };

  const fill: SimFill = {
    id,
    at: now,
    symbol: input.symbol,
    side: input.side,
    product: input.product,
    qty,
    price,
    fee,
    liquidity: input.liquidity,
    leverage,
  };

  return { position, fill };
}

/**
 * Ce qui doit fermer la position au prix courant, s'il y a lieu.
 * **La précédence compte** : une liquidation l'emporte sur un stop, qui l'emporte
 * sur un take-profit. Dans un même mouvement, on ne peut pas encaisser un gain
 * si la marge a déjà été consommée.
 */
export function triggerFor(position: SimPosition, mark: number): SimCloseReason | null {
  const liq = liquidationPrice(position);
  if (liq !== null) {
    const hit = position.side === "long" ? mark <= liq : mark >= liq;
    if (hit) return "liquidation";
  }
  if (position.stopLoss !== null) {
    const hit = position.side === "long" ? mark <= position.stopLoss : mark >= position.stopLoss;
    if (hit) return "stop-loss";
  }
  if (position.takeProfit !== null) {
    const hit =
      position.side === "long" ? mark >= position.takeProfit : mark <= position.takeProfit;
    if (hit) return "take-profit";
  }
  return null;
}

export function closeSim(
  position: SimPosition,
  mark: number,
  reason: SimCloseReason,
  now: number,
): SimClosed {
  // Une liquidation se règle au prix de liquidation, pas au prix courant : c'est
  // ce qui garantit que la perte est exactement la marge, jamais davantage.
  const liq = liquidationPrice(position);
  const exit = reason === "liquidation" && liq !== null ? liq : mark;
  const gross = unrealizedPnl(position, exit);
  const fee = exit * position.qty * SIM_TAKER_FEE;
  // Plancher à -marge : on ne peut pas perdre plus que ce qu'on a engagé.
  const pnl = Math.max(gross, -position.margin);
  return { position, at: now, exit, pnl, fee, reason };
}

/**
 * Équité totale. La marge est **réservée dans le cash, pas dépensée** (même
 * convention que `@tide/core` : `position/equity.ts`), donc elle y est déjà
 * comptée — il ne faut surtout pas la rajouter ici, sous peine de la
 * double-compter. Seul le PnL latent s'ajoute.
 */
export function simEquity(
  cash: number,
  positions: readonly SimPosition[],
  mark: number,
): number {
  return positions.reduce(
    (total, position) => total + unrealizedPnl(position, mark),
    cash,
  );
}
