/* ===== Tutoriel interactif — machine à états =====
 *
 * Singleton au niveau module, comme `useWalletEntry` : l'état survit à la
 * navigation entre routes et reste le même pour tous les composants.
 *
 * Persistance sous `tide.tutorial`, toujours dans un try/catch (mode privé,
 * SSR) — convention maison, cf. `useSession.ts`. **Clé globale, pas namespacée
 * par compte** : le tutoriel a lieu *avant* le wallet, il n'existe pas encore
 * d'identité stable, et namespacer ferait rejouer le tuto à chaque nouvelle
 * identité `paper:*`.
 */
import { computed, readonly, ref } from "vue";
import { firstStepId, STEP_COUNT, stepIndexById, STEPS } from "../data/tutorial";

const STORAGE_KEY = "tide.tutorial";

export type TutorialStatus = "unseen" | "running" | "skipped" | "done";

interface Persisted {
  status: TutorialStatus;
  stepId: string;
  completed: string[];
}

function isStatus(value: unknown): value is TutorialStatus {
  return value === "unseen" || value === "running" || value === "skipped" || value === "done";
}

/** Lecture défensive : un stockage corrompu ne doit jamais casser la page. */
function load(): Persisted {
  const fallback: Persisted = { status: "unseen", stepId: firstStepId(), completed: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    const record = parsed as Record<string, unknown>;
    const status = isStatus(record.status) ? record.status : "unseen";
    const storedId = typeof record.stepId === "string" ? record.stepId : "";
    const stepId = stepIndexById(storedId) >= 0 ? storedId : firstStepId();
    const completed = Array.isArray(record.completed)
      ? record.completed.filter((id): id is string => typeof id === "string")
      : [];
    return { status, stepId, completed };
  } catch {
    return fallback;
  }
}

const initial = load();
const status = ref<TutorialStatus>(initial.status);
const stepId = ref<string>(initial.stepId);
const completed = ref<string[]>(initial.completed);

function persist(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        status: status.value,
        stepId: stepId.value,
        completed: completed.value,
      } satisfies Persisted),
    );
  } catch {
    // Stockage indisponible : l'état reste valable en mémoire pour la session.
  }
}

export function useTutorial() {
  const index = computed(() => Math.max(0, stepIndexById(stepId.value)));
  const total = STEP_COUNT;
  const isLast = computed(() => index.value >= total - 1);
  /** Proposé au premier passage uniquement : jamais de relance insistante. */
  const shouldOffer = computed(() => status.value === "unseen");
  const isResumable = computed(
    () => status.value === "running" && index.value > 0,
  );

  function start(fromId?: string): void {
    if (fromId !== undefined && stepIndexById(fromId) >= 0) {
      stepId.value = fromId;
    } else if (status.value === "unseen" || status.value === "done") {
      stepId.value = firstStepId();
    }
    status.value = "running";
    persist();
  }

  function goTo(id: string): void {
    if (stepIndexById(id) < 0) return;
    stepId.value = id;
    if (status.value !== "running") status.value = "running";
    persist();
  }

  function next(): void {
    const target = STEPS[Math.min(index.value + 1, total - 1)];
    if (target === undefined) return;
    if (target.id === stepId.value) {
      finish();
      return;
    }
    stepId.value = target.id;
    persist();
  }

  function back(): void {
    const target = STEPS[Math.max(index.value - 1, 0)];
    if (target === undefined) return;
    stepId.value = target.id;
    persist();
  }

  function skip(): void {
    status.value = "skipped";
    persist();
  }

  function finish(): void {
    status.value = "done";
    markCompleted(stepId.value);
    persist();
  }

  function markCompleted(id: string): void {
    if (completed.value.includes(id)) return;
    completed.value = [...completed.value, id];
    persist();
  }

  function reset(): void {
    status.value = "unseen";
    stepId.value = firstStepId();
    completed.value = [];
    persist();
  }

  return {
    status: readonly(status),
    stepId: readonly(stepId),
    completed: readonly(completed),
    index,
    total,
    isLast,
    shouldOffer,
    isResumable,
    start,
    goTo,
    next,
    back,
    skip,
    finish,
    markCompleted,
    reset,
  };
}
