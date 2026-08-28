// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import TutorialOfferModal from "../src/components/tutorial/TutorialOfferModal.vue";
import { useTutorial } from "../src/composables/useTutorial";
import { setLocale } from "../src/i18n/locale";

beforeEach(() => {
  localStorage.clear();
  useTutorial().reset();
  setLocale("en");
});

describe("proposition du tutoriel au premier passage", () => {
  it("s'affiche tant que le tutoriel n'a jamais été vu", () => {
    const wrapper = mount(TutorialOfferModal);
    expect(wrapper.find(".offer").exists()).toBe(true);
    wrapper.unmount();
  });

  it("envoie sur le tutoriel et le démarre", async () => {
    const wrapper = mount(TutorialOfferModal);
    await wrapper.get(".actions .primary").trigger("click");

    expect(wrapper.emitted("navigate")?.at(-1)).toEqual(["/tutorial"]);
    expect(useTutorial().status.value).toBe("running");
    wrapper.unmount();
  });

  it("ne repropose plus jamais après un refus", async () => {
    const wrapper = mount(TutorialOfferModal);
    await wrapper.get(".actions .ghost").trigger("click");

    expect(useTutorial().status.value).toBe("skipped");
    expect(wrapper.find(".offer").exists()).toBe(false);

    // Un remontage (nouvelle visite du terminal) ne doit pas relancer la relance.
    const again = mount(TutorialOfferModal);
    expect(again.find(".offer").exists()).toBe(false);
    again.unmount();
    wrapper.unmount();
  });

  it("ne s'affiche pas pour quelqu'un qui a déjà terminé", () => {
    const tutorial = useTutorial();
    tutorial.start();
    tutorial.finish();

    const wrapper = mount(TutorialOfferModal);
    expect(wrapper.find(".offer").exists()).toBe(false);
    wrapper.unmount();
  });

  it("ne s'affiche pas au milieu d'un parcours en cours", () => {
    const tutorial = useTutorial();
    tutorial.start();

    const wrapper = mount(TutorialOfferModal);
    expect(wrapper.find(".offer").exists()).toBe(false);
    wrapper.unmount();
  });
});
