<!-- Instructions pour brancher un agent externe (MCP) à Claude Desktop :
 * affiche le JSON à coller dans `claude_desktop_config.json` (Settings →
 * Developer → Edit Config). Le bouton Copy passe par navigator.clipboard. -->

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{ agentId: string }>();

const { t } = useI18n({
  en: {
    title: "Connect Claude Desktop to this agent",
    step1: "Open Claude Desktop → Settings → Developer → Edit Config.",
    step2: "Paste the JSON below into claude_desktop_config.json.",
    step3: "Replace <your-tide-user-id> with your Tide user ID (shown in your session).",
    step4: "Restart Claude Desktop. The 'tide' MCP server should appear with its tools.",
    copyConfig: "Copy config",
    copied: "Copied!",
  },
  fr: {
    title: "Brancher Claude Desktop à cet agent",
    step1: "Ouvre Claude Desktop → Réglages → Développeur → Modifier la config.",
    step2: "Colle le JSON ci-dessous dans claude_desktop_config.json.",
    step3: "Remplace <your-tide-user-id> par ton identifiant Tide (visible dans ta session).",
    step4: "Redémarre Claude Desktop. Le serveur 'tide' MCP doit apparaître avec ses outils.",
    copyConfig: "Copier la config",
    copied: "Copié !",
  },
});

const copied = ref(false);

const configJson = computed(() => JSON.stringify({
  mcpServers: {
    "tide": {
      command: "npx",
      args: ["-y", "@tide/mcp"],
      env: {
        TIDE_AGENT_ID: props.agentId,
        TIDE_USER_ID: "<your-tide-user-id>",
        TIDE_API_BASE_URL: "https://your-tide-api.example",
      },
    },
  },
}, null, 2));

async function onCopy(): Promise<void> {
  await navigator.clipboard.writeText(configJson.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <section class="mcp-config" data-testid="mcp-config">
    <h3>{{ t('title') }}</h3>
    <ol class="steps">
      <li>{{ t('step1') }}</li>
      <li>{{ t('step2') }}</li>
      <li>{{ t('step3') }}</li>
      <li>{{ t('step4') }}</li>
    </ol>
    <pre class="config">{{ configJson }}</pre>
    <button class="copy" type="button" @click="onCopy">
      {{ copied ? t('copied') : t('copyConfig') }}
    </button>
  </section>
</template>

<style scoped>
.mcp-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: var(--panel, #1d1d24);
  border: 1px solid var(--line2, #2a2a32);
  border-radius: 14px;
  color: #fff;
  max-width: 560px;
}
.mcp-config h3 {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soft, rgba(255, 255, 255, 0.7));
}
.steps {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.85);
}
.steps li + li {
  margin-top: 4px;
}
.config {
  margin: 0;
  padding: 14px 16px;
  background: var(--panel2, #16161b);
  border: 1px solid var(--line, #2a2a32);
  border-radius: 8px;
  font-family: var(--mono, ui-monospace);
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
  overflow-x: auto;
  white-space: pre;
}
.copy {
  align-self: flex-start;
  padding: 10px 18px;
  border-radius: 100px;
  border: none;
  background: var(--blue, #4f6aff);
  color: #fff;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.copy:hover {
  opacity: 0.92;
}
</style>