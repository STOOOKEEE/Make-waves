<script setup lang="ts">
/* Vue "AI Agent" : cockpit d'un agent LLM piloté sous mandat. Layout 3 colonnes :
 *  - sidebar gauche = infos agent + formulaire de mandat (MandateForm)
 *  - centre = chat temps réel (ChatPanel)
 *  - aside droite = journal d'actions (ActionLog)
 * Le kill switch est posé en header dès qu'un agent existe.
 * Sources de vérité : useAgent (agents/refresh) + useMandate (create). */

import { computed, onMounted, ref } from "vue";
import type { TideClient } from "@tide/client";
import { errorMessage } from "../composables/messages";
import { useAgent } from "../composables/useAgent";
import { useMandate } from "../composables/useMandate";
import { useSession } from "../composables/useSession";
import { useI18n } from "../i18n/useI18n";
import ActionLog from "../components/agent/ActionLog.vue";
import ChatPanel from "../components/agent/ChatPanel.vue";
import KillSwitch from "../components/agent/KillSwitch.vue";
import MandateForm from "../components/agent/MandateForm.vue";

const props = defineProps<{ client: TideClient }>();

const { userId, connected } = useSession();
const { agents, activeMandate, refresh, loadActions } = useAgent(props.client);
const { create: createMandate } = useMandate(props.client);

const { t } = useI18n({
  en: {
    title: "AI Agent",
    createTitle: "Create an agent",
    nameLabel: "Agent name",
    namePlaceholder: "e.g. tide-momentum-v1",
    typeLabel: "Type",
    typeIntegrated: "Integrated",
    typeExternal: "External (MCP)",
    createBtn: "Create",
    status: "Status",
    liveAccount: "Live account",
    yes: "yes",
    no: "no",
    needsWallet: "Connect an XRP wallet to pilot an agent.",
  },
  fr: {
    title: "Agent IA",
    createTitle: "Créer un agent",
    nameLabel: "Nom de l'agent",
    namePlaceholder: "ex. tide-momentum-v1",
    typeLabel: "Type",
    typeIntegrated: "Intégré",
    typeExternal: "Externe (MCP)",
    createBtn: "Créer",
    status: "Statut",
    liveAccount: "Compte Live",
    yes: "oui",
    no: "non",
    needsWallet: "Connecte un wallet XRP pour piloter un agent.",
  },
});

const currentAgent = computed(() => agents.value[0] ?? null);
const showMandateForm = computed(() => currentAgent.value !== null && activeMandate.value === null);

const newName = ref("");
const newType = ref<"integrated" | "external">("integrated");
const creating = ref(false);
const createError = ref<string | null>(null);

async function onCreateAgent(): Promise<void> {
  if (!userId.value) return;
  if (newName.value.trim() === "") {
    createError.value = t("nameLabel");
    return;
  }
  createError.value = null;
  creating.value = true;
  try {
    await props.client.createAgent({
      userId: userId.value,
      name: newName.value.trim(),
      type: newType.value,
    });
    newName.value = "";
    await refresh();
  } catch (e) {
    createError.value = errorMessage(e);
  } finally {
    creating.value = false;
  }
}

async function onMandateCreated(): Promise<void> {
  await refresh();
}

onMounted(async () => {
  if (!connected.value) return;
  await refresh();
  if (currentAgent.value) {
    await loadActions(currentAgent.value.id);
  }
});
</script>

<template>
  <div class="page agent-view" data-testid="agent-view">
    <div class="page-head">
      <div>
        <h1>{{ t('title') }}</h1>
      </div>
      <KillSwitch
        v-if="currentAgent"
        :client="client"
        :agent-id="currentAgent.id"
      />
    </div>

    <!-- Invite de connexion : aucun agent possible sans wallet. -->
    <div v-if="!connected" class="card connect-note">{{ t('needsWallet') }}</div>

    <div v-else class="deck">
      <!-- Sidebar gauche : création OU mandat -->
      <aside class="col left">
        <!-- Pas encore d'agent : formulaire inline de création. -->
        <div v-if="!currentAgent" class="card create-card">
          <h3>{{ t('createTitle') }}</h3>
          <label class="field">
            <span>{{ t('nameLabel') }}</span>
            <input v-model="newName" type="text" :placeholder="t('namePlaceholder')" />
          </label>
          <label class="field">
            <span>{{ t('typeLabel') }}</span>
            <select v-model="newType">
              <option value="integrated">{{ t('typeIntegrated') }}</option>
              <option value="external">{{ t('typeExternal') }}</option>
            </select>
          </label>
          <button class="primary" :disabled="creating" @click="onCreateAgent">
            {{ creating ? '…' : t('createBtn') }}
          </button>
          <p v-if="createError" class="err">{{ createError }}</p>
        </div>

        <!-- Agent existant : carte d'identité + mandat -->
        <div v-else class="card id-card">
          <h2 class="agent-name">{{ currentAgent.name }}</h2>
          <dl class="meta">
            <div><dt>{{ t('status') }}</dt><dd>{{ currentAgent.status }}</dd></div>
            <div>
              <dt>{{ t('liveAccount') }}</dt>
              <dd>{{ currentAgent.hasLiveAccount ? t('yes') : t('no') }}</dd>
            </div>
          </dl>
          <MandateForm
            v-if="showMandateForm"
            :client="client"
            :agent-id="currentAgent.id"
            @created="onMandateCreated"
          />
        </div>
      </aside>

      <!-- Centre : chat agent -->
      <main class="col center">
        <ChatPanel v-if="currentAgent" :agent-id="currentAgent.id" />
      </main>

      <!-- Aside droite : journal d'actions -->
      <aside class="col right">
        <ActionLog v-if="currentAgent" :client="client" :agent-id="currentAgent.id" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
.page-head h1 {
  margin: 0;
}

.connect-note {
  padding: 22px;
  color: var(--soft, rgba(255, 255, 255, 0.7));
}

.deck {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(360px, 2.2fr) minmax(260px, 1fr);
  gap: 14px;
  align-items: start;
}
@media (max-width: 1100px) {
  .deck {
    grid-template-columns: 1fr;
  }
}

.col {
  min-width: 0;
}

.create-card,
.id-card {
  padding: 22px;
}
.create-card h3,
.id-card .agent-name {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.create-card .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12.5px;
  color: var(--soft, rgba(255, 255, 255, 0.7));
}
.create-card input,
.create-card select {
  background: var(--panel2, #16161b);
  border: 1px solid var(--line, #2a2a32);
  border-radius: 8px;
  padding: 9px 11px;
  color: var(--fg, #fff);
  font-size: 14px;
  font-family: inherit;
}
.create-card input:focus,
.create-card select:focus {
  outline: 1px solid var(--blue, #4f6aff);
  border-color: var(--blue, #4f6aff);
}
.create-card .primary {
  margin-top: 6px;
  padding: 10px 16px;
  border-radius: 100px;
  border: none;
  background: var(--blue, #4f6aff);
  color: #fff;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.create-card .primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.create-card .err {
  margin: 8px 0 0;
  color: var(--down, #ffb9ac);
  font-size: 12.5px;
}

.id-card .meta {
  margin: 0 0 16px;
  display: grid;
  gap: 6px;
}
.id-card .meta div {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono, ui-monospace);
  font-size: 12.5px;
}
.id-card .meta dt {
  color: var(--soft, rgba(255, 255, 255, 0.7));
  margin: 0;
}
.id-card .meta dd {
  margin: 0;
  font-weight: 700;
}
</style>