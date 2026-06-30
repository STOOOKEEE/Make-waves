import type {
  Competition,
  MarketOrderInput,
  OpenPositionInput,
  Side,
} from "@tide/core";
import type { Amount } from "@tide/xrpl";
import type { LiveOfferIntent } from "../exec/plan-live";

/** Corps de requête HTTP malformé (validation au bord, avant le domaine). */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

function asRecord(value: unknown, ctx: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BadRequestError(`${ctx}: objet JSON attendu`);
  }
  return value as Record<string, unknown>;
}

function str(obj: Record<string, unknown>, key: string, ctx: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestError(`${ctx}: champ "${key}" (string non vide) requis`);
  }
  return value;
}

function num(obj: Record<string, unknown>, key: string, ctx: string): number {
  const value = obj[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestError(`${ctx}: champ "${key}" (number) requis`);
  }
  return value;
}

export function parseUserId(body: unknown, ctx: string): { userId: string } {
  const obj = asRecord(body, ctx);
  return { userId: str(obj, "userId", ctx) };
}

export function parseOrder(body: unknown): MarketOrderInput {
  const obj = asRecord(body, "order");
  const pair = asRecord(obj["pair"], "order.pair");
  const side = str(obj, "side", "order");
  if (side !== "buy" && side !== "sell") {
    throw new BadRequestError('order: "side" doit valoir "buy" ou "sell"');
  }
  const narrowedSide: Side = side === "buy" ? "buy" : "sell";
  return {
    pair: {
      base: str(pair, "base", "order.pair"),
      quote: str(pair, "quote", "order.pair"),
    },
    side: narrowedSide,
    amount: num(obj, "amount", "order"),
    price: num(obj, "price", "order"),
  };
}

/**
 * Parse un montant XRPL au bord : string non vide (drops XRP) ou objet
 * `{ currency, issuer, value }` (token émis). On ne valide ici que la FORME ;
 * la sémantique (drops entiers, value décimale stricte) est vérifiée par le
 * builder via `assertValidAmount`, source unique de vérité sur les montants.
 */
function parseAmount(value: unknown, ctx: string): Amount {
  if (typeof value === "string") {
    if (value.trim() === "") {
      throw new BadRequestError(`${ctx}: montant string vide`);
    }
    return value;
  }
  const obj = asRecord(value, ctx);
  return {
    currency: str(obj, "currency", ctx),
    issuer: str(obj, "issuer", ctx),
    value: str(obj, "value", ctx),
  };
}

/**
 * Corps d'une demande de signature de buy-in. Le `sourceTag` (attribution) et la
 * destination (prize pool) ne viennent PAS du client : ils sont fixés côté serveur
 * (sécurité — le client ne choisit ni l'attribution ni où va son argent).
 */
export interface BuyInRequest {
  readonly account: string;
  readonly amount: Amount;
  readonly competitionId: string;
}

export function parseBuyInRequest(body: unknown): BuyInRequest {
  const obj = asRecord(body, "buyIn");
  return {
    account: str(obj, "account", "buyIn"),
    amount: parseAmount(obj["amount"], "buyIn.amount"),
    competitionId: str(obj, "competitionId", "buyIn"),
  };
}

/**
 * Corps d'une intention de swap Live : QUOI échanger (base/side/quantité) et avec
 * quelle tolérance de slippage. Les montants bornés (`gives`/`wants`), l'attribution
 * (`sourceTag`) et l'issuer du quote sont dérivés CÔTÉ SERVEUR par le moteur
 * d'exécution — le client ne les fournit jamais.
 */
export function parseLiveOfferRequest(body: unknown): LiveOfferIntent {
  const obj = asRecord(body, "liveOffer");
  const side = str(obj, "side", "liveOffer");
  if (side !== "buy" && side !== "sell") {
    throw new BadRequestError('liveOffer: "side" doit valoir "buy" ou "sell"');
  }
  return {
    account: str(obj, "account", "liveOffer"),
    base: str(obj, "base", "liveOffer"),
    side,
    amountBase: num(obj, "amountBase", "liveOffer"),
    slippageTolerance: num(obj, "slippageTolerance", "liveOffer"),
  };
}

/**
 * Corps d'ouverture de position : on valide la FORME (champs présents et bien
 * typés, `product`/`side` dans leur domaine). La sémantique (qty/marge > 0,
 * levier borné) est vérifiée par `validateOpenPosition` côté service, source
 * unique de vérité.
 */
export function parseOpenPosition(body: unknown): OpenPositionInput {
  const obj = asRecord(body, "position");
  const product = str(obj, "product", "position");
  if (product !== "spot" && product !== "perp") {
    throw new BadRequestError('position: "product" doit valoir "spot" ou "perp"');
  }
  const side = str(obj, "side", "position");
  if (side !== "long" && side !== "short") {
    throw new BadRequestError('position: "side" doit valoir "long" ou "short"');
  }
  return {
    product,
    symbol: str(obj, "symbol", "position"),
    side,
    qty: num(obj, "qty", "position"),
    entry: num(obj, "entry", "position"),
    leverage: num(obj, "leverage", "position"),
    margin: num(obj, "margin", "position"),
    fee: num(obj, "fee", "position"),
  };
}

export function parseCompetition(body: unknown): Competition {
  const obj = asRecord(body, "competition");
  const weightsRaw = obj["payoutWeights"];
  if (!Array.isArray(weightsRaw) || weightsRaw.length === 0) {
    throw new BadRequestError(
      "competition: champ \"payoutWeights\" (number[] non vide) requis",
    );
  }
  const payoutWeights = weightsRaw.map((weight, index) => {
    if (typeof weight !== "number" || !Number.isFinite(weight)) {
      throw new BadRequestError(
        `competition: payoutWeights[${String(index)}] doit être un number`,
      );
    }
    return weight;
  });
  return {
    id: str(obj, "id", "competition"),
    buyIn: num(obj, "buyIn", "competition"),
    rakeRatio: num(obj, "rakeRatio", "competition"),
    payoutWeights,
  };
}
