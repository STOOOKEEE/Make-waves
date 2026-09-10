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
    });
    await flushPromises();

    const giveaway = wrapper.get(".giveaway-card");
    expect(giveaway.text()).toContain("AirPods Max");
    await giveaway.trigger("click");
    expect(navigate).toHaveBeenCalledWith("/giveaway");

    wrapper.unmount();
  });
});
