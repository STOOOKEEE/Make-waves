// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import {
  TideClient,
  type AgentActionDto,
  type AgentDto,
  type ApiRequest,
  type ApiResponse,
  type ApiTransport,
} from "@tide/client";
import AgentView from "../src/views/AgentView.vue";
import { useSession } from "../src/composables/useSession";
import { setLocale } from "../src/i18n/locale";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";
const SECOND_XRP_ACCOUNT = "rSecondUser222222222222222222222222222";
const PAPER_ACCOUNT = "paper:agent-view-test";
const AGENT_ID = "agent-1";

function clientWith(handler: (request: ApiRequest) => ApiResponse): TideClient {
  const transport: ApiTransport = (request) => Promise.resolve(handler(request));
  return new TideClient(transport);
}

function makeAgentsRoute(
  agents: AgentDto[],
  account = XRP_ACCOUNT,
): (request: { method: string; path: string; body?: unknown }) => ApiResponse {
  return (req) => {
    if (req.method === "POST" && req.path === "/auth/paper") {
      return { status: 200, body: { token: "paper-token", userId: PAPER_ACCOUNT } };
    }
    if (req.method === "POST" && req.path === "/auth/paper/refresh") {
      return { status: 200, body: { token: "paper-token-next", userId: PAPER_ACCOUNT } };
    }
    if (req.method === "POST" && req.path === "/accounts/ensure") {
      return { status: 200, body: { userId: account, created: true } };
    }
    if (req.method === "GET" && req.path === `/api/agents?userId=${encodeURIComponent(account)}`) {
      return { status: 200, body: agents };
    }
    if (req.method === "POST" && req.path === "/api/agents") {
      return { status: 201, body: { ...(req.body as object), id: AGENT_ID } };
    }
    if (req.method === "POST" && req.path === `/api/agents/${AGENT_ID}/kill`) {
      return { status: 200, body: { id: AGENT_ID, status: "stopped" } };
    }
    if (req.method === "GET" && req.path.startsWith("/api/agent-actions")) {
      return { status: 200, body: [] satisfies AgentActionDto[] };
    }
    if (req.method === "GET" && req.path.startsWith("/api/mandates")) {
      return { status: 200, body: [] };
    }
    if (req.method === "POST" && req.path === "/api/mandates") {
      return {
        status: 201,
        body: {
          id: "mandate-1",
          agentId: AGENT_ID,
          userId: XRP_ACCOUNT,
          capitalMax: 100,
          perteMaxJour: 10,
          maxTradesPerDay: 5,
          maxLeverage: 2,
          pairesAutorisees: ["XRP/RLUSD"],
          style: null,
          validUntil: 1_800_000_000_000,
          signedAt: null,
          signature: null,
          status: "pending",
        },
      };
    }
    return { status: 404, body: { error: "introuvable" } };
  };
}

const baseAgent: AgentDto = {
  id: AGENT_ID,
  userId: XRP_ACCOUNT,
  name: "tide-momentum-v1",
  type: "integrated",
  status: "active",
  hasLiveAccount: false,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

beforeEach(() => {
  localStorage.clear();
  useSession().disconnectWallet();
  setLocale("fr");
});

async function flushAgentView(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe("AgentView", () => {
  it("rend le titre i18n dans le shell (useI18n réel, pas placeholder)", () => {
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([])) },
    });
    expect(wrapper.find('[data-testid="agent-view"]').exists()).toBe(true);
    expect(wrapper.find("h1").text()).toBe("Agent IA");
    wrapper.unmount();
  });

  it("initialise une identité Paper et crée avec son JWT sans wallet", async () => {
    const calls: ApiRequest[] = [];
    const wrapper = mount(AgentView, {
      props: {
        client: clientWith((request) => {
          calls.push(request);
          const publicAuth = request.path === "/auth/paper";
          if (!publicAuth && request.headers?.authorization !== "Bearer paper-token") {
            return { status: 401, body: { error: "authentification requise" } };
          }
          return makeAgentsRoute([], PAPER_ACCOUNT)(request);
        }),
      },
    });
    await flushAgentView();
    const html = wrapper.html();
    expect(html).toContain("Identité Paper");
    expect(html).toContain("Créer un agent");
    expect(useSession().userId.value).toBe(PAPER_ACCOUNT);
    const ensure = calls.find(
      (call) => call.method === "POST" && call.path === "/accounts/ensure",
    );
    expect(ensure?.body).toEqual({ userId: PAPER_ACCOUNT });
    expect(ensure?.headers?.authorization).toBe("Bearer paper-token");

    await wrapper.get('input[placeholder="ex. tide-momentum-v1"]').setValue("paper-agent");
    await wrapper.get(".create-card .primary").trigger("click");
    await flushAgentView();
    const create = calls.find(
      (call) => call.method === "POST" && call.path === "/api/agents",
    );
    expect(create?.headers?.authorization).toBe("Bearer paper-token");
    expect(create?.body).toEqual({
      userId: PAPER_ACCOUNT,
      name: "paper-agent",
      type: "integrated",
    });
    wrapper.unmount();
  });

  it("affiche le formulaire de création quand la session est connectée mais qu'aucun agent n'existe", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([])) },
    });
    await flushAgentView();

    const html = wrapper.html();
    expect(html).toContain("Créer un agent");
    expect(html).toContain("Nom de l'agent");
    expect(html).toContain("Intégré");
    expect(html).toContain("Externe (MCP)");
    wrapper.unmount();
  });

  it("permet de revenir en Paper si la session wallet est rejetée", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const client = clientWith((req) => {
      if (
        req.method === "GET" &&
        req.path === `/api/agents?userId=${encodeURIComponent(XRP_ACCOUNT)}`
      ) {
        return { status: 401, body: { error: "authentification requise" } };
      }
      return makeAgentsRoute([], PAPER_ACCOUNT)(req);
    });
    const wrapper = mount(AgentView, { props: { client } });
    await flushAgentView();

    expect(wrapper.get(".error-note").text()).toContain("authentification requise");
    expect(wrapper.get('[data-testid="continue-paper"]').text()).toContain("Continuer en Paper");
    await wrapper.get('[data-testid="continue-paper"]').trigger("click");
    await flushAgentView();

    expect(useSession().walletConnected.value).toBe(false);
    expect(useSession().userId.value).toBe(PAPER_ACCOUNT);
    expect(wrapper.html()).toContain("Créer un agent");
    wrapper.unmount();
  });

  it("appelle client.createAgent et rafraîchit la liste à la soumission du formulaire", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const calls: { method: string; path: string; body?: unknown }[] = [];
    const client = clientWith((req) => {
      calls.push(req);
      return makeAgentsRoute([])(req);
    });
    const wrapper = mount(AgentView, {
      props: { client },
    });
    await flushAgentView();

    // Renseigne le nom et soumet
    const vm = wrapper.vm as unknown as { newName: string; onCreateAgent: () => Promise<void> };
    vm.newName = "alpha-bot";
    await vm.onCreateAgent();
    await flushAgentView();

    const create = calls.find((c) => c.method === "POST" && c.path === "/api/agents");
    expect(create).toBeDefined();
    expect((create!.body as { name: string }).name).toBe("alpha-bot");
    wrapper.unmount();
  });

  it("ignore l'échec tardif d'une création appartenant à l'ancienne identité", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const pendingCreate = deferred<ApiResponse>();
    const transport: ApiTransport = (request) => {
      if (request.method === "POST" && request.path === "/api/agents") {
        return pendingCreate.promise;
      }
      return Promise.resolve(makeAgentsRoute([], useSession().userId.value)(request));
    };
    const wrapper = mount(AgentView, {
      props: { client: new TideClient(transport) },
    });
    await flushAgentView();

    const vm = wrapper.vm as unknown as {
      newName: string;
      onCreateAgent: () => Promise<void>;
    };
    vm.newName = "agent-owner-a";
    const submission = vm.onCreateAgent();
    await Promise.resolve();

    useSession().setWallet(SECOND_XRP_ACCOUNT, "gem");
    await flushAgentView();
    expect(wrapper.get(".create-card .primary").attributes("disabled")).toBeUndefined();

    pendingCreate.reject(new Error("ancienne requête refusée"));
    await submission;
    await flushAgentView();

    expect(useSession().userId.value).toBe(SECOND_XRP_ACCOUNT);
    expect(wrapper.find(".create-card .err").exists()).toBe(false);
    expect(wrapper.get(".create-card .primary").attributes("disabled")).toBeUndefined();
    wrapper.unmount();
  });

  it("affiche la carte d'identité + MandateForm quand un agent existe déjà", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const client = clientWith(makeAgentsRoute([baseAgent]));
    const wrapper = mount(AgentView, {
      props: { client },
    });
    await flushAgentView();

    const html = wrapper.html();
    expect(html).toContain("tide-momentum-v1");
    expect(html).toContain("Statut");
    expect(html).toContain("Compte Live");
    expect(html).toContain("Mandat");
    wrapper.unmount();
  });

  it("propose un nouvel agent même si un agent arrêté existe déjà", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const stopped = { ...baseAgent, status: "stopped" as const };
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([stopped])) },
    });
    await flushAgentView();

    const button = wrapper.get('[data-testid="new-agent"]');
    expect(button.text()).toContain("Nouvel agent");
    await button.trigger("click");
    await nextTick();
    expect(wrapper.html()).toContain("Créer un agent");
    expect(wrapper.html()).toContain("Annuler");
    wrapper.unmount();
  });

  it("met à jour la carte courante après le kill switch", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([baseAgent])) },
    });
    await flushAgentView();

    await wrapper.get(".ksbtn").trigger("click");
    await wrapper.get(".danger").trigger("click");
    await flushAgentView();

    expect(wrapper.get(".id-card .meta").text()).toContain("stopped");
    expect(wrapper.get(".stopped-note").text()).toContain("Crée un nouvel agent");
    expect(wrapper.find(".ksbtn").exists()).toBe(false);
    expect(wrapper.find(".mform").exists()).toBe(false);
    expect(wrapper.find(".chat-panel").exists()).toBe(false);
    expect(wrapper.find(".alog").exists()).toBe(true);
    expect(wrapper.find('[data-testid="new-agent"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("sélectionne le nouvel agent après une deuxième création", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const list = [baseAgent];
    const created: AgentDto = {
      ...baseAgent,
      id: "agent-2",
      name: "Second Agent",
      createdAt: baseAgent.createdAt + 1,
      updatedAt: baseAgent.updatedAt + 1,
    };
    const client = clientWith((req) => {
      if (req.method === "POST" && req.path === "/api/agents") {
        list.unshift(created);
        return { status: 201, body: created };
      }
      return makeAgentsRoute(list)(req);
    });
    const wrapper = mount(AgentView, { props: { client } });
    await flushAgentView();

    await wrapper.get('[data-testid="new-agent"]').trigger("click");
    await wrapper.get('input[placeholder="ex. tide-momentum-v1"]').setValue("Second Agent");
    await wrapper.get(".create-card .primary").trigger("click");
    await flushAgentView();

    expect(wrapper.get(".agent-name").text()).toBe("Second Agent");
    expect(wrapper.get(".agent-picker").text()).toContain("tide-momentum-v1");
    expect(wrapper.get(".agent-picker").text()).toContain("Second Agent");
    wrapper.unmount();
  });

  it("réinitialise le chat et le formulaire de mandat quand on change d'agent", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const second: AgentDto = {
      ...baseAgent,
      id: "agent-2",
      name: "Second Agent",
      createdAt: baseAgent.createdAt + 1,
      updatedAt: baseAgent.updatedAt + 1,
    };
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([baseAgent, second])) },
    });
    await flushAgentView();

    const chatInput = wrapper.get('.chat-panel input[placeholder="Demander à l\'agent…"]');
    await chatInput.setValue("instruction privée pour A");
    const capitalInput = wrapper.get(".mform input[type='number']");
    await capitalInput.setValue("4242");

    await wrapper.get(".agent-picker select").setValue(second.id);
    await flushAgentView();

    expect(wrapper.get(".agent-name").text()).toBe("Second Agent");
    expect((wrapper.get(".chat-panel .input-row input").element as HTMLInputElement).value).toBe("");
    expect((wrapper.get(".mform input[type='number']").element as HTMLInputElement).value).toBe("1000");
    wrapper.unmount();
  });

  it("bascule en anglais quand la locale passe à 'en'", async () => {
    setLocale("en");
    useSession().disconnectWallet();
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([], PAPER_ACCOUNT)) },
    });
    await flushAgentView();
    expect(wrapper.find("h1").text()).toBe("AI Agent");
    expect(wrapper.html()).toContain("Paper identity");
    expect(wrapper.html()).toContain("Create an agent");
    wrapper.unmount();
  });
});
