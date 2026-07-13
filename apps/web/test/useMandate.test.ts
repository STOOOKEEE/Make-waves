// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, inject, type InjectionKey } from "vue";
import { mount } from "@vue/test-utils";
import {
  TideClient,
  type ApiResponse,
  type ApiTransport,
  type MandateDto,
  type TideClient as TideClientType,
} from "@tide/client";
import { useMandate, type MandateForm } from "../src/composables/useMandate";
import { useSession } from "../src/composables/useSession";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";

const CLIENT_KEY: InjectionKey<TideClientType> = Symbol("tide-client");

function clientWith(handler: (request: { method: string; path: string; body?: unknown }) => ApiResponse): TideClient {
  const transport: ApiTransport = (request) => Promise.resolve(handler(request));
  return new TideClient(transport);
}

/** Monte un composant qui appelle `useMandate` avec un client injectable. */
function mountMandate(client: TideClient) {
  return mount(
    defineComponent({
      setup() {
        const ctx = useMandate(inject(CLIENT_KEY) as TideClientType);
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

function ctxOf(wrapper: ReturnType<typeof mount>): ReturnType<typeof useMandate> {
  return (wrapper.vm as unknown as { ctx: ReturnType<typeof useMandate> }).ctx;
}

const baseMandate: MandateDto = {
  id: "mandate-1",
  agentId: "agent-1",
  userId: XRP_ACCOUNT,
  capitalMax: 1000,
  perteMaxJour: 100,
  maxTradesPerDay: 20,
  maxLeverage: 5,
  pairesAutorisees: ["XRP/RLUSD"],
  style: "momentum",
  validUntil: 1_800_000_000_000,
  signedAt: null,
  signature: null,
  status: "pending",
};

/** Mandat retourné par le callback de signature (activation simulée). */
const activeMandate: MandateDto = {
  ...baseMandate,
  signedAt: 1_700_000_000_000,
  signature: "ui-simulated-signature",
  status: "active",
};

/** Route la réponse par path : création (201, pending) puis activation (200). */
function mandateHandler(
  onCreate?: (request: { method: string; path: string; body?: unknown }) => void,
): (request: { method: string; path: string; body?: unknown }) => ApiResponse {
  return (request) => {
    if (request.path === "/api/mandates") {
      onCreate?.(request);
      return { status: 201, body: baseMandate };
    }
    return { status: 200, body: activeMandate };
  };
}

const sampleForm: MandateForm = {
  capitalMax: 1000,
  perteMaxJour: 100,
  maxTradesPerDay: 20,
  maxLeverage: 5,
  pairesAutorisees: ["XRP/RLUSD", "BTC/USDT"],
  style: "momentum",
  validDays: 7,
};

beforeEach(() => {
  useSession().disconnectWallet();
  vi.useRealTimers();
});

describe("useMandate", () => {
  it("create envoie le formulaire au backend avec validUntil = now + validDays * 86_400_000", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const before = Date.now();
    const captured: { method: string; path: string; body?: unknown } = {
      method: "",
      path: "",
    };
    const wrapper = mountMandate(
      clientWith(
        mandateHandler((request) => {
          captured.method = request.method;
          captured.path = request.path;
          captured.body = request.body;
        }),
      ),
    );
    const composed = ctxOf(wrapper);

    const result = await composed.create("agent-1", sampleForm);
    const after = Date.now();

    expect(captured.method).toBe("POST");
    expect(captured.path).toBe("/api/mandates");
    const body = captured.body as {
      agentId: string;
      userId: string;
      validUntil: number;
      capitalMax: number;
      perteMaxJour: number;
      maxTradesPerDay: number;
      maxLeverage: number;
      pairesAutorisees: readonly string[];
      style: string;
    };
    // validUntil doit tomber dans la fenêtre attendue, peu importe la dérive
    // d'horloge entre `before`, l'appel, et `after`.
    expect(body.validUntil).toBeGreaterThanOrEqual(before + 7 * 86_400_000);
    expect(body.validUntil).toBeLessThanOrEqual(after + 7 * 86_400_000);
    expect(body.agentId).toBe("agent-1");
    expect(body.userId).toBe(XRP_ACCOUNT);
    expect(body.capitalMax).toBe(1000);
    expect(body.perteMaxJour).toBe(100);
    expect(body.maxTradesPerDay).toBe(20);
    expect(body.maxLeverage).toBe(5);
    expect(body.pairesAutorisees).toEqual(["XRP/RLUSD", "BTC/USDT"]);
    expect(body.style).toBe("momentum");
    // create crée (pending) PUIS active via le callback → renvoie le mandat actif.
    expect(result).toEqual(activeMandate);
    expect(composed.signing.value).toBe(false);
    expect(composed.signError.value).toBeNull();
    wrapper.unmount();
  });

  it("create propage le style null quand l'user ne choisit pas de style", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    let capturedBody: { style: string | null } | undefined;
    const wrapper = mountMandate(
      clientWith(
        mandateHandler((request) => {
          capturedBody = request.body as { style: string | null };
        }),
      ),
    );
    const composed = ctxOf(wrapper);

    await composed.create("agent-1", { ...sampleForm, style: null });

    expect(capturedBody?.style).toBeNull();
    wrapper.unmount();
  });

  it("create throw quand aucun wallet n'est connecté", async () => {
    const wrapper = mountMandate(clientWith(() => ({ status: 201, body: baseMandate })));
    const composed = ctxOf(wrapper);

    await expect(composed.create("agent-1", sampleForm)).rejects.toThrow("No user session");
    expect(composed.signError.value).toBeNull();
    expect(composed.signing.value).toBe(false);
    wrapper.unmount();
  });
});