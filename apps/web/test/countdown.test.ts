// @vitest-environment happy-dom
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "../src/composables/useCountdown";

/**
 * Le composable n'existe que dans un contexte de composant (`onMounted`) : on le
 * monte dans une coquille et on lit son état.
 */
function mountCountdown(target: Parameters<typeof useCountdown>[0]) {
  const state = { api: null as ReturnType<typeof useCountdown> | null };
  const wrapper = mount(
    defineComponent({
      setup() {
        state.api = useCountdown(target);
        return () => h("i");
      },
    }),
  );
  return { wrapper, api: state.api as ReturnType<typeof useCountdown> };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("compte vers une échéance absolue, identique pour tout le monde", () => {
    const until = Date.UTC(2026, 8, 19, 23, 59, 0);
    const { wrapper, api } = mountCountdown({ until });
    // 10 j 11 h 59 min entre le 9 à 12:00 et le 19 à 23:59.
    expect([api.dd.value, api.hh.value, api.mm.value, api.ss.value]).toEqual([
      "10",
      "11",
      "59",
      "00",
    ]);
    expect(api.expired.value).toBe(false);
    wrapper.unmount();
  });

  it("décrémente à la seconde", async () => {
    const { wrapper, api } = mountCountdown({ until: Date.now() + 3_000 });
    expect(api.ss.value).toBe("03");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(api.ss.value).toBe("01");
    wrapper.unmount();
  });

  it("bascule `expired` à l'échéance et fige l'affichage à zéro", async () => {
    const { wrapper, api } = mountCountdown({ until: Date.now() + 2_000 });
    expect(api.expired.value).toBe(false);
    await vi.advanceTimersByTimeAsync(2_500);
    expect(api.expired.value).toBe(true);
    expect([api.dd.value, api.hh.value, api.mm.value, api.ss.value]).toEqual([
      "00",
      "00",
      "00",
      "00",
    ]);
    wrapper.unmount();
  });

  it("est expiré dès le montage si l'échéance est déjà passée", () => {
    const { wrapper, api } = mountCountdown({ until: Date.now() - 1 });
    expect(api.expired.value).toBe(true);
    wrapper.unmount();
  });

  it("accepte encore un décalage relatif, paddé sur deux chiffres", () => {
    const { wrapper, api } = mountCountdown({ days: 1, hours: 2, mins: 3, secs: 4 });
    expect([api.dd.value, api.hh.value, api.mm.value, api.ss.value]).toEqual([
      "01",
      "02",
      "03",
      "04",
    ]);
    wrapper.unmount();
  });
});
