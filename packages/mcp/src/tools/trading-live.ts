// Live execution path for `place_order`.
//
// This module is **not** a standalone tool — it's the live-specific delegate
// used by `placeOrderTool` (in trading-spot.ts) when `ctx.config.mode === "live"`.
// It owns:
//   • the seed decrypt via `ctx.liveCrypto?.decryptAgentSeed(...)`,
//   • the live `OfferCreate` signing + submission via `ctx.trading.placeLiveOrder`.
//
// Note: the risk guard (`enforceRiskLimits`) is applied **once** upstream in
// `placeOrderTool` — both Paper and Live paths share the same gate.
import { McpError } from "../lib/errors";
import type {
  Mandate,
  McpContext,
  PlaceLiveOrderInput,
  PlaceLiveOrderResult,
} from "../types";

export interface ExecuteLiveOrderInput {
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly qty: number;
  readonly type: "market" | "limit";
  readonly price?: number;
  readonly slippageTolerance?: number;
  readonly clientOrderId?: string;
}


export async function executeLiveOrder(
  ctx: McpContext,
  mandate: Mandate,
  intent: ExecuteLiveOrderInput,
): Promise<PlaceLiveOrderResult> {
  if (!ctx.liveCrypto) {
    throw new McpError(
      "TRADING_ERROR",
      "LiveCryptoService not wired — set TIDE_AGENT_KEY_MASTER or run in Paper mode",
    );
  }
  const { seed, address } = await ctx.liveCrypto.decryptAgentSeed(
    mandate.agentId,
  );

  const liveInput: PlaceLiveOrderInput = {
    userId: mandate.userId,
    symbol: intent.symbol,
    side: intent.side,
    qty: intent.qty,
    type: intent.type,
    price: intent.price,
    slippageTolerance: intent.slippageTolerance,
    agentSeed: seed,
    agentAddress: address,
    clientOrderId: intent.clientOrderId,
  };

  return ctx.trading.placeLiveOrder(liveInput);
}
