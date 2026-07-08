// Outils de trading spot — premier outil d'écriture avec garde-fous durs
// (RISK_LIMIT) + audit obligatoire (recordAction) + idempotence via client_order_id.
// `placeOrderTool` branche Paper vs Live selon `ctx.config.mode` ; le path Live
// (signe + soumet l'`OfferCreate` avec le seed déchiffré de l'agent) vit dans
// `./trading-live.ts`.
import { McpError } from "../lib/errors";
import { enforceRiskLimits } from "../lib/guard";
import { recordAction } from "../lib/audit";
import { executeLiveOrder } from "./trading-live";
import type { ToolDef } from "./index";

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/;

export const placeOrderTool: ToolDef = {
  name: "place_order",
  description:
    "Place a spot order (market or limit). Subject to mandate risk limits.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      side: { type: "string", enum: ["buy", "sell"] },
      qty: { type: "number" },
      type: { type: "string", enum: ["market", "limit"] },
      price: { type: "number" },
      client_order_id: {
        type: "string",
        description: "UUID for idempotency — same key twice returns the original result",
      },
    },
    required: ["symbol", "side", "qty", "type"],
  },
  handler: async (args, ctx) => {
    const symbol = String(args["symbol"] ?? "").toUpperCase();
    const side = String(args["side"] ?? "") as "buy" | "sell";
    const qty = Number(args["qty"]);
    const type = String(args["type"] ?? "market") as "market" | "limit";
    const price = args["price"] !== undefined ? Number(args["price"]) : undefined;
    const clientOrderId =
      typeof args["client_order_id"] === "string" && args["client_order_id"]
        ? args["client_order_id"]
        : null;

    if (!SYMBOL_RE.test(symbol)) {
      throw new McpError("INVALID_PARAMS", `Invalid symbol '${symbol}'`);
    }
    if (side !== "buy" && side !== "sell") {
      throw new McpError("INVALID_PARAMS", "side must be 'buy' or 'sell'");
    }
    if (type !== "market" && type !== "limit") {
      throw new McpError("INVALID_PARAMS", "type must be 'market' or 'limit'");
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new McpError("INVALID_PARAMS", "qty must be positive and finite");
    }

    const mandate = ctx.mandate;
    if (!mandate) {
      throw new McpError("MANDATE_INVALID", "No active mandate");
    }

    const px = price ?? (await ctx.priceFeed.priceOf(symbol))?.usd;
    if (px === undefined || px === null) {
      throw new McpError("MARKET_ERROR", `No price for ${symbol}`);
    }

    const tradesJour = await ctx.actions.countToday(
      mandate.agentId,
      mandate.userId,
    );

    // Pour les market orders, le capital est engagé à l'exécution : qty * price.
    // Pour les limit non exécutés, le capital n'est engagé qu'au remplissage :
    // le guard re-vérifiera à l'exécution (Tâche future côté backend).
    const capitalEngaged = qty * px;

    const auditParams = { symbol, side, qty, type, price, clientOrderId };

    try {
      await enforceRiskLimits({
        mandate,
        symbol,
        side,
        qty,
        leverage: 1,
        capitalEngaged: type === "market" ? capitalEngaged : 0,
        perteJour: 0,
        tradesJour,
        priceUsd: px,
      });

      const mode = ctx.config.mode;
      const result =
        mode === "live"
          ? await executeLiveOrder(
              ctx,
              mandate,
              {
                symbol,
                side,
                qty,
                type,
                price,
                clientOrderId: clientOrderId ?? undefined,
              },
            )
          : await ctx.trading.placeOrder({
              userId: mandate.userId,
              symbol,
              side,
              qty,
              type,
              // px = prix résolu (feed pour un market, prix explicite pour un limit).
              // La route paper exécute au prix fourni → on transmet px, pas l'arg brut
              // (undefined en market, ce qui ferait échouer la valorisation backend).
              price: px,
              clientOrderId: clientOrderId ?? undefined,
            });
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "place_order",
        params: auditParams,
        result,
        error: null,
        idempotencyKey: clientOrderId,
      });
      ctx.broadcaster?.emit({
        type: "agent_action",
        agentId: mandate.agentId,
        tool: "place_order",
        result,
      });
      return result;
    } catch (err) {
      // Préserve les codes McpError spécifiques (RISK_LIMIT, MARKET_ERROR, MANDATE_INVALID)
      // — ne pas tout envelopper en TRADING_ERROR, l'agent/LLM a besoin du code distinct
      // pour décider (refus définitif vs ré-essai sur prix manquant, etc.).
      if (!(err instanceof McpError)) {
        const message = err instanceof Error ? err.message : String(err);
        await recordAction(ctx.actions, {
          agentId: mandate.agentId,
          userId: mandate.userId,
          toolName: "place_order",
          params: auditParams,
          result: null,
          error: message,
          idempotencyKey: clientOrderId,
        });
        throw new McpError("TRADING_ERROR", message);
      }
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "place_order",
        params: auditParams,
        result: null,
        error: err.message,
        idempotencyKey: clientOrderId,
      });
      throw err;
    }
  },
};

export const cancelOrderTool: ToolDef = {
  name: "cancel_order",
  description: "Cancel an open limit order by id.",
  inputSchema: {
    type: "object",
    properties: {
      order_id: { type: "string", description: "Order id returned by place_order" },
    },
    required: ["order_id"],
  },
  handler: async (args, ctx) => {
    const orderId = String(args["order_id"] ?? "");
    if (!orderId) {
      throw new McpError("INVALID_PARAMS", "order_id required");
    }
    const mandate = ctx.mandate;
    if (!mandate) {
      throw new McpError("MANDATE_INVALID", "No active mandate");
    }

    const auditParams = { orderId };

    try {
      await ctx.trading.cancelOrder(mandate.userId, orderId);
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "cancel_order",
        params: auditParams,
        result: { cancelled: true },
        error: null,
        idempotencyKey: null,
      });
      return { cancelled: true, orderId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "cancel_order",
        params: auditParams,
        result: null,
        error: message,
        idempotencyKey: null,
      });
      throw new McpError("TRADING_ERROR", message);
    }
  },
};