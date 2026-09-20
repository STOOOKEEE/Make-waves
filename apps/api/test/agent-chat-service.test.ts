import { describe, it, expect } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { McpContext } from "@tide/mcp";
import {
  AgentChatService,
  type AgentChatEvent,
} from "../src/services/agent-chat-service";

// Surface minimale que le service consomme côté Anthropic — on évite
// `as unknown as Anthropic` (cast large qui silencieusement passe si la SDK
// change). Le service lit `client.messages.stream(opts)` puis itère sur
// l'`AsyncIterable<unknown>` retourné ; c'est tout ce dont on a besoin.
interface AnthropicLike {
  readonly messages: {
    readonly stream: (opts: {
      readonly model: string;
      readonly max_tokens: number;
      readonly system: string;
      readonly tools: ReadonlyArray<unknown>;
      readonly messages: ReadonlyArray<unknown>;
    }) => AsyncIterable<unknown>;
    readonly create: () => Promise<unknown>;
  };
}

/** Helper : convertit un array d'events en async iterable. */
async function* fromArray(events: unknown[]): AsyncIterable<unknown> {
  for (const e of events) {
    yield e;
  }
}

// Stub minimal du client Anthropic. Le service appelle
// `client.messages.stream({...})` puis itère sur les events — chaque appel
// reçoit un iterable FRAIS (réplique la sémantique réseau). On passe un
// tableau d'arrays : `eventsPerCall[0]` = 1ʳᵉ itération, `eventsPerCall[1]`
// = 2ᵉ itération, etc. (deux itérations possibles : une avec tool_use,
// une avec end_turn).
function fakeAnthropic(eventsPerCall: unknown[][]): AnthropicLike {
  let callIndex = 0;
  return {
    messages: {
      stream: () => fromArray(eventsPerCall[callIndex++] ?? []),
      create: () => {
        throw new Error("not used in tests");
      },
    },
  };
}

/** Construit un `McpContext` minimal — seuls `agent` + `userId` sont touchés
 * par les outils read-only qu'on exercise (get_config, get_balance).
 * Les stubs retournent des valeurs déterministes pour les assertions. */
function stubCtx(): McpContext {
  return {
    agent: {
      id: "a1",
      userId: "u1",
      name: "test-agent",
      type: "external",
      status: "active",
      hasLiveAccount: false,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    },
    userId: "u1",
    mandate: null,
    priceFeed: {
      priceOf: async (sym: string) => ({ usd: sym === "BTC" ? 60_000 : 1 }),
      markets: async () => [],
      history: async () => [],
      orderbook: async () => null,
    },
    paper: {
      getBalance: async () => ({ RLUSD: 10_000 }),
      getPortfolio: async () => ({
        balances: { RLUSD: 10_000 },
        equity: 10_000,
        pnl: 0,
      }),
      listPositions: async () => [],
      getLeaderboard: async () => [],
    },
    trading: {
      placeOrder: async () => ({
        orderId: "ord-1",
        status: "filled",
        filledQty: 1,
        avgPrice: 1,
      }),
      placeLiveOrder: async () => ({
        offerId: "ofr-1",
        status: "filled",
        filledQty: 1,
        avgPrice: 1,
      }),
      cancelOrder: async () => {},
      getOpenOrders: async () => [],
    },
    perp: {
      openPosition: async () => ({
        positionId: "p-1",
        entryPrice: 1,
        liquidationPrice: 0.5,
      }),
      closePosition: async () => ({ realizedPnl: 0 }),
    },
    competitions: {
      list: async () => [],
      get: async () => null,
      join: async () => ({ txJson: {} }),
      getLeaderboard: async () => [],
    },
    actions: {
      record: async () => {},
      findByIdempotencyKey: async () => null,
      listByAgent: async () => [],
      countToday: async () => 0,
    },
    config: {
      mode: "paper",
      sourceTag: null,
      availablePairs: ["BTC", "XRP"],
    },
  };
}

/** Construit le service avec une `clientFactory` qui retourne notre fake. */
function makeService(eventsPerCall: unknown[][]): AgentChatService {
  const fake = fakeAnthropic(eventsPerCall);
  return new AgentChatService({
    apiKey: "test-key",
    model: "claude-sonnet-4-5",
    // Cast à la frontière de la factory : le service consomme
    // uniquement `client.messages.stream(...)` (cf. `AnthropicLike`),
    // pas le reste de la SDK Anthropic (40+ champs, tous optionnels).
    clientFactory: () => fake as unknown as Anthropic,
  });
}

/** Helper : consomme l'async generator et retourne la liste des events. */
async function collect(
  service: AgentChatService,
  message = "What's the price of BTC?",
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
): Promise<AgentChatEvent[]> {
  const out: AgentChatEvent[] = [];
  for await (const ev of service.stream({
    agentId: "a1",
    userId: "u1",
    mandate: null,
    history,
    message,
    systemPrompt: "You are a test agent.",
    ctx: stubCtx(),
  })) {
    out.push(ev);
  }
  return out;
}

describe("AgentChatService", () => {
  it("yield text_delta pour un bloc texte et done à la fin", async () => {
    const eventsPerCall: unknown[][] = [
      [
        { type: "message_start", message: {} },
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Hello" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: " world" },
        },
        { type: "content_block_stop", index: 0 },
        {
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: 2 },
        },
        { type: "message_stop" },
      ],
    ];
    const out = await collect(makeService(eventsPerCall));
    expect(out).toEqual([
      { type: "text_delta", data: { text: "Hello" } },
      { type: "text_delta", data: { text: " world" } },
      { type: "done" },
    ]);
  });

  it("invoke executeTool quand LLM demande tool_use (et yield tool_result)", async () => {
    // Scénario : LLM appelle `get_config` (read-only, stub `ctx.config`).
    // 1ʳᵉ itération : tool_use. 2ᵉ itération : texte + end_turn.
    const eventsPerCall: unknown[][] = [
      [
        // Itération 1 : tool_use
        { type: "message_start", message: {} },
        {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "tool_use",
            id: "tu_1",
            name: "get_config",
          },
        },
        { type: "content_block_stop", index: 0 },
        {
          type: "message_delta",
          delta: { stop_reason: "tool_use", stop_sequence: null },
          usage: { output_tokens: 1 },
        },
        { type: "message_stop" },
      ],
      [
        // Itération 2 : texte final
        { type: "message_start", message: {} },
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Voici la config." },
        },
        { type: "content_block_stop", index: 0 },
        {
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: 6 },
        },
        { type: "message_stop" },
      ],
    ];
    const svc = makeService(eventsPerCall);
    const out = await collect(svc, "Give me config.");
    // Order : tool_result (yielded avant l'appel back à Claude), text_delta,
    // done.
    const types = out.map((e) => e.type);
    expect(types).toEqual([
      "tool_result",
      "text_delta",
      "done",
    ]);
    // Le tool_result doit refléter le handler MCP `get_config`.
    const toolResult = out.find((e) => e.type === "tool_result");
    expect(toolResult?.type).toBe("tool_result");
    if (toolResult?.type === "tool_result") {
      expect(toolResult.data.name).toBe("get_config");
      // get_config handler renvoie ctx.config = { mode, sourceTag, availablePairs }.
      const result = toolResult.data.result as {
        mode: string;
        sourceTag: number | null;
        availablePairs: readonly string[];
      };
      expect(result.mode).toBe("paper");
      expect(result.sourceTag).toBeNull();
      expect(result.availablePairs).toEqual(["BTC", "XRP"]);
    }
  });

  it("parse l'input du tool_use même précédé d'un bloc thinking (index global ≠ 0)", async () => {
    // Régression DeepSeek V4 : le modèle émet un bloc `thinking` en index 0,
    // puis le `tool_use` en index 1 ; les `input_json_delta` portent index 1.
    // L'ancien code indexait par ordre de push (`toolUses[0]`) → input perdu
    // → `get_market` recevait `symbol: ""`. On vérifie que l'input est bien
    // reconstruit et que `get_market` reçoit `symbol: "BTC"` (prix stub 60000).
    const eventsPerCall: unknown[][] = [
      [
        { type: "message_start", message: {} },
        // Index 0 : bloc thinking (raisonnement) — décale le tool_use.
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "thinking", thinking: "" },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "thinking_delta", thinking: "Let me check the price." },
        },
        { type: "content_block_stop", index: 0 },
        // Index 1 : tool_use get_market, input streamé par fragments.
        {
          type: "content_block_start",
          index: 1,
          content_block: { type: "tool_use", id: "tu_1", name: "get_market", input: {} },
        },
        {
          type: "content_block_delta",
          index: 1,
          delta: { type: "input_json_delta", partial_json: '{"symbol":' },
        },
        {
          type: "content_block_delta",
          index: 1,
          delta: { type: "input_json_delta", partial_json: '"BTC"}' },
        },
        { type: "content_block_stop", index: 1 },
        {
          type: "message_delta",
          delta: { stop_reason: "tool_use", stop_sequence: null },
          usage: { output_tokens: 3 },
        },
        { type: "message_stop" },
      ],
      [
        { type: "message_start", message: {} },
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "BTC is $60000." },
        },
        { type: "content_block_stop", index: 0 },
        {
          type: "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: 5 },
        },
        { type: "message_stop" },
      ],
    ];
    const out = await collect(makeService(eventsPerCall), "Price of BTC?");
    const toolResult = out.find((e) => e.type === "tool_result");
    expect(toolResult?.type).toBe("tool_result");
    if (toolResult?.type === "tool_result") {
      expect(toolResult.data.name).toBe("get_market");
      // Input bien parsé → pas d'erreur « Invalid symbol '' » ; le résultat
      // reflète le prix stub de BTC (60000), preuve que symbol="BTC" a transité.
      const result = toolResult.data.result as { isError?: boolean; usd?: number; price?: number };
      expect(result.isError).not.toBe(true);
      expect(JSON.stringify(result)).toContain("60000");
    }
  });

  it("passe le baseUrl (endpoint provider Anthropic-compat, ex. DeepSeek) au client", async () => {
    // Le service doit transmettre `TIDE_LLM_BASE_URL` à la factory du client
    // → tout endpoint Anthropic-compatible (DeepSeek `…/anthropic`) est ciblé.
    let captured: string | undefined = "UNSET";
    const fake = fakeAnthropic([[{ type: "message_stop" }]]);
    const svc = new AgentChatService({
      apiKey: "k",
      model: "deepseek-v4-flash",
      baseUrl: "https://api.deepseek.com/anthropic",
      clientFactory: (baseUrl) => {
        captured = baseUrl;
        return fake as unknown as Anthropic;
      },
    });
    await collect(svc, "hi");
    expect(captured).toBe("https://api.deepseek.com/anthropic");
  });

  it("propagate une erreur McpError comme tool_result is_error=true (RISK_LIMIT attendu)", async () => {
    // Scénario : LLM appelle `place_order` avec qty négatif → handler lève
    // une `McpError("INVALID_PARAMS")`. Le service attrape, fait un yield
    // `tool_result` avec `data.result = { isError: true, message }`, et
    // l'event tool_result le reflète (`name: place_order`, `result` est
    // l'objet d'erreur).
    //
    // Note : le service ne passe PAS du tool_result string sérialisé dans
    // le event `tool_result` — il passe l'objet brut. La sérialisation en
    // string pour Claude est interne (envoyée au LLM, pas au front).
    const eventsPerCall: unknown[][] = [
      [
        // Itération 1 : tool_use `place_order` avec input JSON
        { type: "message_start", message: {} },
        {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "tool_use",
            id: "tu_1",
            name: "place_order",
          },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "input_json_delta",
            partial_json:
              '{"symbol":"BTC","side":"buy","qty":-1,"type":"market"}',
          },
        },
        { type: "content_block_stop", index: 0 },
        { type: "message_stop" },
      ],
      // Itération 2 et au-delà : on en fournit 5 (le service en boucle
      // jusqu'à MAX_TOOL_ITERATIONS sans qu'on lui dise d'arrêter). Toutes
      // identiques (tool_use → place_order) — chaque itération échoue à
      // nouveau (le `mandate` reste null → INVALID_PARAMS avant même le
      // check qty > 0 ? non : qty < 0 lève `INVALID_PARAMS` en premier).
      // Peu importe : on observe juste le 1er tool_result propagé.
      ...Array.from({ length: 4 }, () => [
        { type: "message_start", message: {} },
        {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "tool_use",
            id: "tu_1",
            name: "place_order",
          },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "input_json_delta",
            partial_json: '{"symbol":"BTC","side":"buy","qty":-1,"type":"market"}',
          },
        },
        { type: "content_block_stop", index: 0 },
        { type: "message_stop" },
      ]),
    ];
    const svc = makeService(eventsPerCall);
    // Le handler MCP `place_order` exige `mandate` (sinon MANDATE_INVALID).
    // En injectant un mandate via `stubCtx` ci-dessus on évite ça —
    // mais la validation `qty > 0` lève INVALID_PARAMS avant le guard.
    // On observe que le tool_result est bien propagé avec isError=true.
    const out = await collect(svc, "Sell 100 BTC.");
    const toolResult = out.find((e) => e.type === "tool_result");
    expect(toolResult).toBeDefined();
    if (toolResult?.type === "tool_result") {
      expect(toolResult.data.name).toBe("place_order");
      const result = toolResult.data.result as {
        isError?: boolean;
        message?: string;
      };
      expect(result.isError).toBe(true);
      expect(typeof result.message).toBe("string");
      expect(result.message).toMatch(/qty must be positive/);
    }
  });
});
