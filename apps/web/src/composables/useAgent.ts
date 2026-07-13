import { ref, onUnmounted } from "vue";
import type { AgentActionDto, AgentDto, MandateDto, TideClient } from "@tide/client";
import { errorMessage } from "./messages";
import { useSession } from "./useSession";
import { API_BASE } from "../lib/client";

/** Borne haute du buffer d'actions en mémoire (évite la croissance non bornée). */
const ACTIONS_BUFFER_LIMIT = 200;

/** Logique du pilotage d'agents : CRUD + historique d'actions + bus SSE. */
export function useAgent(client: TideClient) {
  const { userId } = useSession();
  const agents = ref<AgentDto[]>([]);
  const actions = ref<AgentActionDto[]>([]);
  const activeMandate = ref<MandateDto | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let events: EventSource | null = null;

  async function refresh(): Promise<void> {
    if (!userId.value) return;
    error.value = null;
    loading.value = true;
    try {
      agents.value = await client.agents(userId.value);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  /** Récupère le mandat ACTIF (signé, non expiré) de l'agent, sinon `null`. */
  async function loadActiveMandate(agentId: string): Promise<void> {
    if (!userId.value) return;
    try {
      const list = await client.mandates(agentId);
      const now = Date.now();
      // Le plus récemment signé gagne (cohérent avec le backend getActive).
      const actives = list
        .filter((m) => m.status === "active" && m.validUntil > now)
        .sort((a, b) => (b.signedAt ?? 0) - (a.signedAt ?? 0));
      activeMandate.value = actives[0] ?? null;
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  async function loadActions(agentId: string): Promise<void> {
    if (!userId.value) return;
    error.value = null;
    try {
      actions.value = await client.agentActions(agentId);
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  async function kill(agentId: string): Promise<void> {
    if (!userId.value) return;
    error.value = null;
    try {
      await client.killAgent(agentId);
      await refresh();
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  function connectSse(): void {
    if (events) return;
    events = new EventSource(`${API_BASE}/api/agents/events`);
    events.onmessage = (ev) => {
      const parsed = JSON.parse(ev.data) as { type: string; [k: string]: unknown };
      if (parsed.type === "agent_killed") {
        const id = parsed.agentId;
        if (typeof id === "string") {
          // Immutable update : AgentDto est `readonly`, on reconstruit la liste.
          agents.value = agents.value.map((x) =>
            x.id === id ? { ...x, status: "stopped" } : x,
          );
        }
      } else if (parsed.type === "agent_action") {
        actions.value = [
          parsed as unknown as AgentActionDto,
          ...actions.value,
        ].slice(0, ACTIONS_BUFFER_LIMIT);
      }
    };
  }

  function disconnectSse(): void {
    if (events) {
      events.close();
      events = null;
    }
  }

  onUnmounted(disconnectSse);

  return {
    agents,
    actions,
    activeMandate,
    loading,
    error,
    refresh,
    loadActiveMandate,
    loadActions,
    kill,
    connectSse,
    disconnectSse,
  };
}
