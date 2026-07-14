import { ref } from "vue";
import { errorMessage } from "./messages";
import { useSession } from "./useSession";
import { readSessionToken } from "./useAuth";
import { API_BASE } from "../lib/client";

/** Borne haute du buffer de messages en mémoire (évite la croissance non
 * bornée d'une longue conversation). */
const MESSAGES_BUFFER_LIMIT = 200;

/** Nombre de messages passés à l'agent comme contexte (mémoire de conversation).
 * Borné pour maîtriser la fenêtre de contexte du LLM et le coût (crédits). */
const HISTORY_LIMIT = 20;

/** Un message affiché dans le chat. `toolCalls` n'est présent que sur les
 * messages assistant qui ont déclenché des outils. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ name: string; args?: unknown; result?: unknown }>;
  timestamp: number;
}

/** Forme d'un événement SSE émis par `AgentChatService.stream(...)` et
 *  sérialisé par le serveur (`apps/api/src/http/server.ts`). Le front
 *  parse chaque ligne `data: {...}` en ce type. */
type AgentChatEvent =
  | { type: "text_delta"; data: { text: string } }
  | { type: "tool_result"; data: { name: string; result: unknown } }
  | { type: "error"; data: { message: string } }
  | { type: "done" };

/** Logique du chat agent : envoie un prompt, lit le flux SSE, reconstruit
 *  la liste de messages (textes accumulés + tool_calls résolus).
 *
 *  Le serveur n'émet que 4 types d'événements : `text_delta` (token de
 *  texte), `tool_result` (sortie d'un tool que le serveur a exécuté),
 *  `error` (message d'erreur lisible) et `done` (fin de tour). Il n'émet
 *  **pas** de `tool_use` : les `args` ne remontent jamais au front (le
 *  LLM les a « consommés » côté serveur), donc on ne peut afficher que
 *  `{name, result}` par tool_call. */
export function useAgentChat() {
  const { userId } = useSession();
  const messages = ref<ChatMessage[]>([]);
  const streaming = ref(false);
  const error = ref<string | null>(null);

  async function send(agentId: string, content: string): Promise<void> {
    if (!userId.value) {
      error.value = "No user session";
      return;
    }
    error.value = null;
    // Historique = conversation AVANT ce message (mémoire de l'agent). Envoyé
    // au backend qui le préfixe aux messages du LLM → l'agent se souvient des
    // tours précédents (« exécute » se réfère au plan discuté juste avant).
    const history = messages.value
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));
    const userMsg: ChatMessage = {
      role: "user",
      content,
      timestamp: Date.now(),
    };
    messages.value = [
      ...messages.value,
      userMsg,
    ].slice(-MESSAGES_BUFFER_LIMIT);
    streaming.value = true;
    let assistantContent = "";
    const toolCalls: NonNullable<ChatMessage["toolCalls"]> = [];
    try {
      const token = readSessionToken();
      const response = await fetch(`${API_BASE}/api/agent-chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ agentId, userId: userId.value, message: content, history }),
      });
      if (!response.body) throw new Error("No response body");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // Le serveur termine le stream par un `reply.raw.end()` — `done` peut
      // arriver en plein milieu d'un chunk, on l'utilise juste pour figer
      // l'état. La fin technique reste gérée par `done` du reader.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6)) as AgentChatEvent;
          if (event.type === "text_delta") {
            assistantContent += event.data.text;
          } else if (event.type === "tool_result") {
            toolCalls.push({ name: event.data.name, result: event.data.result });
          } else if (event.type === "error") {
            error.value = event.data.message;
          }
        }
      }
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: assistantContent,
        toolCalls,
        timestamp: Date.now(),
      };
      messages.value = [
        ...messages.value,
        assistantMsg,
      ].slice(-MESSAGES_BUFFER_LIMIT);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      streaming.value = false;
    }
  }

  return { messages, streaming, error, send };
}
