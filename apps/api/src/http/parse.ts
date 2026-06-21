import type { Competition, MarketOrderInput, Side } from "@tide/core";

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
