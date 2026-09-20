// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { TideClient } from "@tide/client";
import CompetitionsView from "../src/views/CompetitionsView.vue";

function fakeClient(): TideClient {
  return { competitions: vi.fn().mockResolvedValue([]) } as unknown as TideClient;
}

describe("CompetitionsView — tombola", () => {
  it("expose la tombola dans le parcours Compétitions même sans compétition active", async () => {
    const navigate = vi.fn();
    const wrapper = mount(CompetitionsView, {
      props: { client: fakeClient() },
      attrs: { onNavigate: navigate },
      global: {
        stubs: {
          GiveawayView: { template: '<div class="giveaway-page-stub" />' },
        },
      },
    });
    await flushPromises();

    expect(wrapper.find(".giveaway-page-stub").exists()).toBe(true);
    expect(wrapper.text()).toContain("No real competition is open yet.");

    wrapper.unmount();
  });
});
