// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentChat } from "../src/composables/useAgentChat";
import { useSession } from "../src/composables/useSession";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";

beforeEach(() => {
  useSession().disconnectWallet();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Construit un `Response` qui stream une liste d'événements SSE. */
function sseResponse(events: Array<Record<string, unknown>>, status = 200): Response {
  const body = events
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join("");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** Construit un `Response` chunké : chaque bloc est poussé séparément (simule
 *  l'arrivée progressive des events, comme un vrai stream SSE). */
function chunkedSseResponse(
  chunks: Array<string>,
  status = 200,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(new TextEncoder().encode(c));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/** Récupère les arguments du `fetch` appelé par le composable. */
function fetchCalls(): Array<{ url: string; init?: RequestInit }> {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => ({
    url: url as string,
    init: init as RequestInit,
  }));
}

describe("useAgentChat", () => {
  it("send accumule les text_delta dans un message assistant", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const mockResponse = sseResponse([
      { type: "text_delta", data: { text: "Hello " } },
      { type: "text_delta", data: { text: "world" } },
      { type: "text_delta", data: { text: "!" } },
      { type: "done" },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const chat = useAgentChat();
    expect(chat.messages.value).toEqual([]);
    await chat.send("agent-1", "ping");

    expect(chat.messages.value).toHaveLength(2);
    expect(chat.messages.value[0]).toMatchObject({
      role: "user",
      content: "ping",
    });
    expect(chat.messages.value[1]).toMatchObject({
      role: "assistant",
      content: "Hello world!",
      toolCalls: [],
    });
    expect(chat.streaming.value).toBe(false);
    expect(chat.error.value).toBeNull();
  });

  it("send POSTe sur /api/agent-chat/stream avec {agentId, userId, message}", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const mockResponse = sseResponse([
      { type: "text_delta", data: { text: "ok" } },
      { type: "done" },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const chat = useAgentChat();
    await chat.send("agent-42", "what is BTC?");

    const calls = fetchCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/api/agent-chat/stream");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse((calls[0]?.init?.body as string) ?? "{}");
    expect(body).toEqual({
      agentId: "agent-42",
      userId: XRP_ACCOUNT,
      message: "what is BTC?",
      // 1er message → historique vide (mémoire de conversation).
      history: [],
    });
  });

  it("tool_result peuple toolCalls avec name + result (pas d'args — le serveur ne les remonte pas)", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const mockResponse = sseResponse([
      { type: "text_delta", data: { text: "Let me check. " } },
      {
        type: "tool_result",
        data: { name: "get_market", result: { symbol: "XRP", price: 0.5 } },
      },
      { type: "text_delta", data: { text: "Done." } },
      { type: "done" },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const chat = useAgentChat();
    await chat.send("agent-1", "XRP price?");

    const assistant = chat.messages.value[1];
    expect(assistant?.role).toBe("assistant");
    expect(assistant?.content).toBe("Let me check. Done.");
    expect(assistant?.toolCalls).toEqual([
      { name: "get_market", result: { symbol: "XRP", price: 0.5 } },
    ]);
    // `args` reste undefined — le serveur exécute les outils sans remonter
    // leurs arguments au front (cf. AgentChatService.executeTool).
    expect(assistant?.toolCalls?.[0]?.args).toBeUndefined();
  });

  it("send chunké : split à l'intérieur d'un event garde l'intégrité", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    // Le `data: {...}\n\n` est coupé en plein milieu du JSON — vérifie que
    // le buffer `buf` du composable attend la fin avant de parser.
    const full = `data: ${JSON.stringify({ type: "text_delta", data: { text: "hi" } })}\n\n`;
    const half = Math.floor(full.length / 2);
    const mockResponse = chunkedSseResponse([full.slice(0, half), full.slice(half)]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const chat = useAgentChat();
    await chat.send("agent-1", "test");

    expect(chat.messages.value[1]?.content).toBe("hi");
  });

  it("send sans session ne fait pas de fetch et pose error", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const chat = useAgentChat();
    await chat.send("agent-1", "ping");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(chat.error.value).toBe("No user session");
    expect(chat.messages.value).toEqual([]);
    expect(chat.streaming.value).toBe(false);
  });

  it("HTTP non-OK est attrapé et pose error", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const mockResponse = sseResponse(
      [{ type: "error", data: { message: "boom" } }],
      500,
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const chat = useAgentChat();
    await chat.send("agent-1", "ping");

    // La réponse 500 → fetch a résolu mais response.ok = false → on throw.
    // L'event `error` du serveur n'est jamais parsé car la garde HTTP est
    // en amont. Le message d'erreur vient de la garde réseau (`messages.ts`).
    expect(chat.error.value).not.toBeNull();
    // Le message user a été poussé avant l'appel fetch, mais pas l'assistant.
    expect(chat.messages.value).toHaveLength(1);
    expect(chat.messages.value[0]?.role).toBe("user");
    expect(chat.streaming.value).toBe(false);
  });

  it("streaming repasse à false même après exception", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const chat = useAgentChat();
    await chat.send("agent-1", "ping");

    expect(chat.streaming.value).toBe(false);
    expect(chat.error.value).not.toBeNull();
  });
});