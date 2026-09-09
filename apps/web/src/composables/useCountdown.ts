import { onMounted, onUnmounted, ref, type Ref } from "vue";

/*
 * useCountdown — compte à rebours réactif, dans deux modes.
 *
 * - `{ until: <timestamp ms> }` : échéance ABSOLUE, la même pour tout le monde.
 *   C'est le mode à utiliser pour une vraie date de fin (clôture d'une tombola,
 *   d'une compétition) : deux visiteurs voient le même temps restant et un
 *   rechargement ne remet rien à zéro.
 * - `{ days, hours, mins, secs }` : décalage RELATIF au montage. Utile pour une
 *   démo ou un aperçu, jamais pour une échéance réelle — chaque visiteur
 *   repartirait de la même durée indéfiniment.
 *
 * Expose des chaînes paddées (dd/hh/mm/ss) et `expired`, qui permet de basculer
 * une page en état « clos » sans dupliquer le calcul de la date.
 */

export interface CountdownParts {
  days?: number;
  hours?: number;
  mins?: number;
  secs?: number;
}

/** Échéance absolue, en millisecondes depuis l'epoch. */
export interface CountdownDeadline {
  until: number;
}

export interface CountdownApi {
  dd: Ref<string>;
  hh: Ref<string>;
  mm: Ref<string>;
  ss: Ref<string>;
  /** `true` dès que l'échéance est atteinte (et au montage si elle est déjà passée). */
  expired: Ref<boolean>;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isDeadline(target: CountdownParts | CountdownDeadline): target is CountdownDeadline {
  return "until" in target;
}

export function useCountdown(target: CountdownParts | CountdownDeadline): CountdownApi {
  const dd = ref("00");
  const hh = ref("00");
  const mm = ref("00");
  const ss = ref("00");
  const expired = ref(false);
  let deadline = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  function tick(): void {
    let left = Math.max(0, deadline - Date.now());
    expired.value = left === 0;
    const days = Math.floor(left / DAY_MS);
    left -= days * DAY_MS;
    const hours = Math.floor(left / HOUR_MS);
    left -= hours * HOUR_MS;
    const mins = Math.floor(left / MIN_MS);
    left -= mins * MIN_MS;
    dd.value = pad(days);
    hh.value = pad(hours);
    mm.value = pad(mins);
    ss.value = pad(Math.floor(left / 1000));
    // Une fois l'échéance passée, plus rien ne bouge : on arrête le timer.
    if (expired.value && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  onMounted(() => {
    deadline = isDeadline(target)
      ? target.until
      : Date.now() +
        (target.days ?? 0) * DAY_MS +
        (target.hours ?? 0) * HOUR_MS +
        (target.mins ?? 0) * MIN_MS +
        (target.secs ?? 0) * 1000;
    tick();
    if (!expired.value) {
      timer = setInterval(tick, 1000);
    }
  });

  onUnmounted(() => {
    if (timer !== undefined) {
      clearInterval(timer);
    }
  });

  return { dd, hh, mm, ss, expired };
}
