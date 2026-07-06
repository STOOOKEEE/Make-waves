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

import type { CreateAgentInput } from "../services/agent-service";
import type { CreateMandateInput } from "../services/mandate-service";
import type { MandateStyle } from "../store/mandate-store";

const AGENT_TYPES = ["external", "integrated"] as const;
const MANDATE_STYLES = [
  "momentum",
  "mean_reversion",
  "dca",
  "grid",
  "mixed",
] as const;

function boundedNum(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
  max: number,
): number {
  const value = num(obj, key, ctx);
  if (value <= 0) {
    throw new BadRequestError(`${ctx}: champ "${key}" doit être > 0`);
  }
  if (value > max) {
    throw new BadRequestError(`${ctx}: champ "${key}" doit être ≤ ${String(max)}`);
  }
  return value;
}

function intPositive(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
  max: number,
): number {
  const value = boundedNum(obj, key, ctx, max);
  if (!Number.isInteger(value)) {
    throw new BadRequestError(`${ctx}: champ "${key}" doit être un entier`);
  }
  return value;
}

function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  ctx: string,
  key: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new BadRequestError(
      `${ctx}: "${key}" doit valoir ${allowed.join(" | ")}`,
    );
  }
  return value as T;
}

function uuid(value: string, ctx: string, key: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestError(`${ctx}: "${key}" doit être un UUID`);
  }
  return value;
}

function shortString(
  obj: Record<string, unknown>,
  key: string,
  ctx: string,
  max: number,
): string {
  const value = str(obj, key, ctx);
  if (value.length > max) {
    throw new BadRequestError(`${ctx}: champ "${key}" ≤ ${String(max)} caractères`);
  }
  return value;
}

/** Corps de création d'un agent (POST /api/agents). */
export function parseCreateAgent(body: unknown): CreateAgentInput {
  const obj = asRecord(body, "createAgent");
  const userId = shortString(obj, "userId", "createAgent", 100);
  const name = shortString(obj, "name", "createAgent", 60);
  const type = oneOf(
    shortString(obj, "type", "createAgent", 20),
    AGENT_TYPES,
    "createAgent",
    "type",
  );
  return { userId, name, type };
}

/** Corps de création d'un mandat (POST /api/mandates). */
export function parseCreateMandate(body: unknown): CreateMandateInput {
  const obj = asRecord(body, "createMandate");
  const agentId = uuid(shortString(obj, "agentId", "createMandate", 100), "createMandate", "agentId");
  const userId = shortString(obj, "userId", "createMandate", 100);
  const capitalMax = boundedNum(obj, "capitalMax", "createMandate", 1e9);
  const perteMaxJour = boundedNum(obj, "perteMaxJour", "createMandate", 1e9);
  const maxTradesPerDay = intPositive(obj, "maxTradesPerDay", "createMandate", 1000);
  const maxLeverage = boundedNum(obj, "maxLeverage", "createMandate", 100);
  const pairsRaw = obj["pairesAutorisees"];
  if (!Array.isArray(pairsRaw) || pairsRaw.length === 0) {
    throw new BadRequestError(
      'createMandate: champ "pairesAutorisees" (string[] non vide) requis',
    );
  }
  if (pairsRaw.length > 50) {
    throw new BadRequestError('createMandate: "pairesAutorisees" ≤ 50 entrées');
  }
  const pairesAutorisees = pairsRaw.map((p, i) => {
    if (typeof p !== "string" || !/^[A-Z0-9]{2,10}$/.test(p)) {
      throw new BadRequestError(
        `createMandate: pairesAutorisees[${String(i)}] doit matcher /^[A-Z0-9]{2,10}$/`,
      );
    }
    return p;
  });
  const styleRaw = obj["style"];
  let style: MandateStyle | null = null;
  if (styleRaw !== null && styleRaw !== undefined) {
    if (typeof styleRaw !== "string") {
      throw new BadRequestError('createMandate: "style" doit être string ou null');
    }
    style = oneOf(styleRaw, MANDATE_STYLES, "createMandate", "style");
  }
  const validUntil = intPositive(obj, "validUntil", "createMandate", Number.MAX_SAFE_INTEGER);
  return {
    agentId,
    userId,
    capitalMax,
    perteMaxJour,
    maxTradesPerDay,
    maxLeverage,
    pairesAutorisees,
    style,
    validUntil,
  };
}

/** Corps du callback de signature Xaman pour un mandat (POST /api/sign/mandate-callback). */
export function parseSignMandateCallback(body: unknown): { mandateId: string; signature: string } {
  const obj = asRecord(body, "signMandateCallback");
  const mandateId = uuid(
    shortString(obj, "mandateId", "signMandateCallback", 100),
    "signMandateCallback",
    "mandateId",
  );
  const signature = shortString(obj, "signature", "signMandateCallback", 2000);
  return { mandateId, signature };
}

/**
 * Corps de provision d'un compte Live (POST /api/agents/:id/live-account).
 * v1 : seul `generate()` (création d'un nouveau wallet) est implémenté.
 * `seed` est parsé pour valider la forme et documenter l'API, mais l'import
 * d'un seed existant renvoie 501 côté route (cf. Tâche 21).
 */
export function parseProvisionLiveAccount(body: unknown): { seed?: string } {
  const obj = asRecord(body, "provisionLiveAccount");
  const seedRaw = obj["seed"];
  if (seedRaw === undefined) {
    return {};
  }
  if (typeof seedRaw !== "string" || seedRaw.trim() === "") {
    throw new BadRequestError(
      'provisionLiveAccount: "seed" doit être une string non vide',
    );
  }
  return { seed: seedRaw };
}
