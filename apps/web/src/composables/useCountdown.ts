import { onMounted, onUnmounted, ref } from "vue";

/*
 * useCountdown — compte à rebours réactif. On fournit un décalage initial
 * (jours/heures/min/sec) ; le composable calcule une cible au montage puis
 * décrémente chaque seconde. Expose des chaînes paddées (dd/hh/mm/ss).
 */

export interface CountdownParts {
  days?: number;
  hours?: number;
  mins?: number;
  secs?: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function useCountdown(parts: CountdownParts) {
  const dd = ref("00");
  const hh = ref("00");
  const mm = ref("00");
  const ss = ref("00");

  let target = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  function tick(): void {
    let d = Math.max(0, target - Date.now());
    const days = Math.floor(d / 86_400_000);
    d -= days * 86_400_000;
    const hours = Math.floor(d / 3_600_000);
    d -= hours * 3_600_000;
    const mins = Math.floor(d / 60_000);
    d -= mins * 60_000;
    const secs = Math.floor(d / 1000);
    dd.value = pad(days);
    hh.value = pad(hours);
    mm.value = pad(mins);
    ss.value = pad(secs);
  }

  onMounted(() => {
    const offset =
      (parts.days ?? 0) * 86_400_000 +
      (parts.hours ?? 0) * 3_600_000 +
      (parts.mins ?? 0) * 60_000 +
      (parts.secs ?? 0) * 1000;
    target = Date.now() + offset;
    tick();
    timer = setInterval(tick, 1000);
  });

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer);
    }
  });

  return { dd, hh, mm, ss };
}
