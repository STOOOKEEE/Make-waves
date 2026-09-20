import { ref, onUnmounted } from "vue";
import type { AgentActionDto, AgentDto, MandateDto, TideClient } from "@tide/client";
import { errorMessage } from "./messages";
import { useSession } from "./useSession";
import { readTokenForUser } from "./useAuth";
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
  let refreshRequest = 0;
  let mandateRequest = 0;
  let actionsRequest = 0;

  async function refresh(): Promise<boolean> {
    if (!userId.value) return false;
    const requestedUserId = userId.value;
    const request = ++refreshRequest;
    error.value = null;
    loading.value = true;
    try {
      const next = await client.agents(requestedUserId);
      if (request !== refreshRequest || userId.value !== requestedUserId) {
        return false;
      }
      agents.value = next;
      return true;
    } catch (e) {
      if (request === refreshRequest && userId.value === requestedUserId) {
        error.value = errorMessage(e);
      }
      return false;
    } finally {
      if (request === refreshRequest) {
        loading.value = false;
      }
    }
  }

  /** Récupère le mandat ACTIF (signé, non expiré) de l'agent, sinon `null`. */
  async function loadActiveMandate(agentId: string): Promise<boolean> {
    if (!userId.value) return false;
    const requestedUserId = userId.value;
    const request = ++mandateRequest;
    try {
      const list = await client.mandates(agentId);
      const now = Date.now();
      // Le plus récemment signé gagne (cohérent avec le backend getActive).
      const actives = list
        .filter((m) => m.status === "active" && m.validUntil > now)
        .sort((a, b) => (b.signedAt ?? 0) - (a.signedAt ?? 0));
      if (request === mandateRequest && userId.value === requestedUserId) {
        activeMandate.value = actives[0] ?? null;
        return true;
      }
      return false;
    } catch (e) {
      if (request === mandateRequest && userId.value === requestedUserId) {
        error.value = errorMessage(e);
      }
      return false;
    }
  }

  async function loadActions(agentId: string): Promise<boolean> {
    if (!userId.value) return false;
    const requestedUserId = userId.value;
    const request = ++actionsRequest;
    try {
      const next = await client.agentActions(agentId);
      if (request === actionsRequest && userId.value === requestedUserId) {
        actions.value = next;
        return true;
      }
      return false;
    } catch (e) {
      if (request === actionsRequest && userId.value === requestedUserId) {
        error.value = errorMessage(e);
      }
      return false;
    }
  }

  /** Invalide les lectures de détail en vol lors d'un changement d'agent. */
  function clearMandate(): void {
    mandateRequest += 1;
    activeMandate.value = null;
  }

  function clearActions(): void {
    actionsRequest += 1;
    actions.value = [];
  }

  function clearDetails(): void {
    clearMandate();
    clearActions();
  }

  /** Invalide tout l'état en vol lors d'un changement d'identité. */
  function clearState(): void {
    refreshRequest += 1;
    loading.value = false;
    error.value = null;
    agents.value = [];
    clearDetails();
  }

  async function kill(agentId: string): Promise<boolean> {
    if (!userId.value) return false;
    error.value = null;
    try {
      await client.killAgent(agentId);
      await refresh();
      return true;
    } catch (e) {
      error.value = errorMessage(e);
      return false;
    }
  }

  function connectSse(): void {
    if (events) return;
    // EventSource ne pose pas de header → le token de session passe en query.
    const token = readTokenForUser(userId.value);
    const url = token
      ? `${API_BASE}/api/agents/events?token=${encodeURIComponent(token)}`
      : `${API_BASE}/api/agents/events`;
    events = new EventSource(url);
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
    clearMandate,
    clearDetails,
    clearState,
    kill,
    connectSse,
    disconnectSse,
  };
}
