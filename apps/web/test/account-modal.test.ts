// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TideClient } from "@tide/client";
import AccountModal from "../src/components/AccountModal.vue";
import { useAccountAuth } from "../src/composables/useAccountAuth";
import { useSession } from "../src/composables/useSession";

function fakeClient(): TideClient {
  return { setToken: vi.fn() } as unknown as TideClient;
}

describe("AccountModal", () => {
  beforeEach(() => {
    localStorage.clear();
    const session = useSession();
    session.disconnectWallet();
    session.setPaperUser("");
  });

  it("permet de quitter un compte Paper anonyme après confirmation", async () => {
    const client = fakeClient();
    const session = useSession();
    session.setPaperUser("paper:logout-account");
    localStorage.setItem("tide.paperUserId", "paper:logout-account");
    localStorage.setItem("tide.paperSessionToken", "jwt-paper");
    localStorage.setItem("tide.sessionToken", "jwt-wallet-stale");

    const wrapper = mount(AccountModal, { props: { client } });
    useAccountAuth(client).open();
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".identity").text()).toContain("Paper");
    await wrapper.find("button.secondary").trigger("click");
    expect(wrapper.find(".logout-confirmation").exists()).toBe(true);
    expect(session.connected.value).toBe(true);

    await wrapper.find("button.danger").trigger("click");
    await flushPromises();

    expect(session.connected.value).toBe(false);
    expect(localStorage.getItem("tide.paperUserId")).toBeNull();
    expect(localStorage.getItem("tide.paperSessionToken")).toBeNull();
    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(wrapper.emitted("loggedOut")).toHaveLength(1);
    wrapper.unmount();
  });
});
