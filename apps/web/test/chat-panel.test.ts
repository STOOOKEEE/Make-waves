// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import ChatPanel from "../src/components/agent/ChatPanel.vue";
import { useSession } from "../src/composables/useSession";
import { setLocale } from "../src/i18n/locale";

const XRP_ACCOUNT = "rPaperUser11111111111111111111111111111";
const AGENT_ID = "agent-1";

beforeEach(() => {
  useSession().disconnectWallet();
  setLocale("fr");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Construit un `Response` SSE avec un unique `text_delta`. */
function okResponse(text: string): Response {
  const body = `data: ${JSON.stringify({ type: "text_delta", data: { text } })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("ChatPanel", () => {
  it("rend l'input et le bouton avec les labels FR", () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const wrapper = mount(ChatPanel, { props: { agentId: AGENT_ID } });

    const input = wrapper.find("input");
    const button = wrapper.find("button");
    expect(input.exists()).toBe(true);
    expect(button.exists()).toBe(true);
    expect(input.attributes("placeholder")).toBe("Demander à l'agent…");
    expect(button.text()).toBe("Envoyer");
    wrapper.unmount();
  });

  it("soumettre le formulaire POSTe /api/agent-chat/stream avec agentId+message, vide l'input, affiche l'assistant", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    const fetchMock = vi.fn().mockResolvedValue(okResponse("salut"));
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(ChatPanel, { props: { agentId: AGENT_ID } });
    const input = wrapper.find("input");
    await input.setValue("coucou");
    await wrapper.find("form").trigger("submit");
    await nextTick();
    await nextTick();
    await nextTick();

    // 1 appel POST /api/agent-chat/stream avec le bon corps
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/agent-chat/stream");
    expect(init.method).toBe("POST");
    const body = JSON.parse((init.body as string) ?? "{}");
    expect(body).toMatchObject({
      agentId: AGENT_ID,
      userId: XRP_ACCOUNT,
      message: "coucou",
    });

    // L'input est vidé, le message user + assistant est rendu dans le DOM.
    expect((input.element as HTMLInputElement).value).toBe("");
    const html = wrapper.html();
    expect(html).toContain("coucou");
    expect(html).toContain("salut");
    wrapper.unmount();
  });

  it("affiche l'indicateur de réflexion pendant le streaming", async () => {
    useSession().setWallet(XRP_ACCOUNT, "xaman");
    // Construit un fetch qui ne résout jamais (simule un stream en cours).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>(() => {
            // noop : le composable reste en `streaming === true`
          }),
      ),
    );

    const wrapper = mount(ChatPanel, { props: { agentId: AGENT_ID } });
    const input = wrapper.find("input");
    await input.setValue("hello");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    // L'indicateur « réflexion » est visible, et le bouton est désactivé.
    const html = wrapper.html();
    expect(html).toContain("thinking");
    expect(html).toContain("Réflexion");
    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });
});