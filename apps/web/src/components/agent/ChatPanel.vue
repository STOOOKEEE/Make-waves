<script setup lang="ts">
import { nextTick, ref } from "vue";
import { useAgentChat } from "../../composables/useAgentChat";
import { useI18n } from "../../i18n/useI18n";
import { parseInline } from "../../lib/inline-markdown";

/* Panneau de chat agent. Affiche la conversation (user + assistant), les
 * appels d'outils résolus par le serveur, et un indicateur « réflexion »
 * pendant le streaming. Délègue toute la logique à `useAgentChat` (T28). */

const props = defineProps<{ agentId: string }>();
// Émis à la fin d'un tour (réponse + outils exécutés) → le parent recharge
// le journal d'actions pour y faire apparaître les trades qui viennent de passer.
const emit = defineEmits<{ (e: "turn-complete"): void }>();

const { t } = useI18n({
  en: {
    placeholder: "Ask the agent…",
    send: "Send",
    thinking: "Thinking…",
    error: "Error",
  },
  fr: {
    placeholder: "Demander à l'agent…",
    send: "Envoyer",
    thinking: "Réflexion…",
    error: "Erreur",
  },
});

const { messages, streaming, error, send } = useAgentChat();

const input = ref("");
const messagesEl = ref<HTMLElement | null>(null);

async function onSubmit(): Promise<void> {
  const content = input.value.trim();
  if (content === "") return;
  input.value = "";
  await send(props.agentId, content);
  emit("turn-complete");
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

/** Un tool_result en erreur porte `{ isError: true, message }`. */
function isToolError(result: unknown): boolean {
  return (result as { isError?: boolean } | null)?.isError === true;
}

/** Rend un résultat d'outil SANS dump JSON : un ✓ discret en succès, le message
 * en erreur. Les données utiles (prix, soldes) sont déjà résumées dans la
 * réponse texte de l'agent ; les cartes indiquent juste QUELS outils ont tourné. */
function formatToolResult(result: unknown): string {
  if (isToolError(result)) {
    return (result as { message?: string }).message ?? "error";
  }
  return "✓";
}
</script>

<template>
  <div class="chat-panel" data-testid="chat-panel">
    <div class="messages" ref="messagesEl">
      <div
        v-for="m in messages"
        :key="m.timestamp"
        :class="['msg', m.role]"
      >
        <div class="content">
          <template v-for="(seg, i) in parseInline(m.content)" :key="i">
            <strong v-if="seg.t === 'bold'">{{ seg.v }}</strong>
            <code v-else-if="seg.t === 'code'" class="inline-code">{{ seg.v }}</code>
            <template v-else>{{ seg.v }}</template>
          </template>
        </div>
        <div v-if="m.toolCalls && m.toolCalls.length > 0" class="tools">
          <div
            v-for="(tc, i) in m.toolCalls"
            :key="i"
            class="tool-call"
            :class="{ err: isToolError(tc.result) }"
          >
            <span class="tool-name">{{ tc.name }}</span>
            <span class="tool-result">{{ formatToolResult(tc.result) }}</span>
          </div>
        </div>
      </div>
      <div v-if="streaming" class="msg assistant thinking" :aria-label="t('thinking')">
        <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
        <span class="thinking-label">{{ t('thinking') }}</span>
      </div>
    </div>
    <form @submit.prevent="onSubmit" class="input-row">
      <input
        v-model="input"
        :placeholder="t('placeholder')"
        :disabled="streaming"
      />
      <button type="submit" :disabled="streaming || input.trim() === ''">
        {{ streaming ? t('thinking') : t('send') }}
      </button>
    </form>
    <p v-if="error" class="err">{{ t('error') }}: {{ error }}</p>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  background: var(--panel, #1d1d24);
  border: 1px solid var(--line2, #2a2a32);
  border-radius: 14px;
  color: #fff;
  max-width: 640px;
  height: 520px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.msg {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.45;
  max-width: 88%;
  word-wrap: break-word;
}

.msg.user {
  align-self: flex-end;
  background: var(--blue, #4f6aff);
  color: #fff;
}

.msg.assistant {
  align-self: flex-start;
  background: var(--panel2, #16161b);
  border: 1px solid var(--line2, #2a2a32);
}

.msg.assistant.thinking {
  color: var(--soft, rgba(255, 255, 255, 0.62));
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 14px;
}

.dots {
  display: inline-flex;
  gap: 5px;
}

.thinking-label {
  font-size: 12.5px;
  font-style: italic;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: dot-bounce 1.1s infinite ease-in-out both;
}
.dot:nth-child(2) {
  animation-delay: 0.15s;
}
.dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes dot-bounce {
  0%,
  70%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  35% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* Respecte la préférence système « moins d'animations ». */
@media (prefers-reduced-motion: reduce) {
  .dot {
    animation: none;
    opacity: 0.6;
  }
}

.content {
  white-space: pre-wrap;
}

.inline-code {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.92em;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 1px 5px;
}

.tools {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 8px;
  border-top: 1px solid var(--line2, #2a2a32);
}

/* Une carte compacte par appel d'outil : nom (chip) + résultat tronqué. */
.tool-call {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11.5px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  background: rgba(79, 106, 255, 0.08);
  border: 1px solid rgba(79, 106, 255, 0.22);
  border-radius: 8px;
  padding: 5px 9px;
  word-break: break-word;
}

.tool-call.err {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}

.tool-name {
  font-weight: 700;
  color: var(--blue, #4f6aff);
  white-space: nowrap;
}

.tool-call.err .tool-name {
  color: #f87171;
}

.tool-result {
  color: var(--soft, rgba(255, 255, 255, 0.62));
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
  background: var(--panel2, #16161b);
  border: 1px solid var(--line, #2a2a32);
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
}

.input-row input:focus {
  outline: 1px solid var(--blue, #4f6aff);
  border-color: var(--blue, #4f6aff);
}

.input-row input:disabled {
  opacity: 0.5;
}

.input-row button {
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: var(--blue, #4f6aff);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.input-row button:hover:not(:disabled) {
  background: #5a73ff;
}

.input-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.err {
  color: var(--down, #ffb9ac);
  font-size: 12.5px;
  margin: 0;
}
</style>