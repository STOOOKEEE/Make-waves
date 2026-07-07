// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, inject, type InjectionKey } from "vue";
import { mount } from "@vue/test-utils";
import { TideClient } from "@tide/client";
import type { AgentActionDto, AgentDto, ApiResponse, ApiTransport, TideClient as TideClientType } from "@tide/client";
import { useAgent } from "../src/composables/useAgent";
import { useSession } from "../src/composables/useSession";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";

const CLIENT_KEY: InjectionKey<TideClientType> = Symbol("tide-client");

class FakeEventSource {
  public url: string;
  public closed = false;
  public onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(url: string) {
    this.url = url;
  }
  close(): void {
    this.closed = true;
  }
  dispatch(data: string): void {
    this.onmessage?.({ data } as MessageEvent);
  }
}

function clientWith(routes: Record<string, ApiResponse>): TideClient {
  const transport: ApiTransport = (request) =>
    Promise.resolve(
      routes[`${request.method} ${request.path}`] ?? {
        status: 404,
        body: { error: "introuvable" },
      },
    );
  return new TideClient(transport);
}

/** Monte un composant qui appelle `useAgent` avec un client injectable. */
function mountAgent(client: TideClient) {
  return mount(
    defineComponent({
      setup() {
        const ctx = useAgent(inject(CLIENT_KEY) as TideClientType);
        return { ctx };
      },
      render() {
        return h("div");
      },
    }),
    {
      global: {
        provide: { [CLIENT_KEY]: client },
      },
    },
  );
}

const baseAgent: AgentDto = {
  id: "agent-1",
  userId: XRP_ACCOUNT,
  name: "Test Agent",
  type: "external",
  status: "active",
  hasLiveAccount: false,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

const killedAgent: AgentDto = { ...baseAgent, status: "stopped" };

beforeEach(() => {
  useSession().disconnectWallet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Récupère le composable exposé par le composant de test. */
function ctxOf(wrapper: ReturnType<typeof mount>): ReturnType<typeof useAgent> {
  return (wrapper.vm as unknown as { ctx: ReturnType<typeof useAgent> }).ctx;
}

describe("useAgent", () => {
  it("refresh liste les agents du user courant", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mountAgent(
      clientWith({
        [`GET /api/agents?userId=${XRP_ACCOUNT}`]: {
          status: 200,
          body: [baseAgent],
        },
      }),
    );
    const composed = ctxOf(wrapper);
    expect(composed.agents.value).toEqual([]);
    await composed.refresh();
    expect(composed.agents.value).toEqual([baseAgent]);
    expect(composed.loading.value).toBe(false);
    expect(composed.error.value).toBeNull();
    wrapper.unmount();
  });

  it("refresh ne fait rien si aucun wallet n'est connecté", async () => {
    const wrapper = mountAgent(clientWith({}));
    const composed = ctxOf(wrapper);
    await composed.refresh();
    expect(composed.agents.value).toEqual([]);
    expect(composed.loading.value).toBe(false);
    wrapper.unmount();
  });

  it("kill appelle l'API et déclenche un refresh", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const calls: string[] = [];
    const transport: ApiTransport = (request) => {
      calls.push(`${request.method} ${request.path}`);
      if (request.method === "POST" && request.path === "/api/agents/agent-1/kill") {
        return Promise.resolve({ status: 200, body: killedAgent });
      }
      if (request.method === "GET" && request.path === `/api/agents?userId=${XRP_ACCOUNT}`) {
        return Promise.resolve({ status: 200, body: [killedAgent] });
      }
      return Promise.resolve({ status: 404, body: { error: "introuvable" } });
    };
    const wrapper = mountAgent(new TideClient(transport));
    const composed = ctxOf(wrapper);
    await composed.kill("agent-1");
    expect(calls).toEqual([
      "POST /api/agents/agent-1/kill",
      `GET /api/agents?userId=${XRP_ACCOUNT}`,
    ]);
    expect(composed.agents.value[0]?.status).toBe("stopped");
    wrapper.unmount();
  });

  it("loadActions récupère l'historique de l'agent", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const action: AgentActionDto = {
      id: "act-1",
      agentId: "agent-1",
      userId: XRP_ACCOUNT,
      toolName: "place_order",
      toolParams: "{}",
      result: "ok",
      error: null,
      idempotencyKey: null,
      executedAt: 1_700_000_001_000,
    };
    const wrapper = mountAgent(
      clientWith({
        [`GET /api/agent-actions?agentId=agent-1`]: {
          status: 200,
          body: [action],
        },
      }),
    );
    const composed = ctxOf(wrapper);
    await composed.loadActions("agent-1");
    expect(composed.actions.value).toEqual([action]);
    wrapper.unmount();
  });

  it("connectSse ouvre EventSource et réagit aux events agent_killed", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const instances: FakeEventSource[] = [];
    const FakeCtor = function (url: string) {
      const instance = new FakeEventSource(url);
      instances.push(instance);
      return instance;
    } as unknown as typeof EventSource;
    vi.stubGlobal("EventSource", FakeCtor);

    const wrapper = mountAgent(
      clientWith({
        [`GET /api/agents?userId=${XRP_ACCOUNT}`]: {
          status: 200,
          body: [baseAgent],
        },
      }),
    );
    const composed = ctxOf(wrapper);
    await composed.refresh();

    composed.connectSse();
    const es = instances[0];
    expect(es?.url).toBe("/api/agents/events");

    // Déclenche le handler interne en simulant un message SSE
    es?.dispatch(JSON.stringify({ type: "agent_killed", agentId: "agent-1" }));
    expect(composed.agents.value[0]?.status).toBe("stopped");

    wrapper.unmount();
  });

  it("onUnmounted ferme l'EventSource", () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    let closeCount = 0;
    const CountingEventSource = class extends FakeEventSource {
      override close(): void {
        closeCount += 1;
      }
    };
    vi.stubGlobal(
      "EventSource",
      CountingEventSource as unknown as typeof EventSource,
    );

    const wrapper = mountAgent(clientWith({}));
    const composed = ctxOf(wrapper);
    composed.connectSse();
    wrapper.unmount();
    expect(closeCount).toBe(1);
    // disconnectSse reste idempotent après unmount
    expect(() => composed.disconnectSse()).not.toThrow();
  });

  it("connectSse est idempotent : un 2e appel ne crée pas de nouvel EventSource", () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const instances: FakeEventSource[] = [];
    const FakeCtor = function (url: string) {
      const instance = new FakeEventSource(url);
      instances.push(instance);
      return instance;
    } as unknown as typeof EventSource;
    vi.stubGlobal("EventSource", FakeCtor);

    const wrapper = mountAgent(clientWith({}));
    const composed = ctxOf(wrapper);
    composed.connectSse();
    composed.connectSse();
    composed.connectSse();

    expect(instances.length).toBe(1);
    wrapper.unmount();
  });
});