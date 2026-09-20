// Outils de trading perp à levier — positions perpétuelles ouvertes/fermées
// sous garde-fous durs (RISK_LIMIT) + audit obligatoire (recordAction) +
// idempotence via client_order_id (open uniquement). `close_position` réduit
// l'exposition, donc pas de garde à l'ouverture — audit tout de même.
import { McpError } from "../lib/errors";
import { enforceRiskLimits } from "../lib/guard";
import { recordAction } from "../lib/audit";
import type { ToolDef } from "./index";

const SYMBOL_RE = /^[A-Z0-9]{2,10}$/;

export const openPositionTool: ToolDef = {
  name: "open_position",
  description:
    "Open a leveraged perpetual position. Subject to mandate risk limits.",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string" },
      side: { type: "string", enum: ["long", "short"] },
      qty: { type: "number" },
      leverage: { type: "number", minimum: 1, maximum: 100 },
      tp: { type: "number" },
      sl: { type: "number" },
      client_order_id: {
        type: "string",
        description: "UUID for idempotency — same key twice returns the original result",
      },
    },
    required: ["symbol", "side", "qty", "leverage"],
  },
  handler: async (args, ctx) => {
    const symbol = String(args["symbol"] ?? "").toUpperCase();
    const side = String(args["side"] ?? "") as "long" | "short";
    const qty = Number(args["qty"]);
    const leverage = Number(args["leverage"]);
    const tp = args["tp"] !== undefined ? Number(args["tp"]) : undefined;
    const sl = args["sl"] !== undefined ? Number(args["sl"]) : undefined;
    const clientOrderId =
      typeof args["client_order_id"] === "string" && args["client_order_id"]
        ? args["client_order_id"]
        : null;

    if (!SYMBOL_RE.test(symbol)) {
      throw new McpError("INVALID_PARAMS", `Invalid symbol '${symbol}'`);
    }
    if (side !== "long" && side !== "short") {
      throw new McpError("INVALID_PARAMS", "side must be 'long' or 'short'");
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new McpError("INVALID_PARAMS", "qty must be positive and finite");
    }
    if (!Number.isFinite(leverage) || leverage < 1) {
      throw new McpError("INVALID_PARAMS", "leverage must be >= 1");
    }

    const mandate = ctx.mandate;
    if (!mandate) {
      throw new McpError("MANDATE_INVALID", "No active mandate");
    }

    const px = (await ctx.priceFeed.priceOf(symbol))?.usd;
    if (px === undefined || px === null) {
      throw new McpError("MARKET_ERROR", `No price for ${symbol}`);
    }

    const tradesJour = await ctx.actions.countToday(
      mandate.agentId,
      mandate.userId,
    );

    // Pour un perp à levier : la marge réservée = (qty * price) / leverage.
    // C'est le capitalEngaged passé au guard — borne supérieure sur l'engagement total.
    const auditParams = { symbol, side, qty, leverage, tp, sl, clientOrderId };

    try {
      await enforceRiskLimits({
        mandate,
        symbol,
        // Le guard raisonne en buy/sell ; long = buy (le trader profite de la hausse),
        // short = sell (le trader profite de la baisse).
        side: side === "long" ? "buy" : "sell",
        qty,
        leverage,
        capitalEngaged: (qty * px) / leverage,
        perteJour: 0,
        tradesJour,
        priceUsd: px,
      });

      const result = await ctx.perp.openPosition({
        userId: mandate.userId,
        symbol,
        side,
        qty,
        leverage,
        tp,
        sl,
        clientOrderId: clientOrderId ?? undefined,
      });
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "open_position",
        params: auditParams,
        result,
        error: null,
        idempotencyKey: clientOrderId,
      });
      ctx.broadcaster?.emit({
        type: "agent_action",
        agentId: mandate.agentId,
        tool: "open_position",
        result,
      });
      return result;
    } catch (err) {
      // Préserve les codes McpError spécifiques (RISK_LIMIT, MARKET_ERROR, MANDATE_INVALID)
      // — ne pas tout envelopper en TRADING_ERROR, l'agent/LLM a besoin du code distinct.
      if (!(err instanceof McpError)) {
        const message = err instanceof Error ? err.message : String(err);
        await recordAction(ctx.actions, {
          agentId: mandate.agentId,
          userId: mandate.userId,
          toolName: "open_position",
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
        toolName: "open_position",
        params: auditParams,
        result: null,
        error: err.message,
        idempotencyKey: clientOrderId,
      });
      throw err;
    }
  },
};

export const closePositionTool: ToolDef = {
  name: "close_position",
  description:
    "Close an open perpetual position by id. Realizes the PnL.",
  inputSchema: {
    type: "object",
    properties: {
      position_id: {
        type: "string",
        description: "Position id returned by open_position",
      },
    },
    required: ["position_id"],
  },
  handler: async (args, ctx) => {
    const positionId = String(args["position_id"] ?? "");
    if (!positionId) {
      throw new McpError("INVALID_PARAMS", "position_id required");
    }
    const mandate = ctx.mandate;
    if (!mandate) {
      throw new McpError("MANDATE_INVALID", "No active mandate");
    }

    const auditParams = { positionId };

    try {
      const result = await ctx.perp.closePosition({
        userId: mandate.userId,
        positionId,
      });
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "close_position",
        params: auditParams,
        result,
        error: null,
        idempotencyKey: null,
      });
      ctx.broadcaster?.emit({
        type: "agent_action",
        agentId: mandate.agentId,
        tool: "close_position",
        result,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordAction(ctx.actions, {
        agentId: mandate.agentId,
        userId: mandate.userId,
        toolName: "close_position",
        params: auditParams,
        result: null,
        error: message,
        idempotencyKey: null,
      });
      throw new McpError("TRADING_ERROR", message);
    }
  },
};
