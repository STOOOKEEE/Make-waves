import type { Directive } from "vue";

/*
 * v-mag — bouton « magnétique » : suit légèrement le curseur au survol puis
 * revient à sa place. Désactivé si prefers-reduced-motion. Landing uniquement.
 */

function reduced(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface MagState {
  move: (e: MouseEvent) => void;
  leave: () => void;
}

const states = new WeakMap<HTMLElement, MagState>();

export const magnetic: Directive<HTMLElement> = {
  mounted(el) {
    if (reduced()) {
      return;
    }
    const move = (e: MouseEvent): void => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25;
      const y = (e.clientY - r.top - r.height / 2) * 0.35;
      el.style.transform = `translate(${x}px,${y}px)`;
    };
    const leave = (): void => {
      el.style.transform = "translate(0,0)";
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    states.set(el, { move, leave });
  },
  unmounted(el) {
    const s = states.get(el);
    if (s) {
      el.removeEventListener("mousemove", s.move);
      el.removeEventListener("mouseleave", s.leave);
      states.delete(el);
    }
  },
};
