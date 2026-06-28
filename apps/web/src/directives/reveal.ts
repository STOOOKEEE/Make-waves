import type { Directive } from "vue";

/*
 * v-reveal — révélation au scroll (rise + fade), pilotée par IntersectionObserver.
 * L'élément reçoit la classe `.rv` (état caché défini dans base.css) puis `.in`
 * une fois entré dans le viewport.
 *
 * Usage : `v-reveal` ou `v-reveal="120"` (délai en ms pour étager une grille).
 * prefers-reduced-motion : révélé immédiatement.
 */

function reduced(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const observers = new WeakMap<HTMLElement, IntersectionObserver>();

export const reveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    const delay = typeof binding.value === "number" ? binding.value : 0;
    if (delay > 0) {
      el.style.setProperty("--rv-delay", `${delay}ms`);
    }

    el.classList.add("rv");

    if (reduced() || typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("in");
            io.unobserve(el);
            observers.delete(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    observers.set(el, io);
  },
  unmounted(el) {
    const io = observers.get(el);
    if (io) {
      io.disconnect();
      observers.delete(el);
    }
  },
};
