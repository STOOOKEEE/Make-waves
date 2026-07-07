<script setup lang="ts">
import { nextTick, ref } from "vue";
import { useAgentChat } from "../../composables/useAgentChat";
import { useI18n } from "../../i18n/useI18n";

/* Panneau de chat agent. Affiche la conversation (user + assistant), les
 * appels d'outils résolus par le serveur, et un indicateur « réflexion »
 * pendant le streaming. Délègue toute la logique à `useAgentChat` (T28). */

const props = defineProps<{ agentId: string }>();

const { t } = useI18n({
  en: {
    placeholder: "Ask the agent…",
    send: "Send",
    thinking: "Thinking…",
    error: "Error",
    toolSeparator: "→",
  },
  fr: {
    placeholder: "Demander à l'agent…",
    send: "Envoyer",
    thinking: "Réflexion…",
    error: "Erreur",
    toolSeparator: "→",
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
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
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
        <div class="content">{{ m.content }}</div>
        <div v-if="m.toolCalls && m.toolCalls.length > 0" class="tools">
          <div
            v-for="(tc, i) in m.toolCalls"
            :key="i"
            class="tool-call"
          >
            <span class="tool-name">🔧 {{ tc.name }}</span>
            <span v-if="tc.result !== undefined" class="tool-result">
              {{ t('toolSeparator') }} {{ JSON.stringify(tc.result) }}
            </span>
          </div>
        </div>
      </div>
      <div v-if="streaming" class="msg assistant thinking">…</div>
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
  color: var(--soft, rgba(255, 255, 255, 0.6));
  font-style: italic;
}

.content {
  white-space: pre-wrap;
}

.tools {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--line2, #2a2a32);
}

.tool-call {
  font-size: 12px;
  color: var(--soft, rgba(255, 255, 255, 0.78));
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  word-break: break-all;
}

.tool-name {
  font-weight: 700;
  color: var(--blue, #4f6aff);
  margin-right: 6px;
}

.tool-result {
  color: var(--soft, rgba(255, 255, 255, 0.7));
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