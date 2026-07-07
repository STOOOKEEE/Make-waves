// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { type InjectionKey, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import {
  TideClient,
  type AgentActionDto,
  type ApiResponse,
  type ApiTransport,
  type MandateDto,
  type TideClient as TideClientType,
} from "@tide/client";
import MandateForm from "../src/components/agent/MandateForm.vue";
import KillSwitch from "../src/components/agent/KillSwitch.vue";
import ActionLog from "../src/components/agent/ActionLog.vue";
import { useSession } from "../src/composables/useSession";
import { setLocale } from "../src/i18n/locale";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";
const AGENT_ID = "agent-1";

const CLIENT_KEY: InjectionKey<TideClientType> = Symbol("tide-client");

function clientWith(handler: (request: { method: string; path: string; body?: unknown }) => ApiResponse): TideClient {
  const transport: ApiTransport = (request) => Promise.resolve(handler(request));
  return new TideClient(transport);
}

beforeEach(() => {
  useSession().disconnectWallet();
  setLocale("fr");
});

describe("MandateForm", () => {
  it("rend les labels i18n du formulaire", () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mount(MandateForm, {
      props: { client: clientWith(() => ({ status: 201, body: null })), agentId: AGENT_ID },
      global: { provide: { [CLIENT_KEY]: clientWith(() => ({ status: 201, body: null })) } },
    });
    const html = wrapper.html();
    expect(html).toContain("Capital max");
    expect(html).toContain("Perte max / jour");
    expect(html).toContain("Levier max");
    expect(html).toContain("Créer le mandat");
    wrapper.unmount();
  });

  it("appelle useMandate.create avec les valeurs du formulaire à la soumission", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const baseMandate: MandateDto = {
      id: "mandate-1",
      agentId: AGENT_ID,
      userId: XRP_ACCOUNT,
      capitalMax: 500,
      perteMaxJour: 50,
      maxTradesPerDay: 10,
      maxLeverage: 3,
      pairesAutorisees: ["XRP/RLUSD"],
      style: "momentum",
      validUntil: 1_800_000_000_000,
      signedAt: null,
      signature: null,
      status: "pending",
    };
    const calls: { method: string; path: string; body?: unknown }[] = [];
    const client = clientWith((req) => {
      calls.push(req);
      return { status: 201, body: baseMandate };
    });
    const wrapper = mount(MandateForm, {
      props: { client, agentId: AGENT_ID },
      global: { provide: { [CLIENT_KEY]: client } },
    });

    // Renseigne les champs puis soumet
    const vm = wrapper.vm as unknown as {
      form: {
        capitalMax: number;
        perteMaxJour: number;
        maxTradesPerDay: number;
        maxLeverage: number;
        pairesAutorisees: string[];
        style: string | null;
        validDays: number;
      };
      submit: () => Promise<void>;
    };
    vm.form.capitalMax = 500;
    vm.form.perteMaxJour = 50;
    vm.form.maxTradesPerDay = 10;
    vm.form.maxLeverage = 3;
    vm.form.pairesAutorisees = ["XRP/RLUSD"];
    vm.form.style = "momentum";
    vm.form.validDays = 14;
    await vm.submit();
    await nextTick();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.path).toBe("/api/mandates");
    const body = calls[0]?.body as {
      agentId: string;
      capitalMax: number;
      maxLeverage: number;
      validDays?: number;
    };
    expect(body.agentId).toBe(AGENT_ID);
    expect(body.capitalMax).toBe(500);
    expect(body.maxLeverage).toBe(3);
    wrapper.unmount();
  });
});

describe("KillSwitch", () => {
  it("rend le bouton avec le label i18n", () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mount(KillSwitch, {
      props: { client: clientWith(() => ({ status: 200, body: null })), agentId: AGENT_ID },
      global: { provide: { [CLIENT_KEY]: clientWith(() => ({ status: 200, body: null })) } },
    });
    expect(wrapper.text()).toContain("Kill switch");
    wrapper.unmount();
  });

  it("appelle useAgent.kill(agentId) après confirmation", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const calls: string[] = [];
    const client = clientWith((req) => {
      calls.push(`${req.method} ${req.path}`);
      return { status: 200, body: { id: AGENT_ID, status: "stopped" } };
    });
    const wrapper = mount(KillSwitch, {
      props: { client, agentId: AGENT_ID },
      global: { provide: { [CLIENT_KEY]: client } },
    });

    // Premier clic ouvre la modale de confirmation
    await wrapper.find("button").trigger("click");
    expect(wrapper.text()).toContain("Confirmer l'arrêt");

    // Le bouton de confirmation appelle kill
    const buttons = wrapper.findAll("button");
    const confirm = buttons.find((b) => b.text().includes("Confirmer l'arrêt"));
    expect(confirm).toBeDefined();
    await confirm!.trigger("click");
    await nextTick();

    expect(calls).toContain("POST /api/agents/agent-1/kill");
    wrapper.unmount();
  });
});

describe("ActionLog", () => {
  it("rend l'état vide quand aucune action", () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mount(ActionLog, {
      props: { client: clientWith(() => ({ status: 200, body: [] })), agentId: AGENT_ID },
      global: { provide: { [CLIENT_KEY]: clientWith(() => ({ status: 200, body: [] })) } },
    });
    expect(wrapper.text()).toContain("Aucune action");
    wrapper.unmount();
  });

  it("rend les actions avec tool, time et badge résultat", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const actions: AgentActionDto[] = [
      {
        id: "act-1",
        agentId: AGENT_ID,
        userId: XRP_ACCOUNT,
        toolName: "place_order",
        toolParams: "{}",
        result: "ok",
        error: null,
        idempotencyKey: null,
        executedAt: 1_700_000_000_000,
      },
      {
        id: "act-2",
        agentId: AGENT_ID,
        userId: XRP_ACCOUNT,
        toolName: "kill_agent",
        toolParams: "{}",
        result: null,
        error: "RISK_LIMIT capital exceeded",
        idempotencyKey: null,
        executedAt: 1_700_000_100_000,
      },
    ];
    const client = clientWith((req) => {
      if (req.method === "GET" && req.path === "/api/agent-actions?agentId=agent-1") {
        return { status: 200, body: actions };
      }
      return { status: 404, body: { error: "introuvable" } };
    });
    const wrapper = mount(ActionLog, {
      props: { client, agentId: AGENT_ID },
      global: { provide: { [CLIENT_KEY]: client } },
    });
    // Attend que loadActions() (appelé en onMounted) ait populé la liste
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();

    const html = wrapper.html();
    expect(html).toContain("place_order");
    expect(html).toContain("kill_agent");
    expect(html).toContain("RISK_LIMIT capital exceeded");
    wrapper.unmount();
  });
});