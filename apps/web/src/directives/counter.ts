import type { Directive } from "vue";

/*
 * v-count — compteur animé (easeOutCubic) déclenché à l'entrée dans le viewport.
 * Usage : v-count="{ to: 2.4, pre: '$', suf: 'M', dec: 1 }".
 * prefers-reduced-motion : affiche directement la valeur finale.
 */

export interface CounterOptions {
  to: number;
  pre?: string;
  suf?: string;
  dec?: number;
  duration?: number;
}

function reduced(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function format(value: number, o: CounterOptions): string {
  return (o.pre ?? "") + value.toFixed(o.dec ?? 0) + (o.suf ?? "");
}

const observers = new WeakMap<HTMLElement, IntersectionObserver>();

function run(el: HTMLElement, o: CounterOptions): void {
  const duration = o.duration ?? 1300;
  const start = performance.now();
  const tick = (now: number): void => {
    let p = Math.min((now - start) / duration, 1);
    p = 1 - Math.pow(1 - p, 3);
    el.textContent = format(o.to * p, o);
    if (p < 1) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

export const counter: Directive<HTMLElement, CounterOptions> = {
  mounted(el, binding) {
    const o = binding.value;
    el.textContent = format(0, o);

    if (reduced() || typeof IntersectionObserver === "undefined") {
      el.textContent = format(o.to, o);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run(el, o);
            io.unobserve(el);
            observers.delete(el);
          }
        }
      },
      { threshold: 0.6 },
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
