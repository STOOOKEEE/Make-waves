// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import {
  TideClient,
  type AgentActionDto,
  type AgentDto,
  type ApiResponse,
  type ApiTransport,
} from "@tide/client";
import AgentView from "../src/views/AgentView.vue";
import { useSession } from "../src/composables/useSession";
import { setLocale } from "../src/i18n/locale";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";
const AGENT_ID = "agent-1";

function clientWith(handler: (request: { method: string; path: string; body?: unknown }) => ApiResponse): TideClient {
  const transport: ApiTransport = (request) => Promise.resolve(handler(request));
  return new TideClient(transport);
}

function makeAgentsRoute(agents: AgentDto[]): (request: { method: string; path: string; body?: unknown }) => ApiResponse {
  return (req) => {
    if (req.method === "GET" && req.path === `/api/agents?userId=${encodeURIComponent(XRP_ACCOUNT)}`) {
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
  useSession().disconnectWallet();
  setLocale("fr");
});

describe("AgentView", () => {
  it("rend le titre i18n dans le shell (useI18n réel, pas placeholder)", () => {
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([])) },
    });
    expect(wrapper.find('[data-testid="agent-view"]').exists()).toBe(true);
    expect(wrapper.find("h1").text()).toBe("Agent IA");
    wrapper.unmount();
  });

  it("affiche l'invite de connexion quand aucun wallet n'est branché", () => {
    useSession().disconnectWallet();
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([])) },
    });
    const html = wrapper.html();
    expect(html).toContain("Connecte un wallet XRP");
    expect(html).not.toContain("Créer un agent");
    wrapper.unmount();
  });

  it("affiche le formulaire de création quand la session est connectée mais qu'aucun agent n'existe", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([])) },
    });
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    const html = wrapper.html();
    expect(html).toContain("Créer un agent");
    expect(html).toContain("Nom de l'agent");
    expect(html).toContain("Intégré");
    expect(html).toContain("Externe (MCP)");
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
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    // Renseigne le nom et soumet
    const vm = wrapper.vm as unknown as { newName: string; onCreateAgent: () => Promise<void> };
    vm.newName = "alpha-bot";
    await vm.onCreateAgent();
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    const create = calls.find((c) => c.method === "POST" && c.path === "/api/agents");
    expect(create).toBeDefined();
    expect((create!.body as { name: string }).name).toBe("alpha-bot");
    wrapper.unmount();
  });

  it("affiche la carte d'identité + MandateForm quand un agent existe déjà", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const client = clientWith(makeAgentsRoute([baseAgent]));
    const wrapper = mount(AgentView, {
      props: { client },
    });
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    const html = wrapper.html();
    expect(html).toContain("tide-momentum-v1");
    expect(html).toContain("Statut");
    expect(html).toContain("Compte Live");
    expect(html).toContain("Mandat");
    wrapper.unmount();
  });

  it("bascule en anglais quand la locale passe à 'en'", () => {
    setLocale("en");
    useSession().disconnectWallet();
    const wrapper = mount(AgentView, {
      props: { client: clientWith(makeAgentsRoute([])) },
    });
    expect(wrapper.find("h1").text()).toBe("AI Agent");
    expect(wrapper.html()).toContain("Connect an XRP wallet");
    wrapper.unmount();
  });
});