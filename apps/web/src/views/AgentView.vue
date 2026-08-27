<script setup lang="ts">
/* Vue "AI Agent" : cockpit d'un agent LLM piloté sous mandat. Layout 3 colonnes :
 *  - sidebar gauche = infos agent + formulaire de mandat (MandateForm)
 *  - centre = chat temps réel (ChatPanel)
 *  - aside droite = journal d'actions (ActionLog)
 * Le kill switch est posé en header dès qu'un agent existe.
 * Sources de vérité : useAuth/useSession (identité), useAgent (état) et
 * useMandate (garde-fous). */

import { computed, onUnmounted, ref, watch } from "vue";
import type { MandateDto, TideClient } from "@tide/client";
import { errorMessage } from "../composables/messages";
import { useAgent } from "../composables/useAgent";
import { useAuth } from "../composables/useAuth";
import { useSession } from "../composables/useSession";
import { useI18n } from "../i18n/useI18n";
import ActionLog from "../components/agent/ActionLog.vue";
import ChatPanel from "../components/agent/ChatPanel.vue";
import KillSwitch from "../components/agent/KillSwitch.vue";
import MandateForm from "../components/agent/MandateForm.vue";

const props = defineProps<{ client: TideClient }>();

const session = useSession();
const { userId, liveAddress, walletConnected } = session;
const auth = useAuth(props.client);
const {
  agents,
  actions,
  activeMandate,
  error: agentError,
  refresh,
  loadActiveMandate,
  loadActions,
  clearMandate,
  clearDetails,
  clearState,
} = useAgent(props.client);

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
    newAgent: "New agent",
    cancel: "Cancel",
    selectAgent: "Agent",
    paperIdentity: "Paper identity",
    walletIdentity: "Wallet identity",
    initializing: "Loading your agent workspace…",
    retry: "Retry",
    continuePaper: "Continue in Paper",
    status: "Status",
    liveAccount: "Live account",
    yes: "yes",
    no: "no",
    mandateActive: "Mandate active — agent can trade",
    newMandate: "New mandate",
    stoppedHint: "This agent is stopped. Create a new agent to resume trading.",
    mCapital: "Max capital",
    mPairs: "Pairs",
    mLeverage: "Max leverage",
    mDaily: "Max daily loss",
    mValid: "Valid until",
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
    newAgent: "Nouvel agent",
    cancel: "Annuler",
    selectAgent: "Agent",
    paperIdentity: "Identité Paper",
    walletIdentity: "Identité wallet",
    initializing: "Chargement de ton espace agent…",
    retry: "Réessayer",
    continuePaper: "Continuer en Paper",
    status: "Statut",
    liveAccount: "Compte Live",
    yes: "oui",
    no: "non",
    mandateActive: "Mandat actif — l'agent peut trader",
    newMandate: "Nouveau mandat",
    stoppedHint: "Cet agent est arrêté. Crée un nouvel agent pour reprendre le trading.",
    mCapital: "Capital max",
    mPairs: "Paires",
    mLeverage: "Levier max",
    mDaily: "Perte max / jour",
    mValid: "Valide jusqu'au",
  },
});

/** Date lisible d'un timestamp ms (validité du mandat). */
function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

const selectedAgentId = ref("");
const creatingNew = ref(false);
const initializing = ref(true);
const identityError = ref<string | null>(null);
let identityGeneration = 0;

const currentAgent = computed(
  () => agents.value.find((agent) => agent.id === selectedAgentId.value) ?? null,
);
const identityLabel = computed(() =>
  walletConnected.value ? t("walletIdentity") : t("paperIdentity"),
);
// Ré-ouverture manuelle du formulaire pour créer un NOUVEAU mandat alors qu'un
// mandat actif existe déjà (le nouveau, une fois signé, supersede l'ancien).
const renewing = ref(false);
const showMandateForm = computed(
  () =>
    currentAgent.value !== null &&
    currentAgent.value.status !== "stopped" &&
    (activeMandate.value === null || renewing.value),
);

const newName = ref("");
const newType = ref<"integrated" | "external">("integrated");
const creating = ref(false);
const createError = ref<string | null>(null);

function resetAgentDetails(): void {
  clearDetails();
  renewing.value = false;
}

async function selectAgent(agentId: string): Promise<boolean> {
  const generation = identityGeneration;
  selectedAgentId.value = agentId;
  creatingNew.value = false;
  identityError.value = null;
  agentError.value = null;
  resetAgentDetails();
  if (agentId === "") return true;
  const [mandateLoaded, actionsLoaded] = await Promise.all([
    loadActiveMandate(agentId),
    loadActions(agentId),
  ]);
  if (generation !== identityGeneration || selectedAgentId.value !== agentId) {
    return false;
  }
  if (!mandateLoaded || !actionsLoaded) {
    identityError.value = agentError.value ?? "Unable to load agent details";
    return false;
  }
  return true;
}

function startCreatingAgent(): void {
  createError.value = null;
  newName.value = "";
  creatingNew.value = true;
  resetAgentDetails();
}

function cancelCreatingAgent(): void {
  creatingNew.value = false;
  createError.value = null;
  const fallback = agents.value.find((agent) => agent.id === selectedAgentId.value) ?? agents.value[0];
  if (fallback !== undefined) {
    void selectAgent(fallback.id);
  }
}

function onAgentSelection(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    void selectAgent(target.value);
  }
}

function retryIdentity(): void {
  void initializeIdentity();
}

function continueInPaper(): void {
  auth.clear();
  session.disconnectWallet();
}

/**
 * Résout l'identité active : wallet réellement authentifié si présent, sinon
 * session Paper anonyme persistante. La vue suit aussi une connexion wallet
 * réalisée après son montage.
 */
async function initializeIdentity(): Promise<void> {
  const generation = ++identityGeneration;
  initializing.value = true;
  identityError.value = null;
  clearState();
  renewing.value = false;
  creating.value = false;
  createError.value = null;
  newName.value = "";
  try {
    const resolvedUserId = walletConnected.value
      ? liveAddress.value
      : await auth.ensurePaperSession();
    if (generation !== identityGeneration) {
      // `ensurePaperSession` injecte son JWT dans le client. Si le flux est
      // devenu obsolète entre-temps, on rétablit immédiatement le token de
      // l'identité courante avant toute autre requête.
      auth.restore(liveAddress.value);
      return;
    }
    userId.value = resolvedUserId;
    // Un agent Paper trade sur le portefeuille de son owner. L'ouverture est
    // idempotente et rend la page autonome même si l'utilisateur arrive ici
    // avant d'avoir visité le terminal.
    await props.client.ensureAccount(userId.value);
    if (generation !== identityGeneration) return;
    const loaded = await refresh();
    if (generation !== identityGeneration) return;
    if (!loaded) {
      identityError.value = agentError.value ?? "Unable to load agents";
      return;
    }
    const selected =
      agents.value.find((agent) => agent.id === selectedAgentId.value) ?? agents.value[0];
    if (selected === undefined) {
      selectedAgentId.value = "";
      creatingNew.value = true;
      return;
    }
    await selectAgent(selected.id);
  } catch (e) {
    if (generation === identityGeneration) {
      identityError.value = errorMessage(e);
    }
  } finally {
    if (generation === identityGeneration) {
      initializing.value = false;
    }
  }
}

async function onCreateAgent(): Promise<void> {
  if (!userId.value) return;
  if (newName.value.trim() === "") {
    createError.value = t("nameLabel");
    return;
  }
  createError.value = null;
  creating.value = true;
  const ownerId = userId.value;
  const generation = identityGeneration;
  try {
    const created = await props.client.createAgent({
      userId: ownerId,
      name: newName.value.trim(),
      type: newType.value,
    });
    if (generation !== identityGeneration || userId.value !== ownerId) return;
    newName.value = "";
    const loaded = await refresh();
    if (generation !== identityGeneration || userId.value !== ownerId) return;
    if (!loaded || !agents.value.some((agent) => agent.id === created.id)) {
      agents.value = [created, ...agents.value];
    }
    await selectAgent(created.id);
  } catch (e) {
    if (generation === identityGeneration && userId.value === ownerId) {
      createError.value = errorMessage(e);
    }
  } finally {
    if (generation === identityGeneration && userId.value === ownerId) {
      creating.value = false;
    }
  }
}

async function onMandateCreated(mandate: MandateDto): Promise<void> {
  if (mandate.agentId !== currentAgent.value?.id || mandate.userId !== userId.value) return;
  // Feedback instantané : le mandat renvoyé est déjà actif (create + sign).
  activeMandate.value = mandate;
  renewing.value = false;
}

function onAgentKilled(agentId: string): void {
  agents.value = agents.value.map((agent) =>
    agent.id === agentId ? { ...agent, status: "stopped" } : agent,
  );
  if (currentAgent.value?.id === agentId) {
    clearMandate();
    renewing.value = false;
  }
}

/** Fin d'un tour de chat : recharge le journal pour y faire apparaître les
 * actions (trades) que l'agent vient d'exécuter. */
async function onTurnComplete(): Promise<void> {
  if (currentAgent.value) {
    await loadActions(currentAgent.value.id);
  }
}

watch([walletConnected, liveAddress], () => void initializeIdentity(), { immediate: true });

onUnmounted(() => {
  identityGeneration += 1;
  clearState();
});
</script>

<template>
  <div class="page agent-view" data-testid="agent-view">
    <div class="page-head">
      <div>
        <h1>{{ t('title') }}</h1>
        <span class="identity-chip">{{ identityLabel }}</span>
      </div>
      <div class="head-actions">
        <button
          v-if="currentAgent && !creatingNew"
          class="new-agent"
          data-testid="new-agent"
          @click="startCreatingAgent"
        >
          {{ t('newAgent') }}
        </button>
        <KillSwitch
          v-if="currentAgent && currentAgent.status !== 'stopped' && !creatingNew"
          :key="currentAgent.id"
          :client="client"
          :agent-id="currentAgent.id"
          @killed="onAgentKilled"
        />
      </div>
    </div>

    <div v-if="initializing" class="card state-note">{{ t('initializing') }}</div>
    <div v-else-if="identityError" class="card state-note error-note">
      <p>{{ identityError }}</p>
      <div class="recovery-actions">
        <button class="ghost" data-testid="retry-identity" @click="retryIdentity">
          {{ t('retry') }}
        </button>
        <button
          v-if="walletConnected"
          class="ghost"
          data-testid="continue-paper"
          @click="continueInPaper"
        >
          {{ t('continuePaper') }}
        </button>
      </div>
    </div>

    <div v-else class="deck">
      <!-- Sidebar gauche : création OU mandat -->
      <aside class="col left">
        <!-- Aucun agent ou mode « nouvel agent » : formulaire de création. -->
        <div v-if="creatingNew || !currentAgent" class="card create-card">
          <div class="create-head">
            <h3>{{ t('createTitle') }}</h3>
            <button
              v-if="agents.length > 0"
              class="text-button"
              type="button"
              @click="cancelCreatingAgent"
            >
              {{ t('cancel') }}
            </button>
          </div>
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
          <label v-if="agents.length > 1" class="agent-picker">
            <span>{{ t('selectAgent') }}</span>
            <select :value="selectedAgentId" @change="onAgentSelection">
              <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                {{ agent.name }} · {{ agent.status }}
              </option>
            </select>
          </label>
          <h2 class="agent-name">{{ currentAgent.name }}</h2>
          <dl class="meta">
            <div><dt>{{ t('status') }}</dt><dd>{{ currentAgent.status }}</dd></div>
            <div>
              <dt>{{ t('liveAccount') }}</dt>
              <dd>{{ currentAgent.hasLiveAccount ? t('yes') : t('no') }}</dd>
            </div>
          </dl>
          <p v-if="currentAgent.status === 'stopped'" class="stopped-note">
            {{ t('stoppedHint') }}
          </p>
          <MandateForm
            v-if="showMandateForm"
            :key="currentAgent.id"
            :client="client"
            :agent-id="currentAgent.id"
            @created="onMandateCreated"
          />
          <!-- Mandat actif : résumé (feedback « créé » + gardes en vigueur). -->
          <div v-else-if="activeMandate" class="mandate-active">
            <p class="ok">✓ {{ t('mandateActive') }}</p>
            <dl class="meta">
              <div><dt>{{ t('mCapital') }}</dt><dd>{{ activeMandate.capitalMax }}</dd></div>
              <div><dt>{{ t('mDaily') }}</dt><dd>{{ activeMandate.perteMaxJour }}</dd></div>
              <div><dt>{{ t('mLeverage') }}</dt><dd>{{ activeMandate.maxLeverage }}×</dd></div>
              <div><dt>{{ t('mPairs') }}</dt><dd>{{ activeMandate.pairesAutorisees.join(', ') }}</dd></div>
              <div><dt>{{ t('mValid') }}</dt><dd>{{ fmtDate(activeMandate.validUntil) }}</dd></div>
            </dl>
            <button class="ghost" @click="renewing = true">{{ t('newMandate') }}</button>
          </div>
        </div>
      </aside>

      <!-- Centre : chat agent -->
      <main class="col center">
        <ChatPanel
          v-if="currentAgent && currentAgent.status !== 'stopped' && !creatingNew"
          :key="currentAgent.id"
          :agent-id="currentAgent.id"
          @turn-complete="onTurnComplete"
        />
      </main>

      <!-- Aside droite : journal d'actions (rechargé après chaque tour) -->
      <aside class="col right">
        <ActionLog v-if="currentAgent && !creatingNew" :actions="actions" />
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

.identity-chip {
  display: inline-block;
  margin-top: 5px;
  color: var(--soft, rgba(255, 255, 255, 0.68));
  font-size: 12px;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.new-agent,
.state-note .ghost {
  padding: 8px 14px;
  border-radius: 100px;
  border: 1px solid var(--line2, #2a2a32);
  background: transparent;
  color: var(--fg, #fff);
  font-weight: 700;
  font-size: 12.5px;
  cursor: pointer;
}
.new-agent:hover,
.state-note .ghost:hover {
  border-color: var(--blue, #4f6aff);
}
.state-note {
  padding: 22px;
  color: var(--soft, rgba(255, 255, 255, 0.7));
}
.state-note p {
  margin: 0 0 12px;
}
.error-note {
  color: var(--down, #ffb9ac);
}
.recovery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
.create-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.create-head .text-button {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--soft, rgba(255, 255, 255, 0.7));
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.create-head .text-button:hover {
  color: var(--fg, #fff);
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
.stopped-note {
  margin: 0;
  color: var(--soft, rgba(255, 255, 255, 0.7));
  font-size: 12.5px;
  line-height: 1.45;
}
.agent-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  color: var(--soft, rgba(255, 255, 255, 0.7));
  font-size: 12.5px;
}
.agent-picker select {
  width: 100%;
  border: 1px solid var(--line, #2a2a32);
  border-radius: 8px;
  padding: 9px 11px;
  background: var(--panel2, #16161b);
  color: var(--fg, #fff);
  font: inherit;
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

.mandate-active {
  border-top: 1px solid var(--line2, #2a2a32);
  padding-top: 14px;
}
.mandate-active .ok {
  margin: 0 0 12px;
  font-weight: 700;
  font-size: 13px;
  color: #34d399;
}
.mandate-active .meta {
  display: grid;
  gap: 6px;
}
.mandate-active .meta div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--mono, ui-monospace);
  font-size: 12px;
}
.mandate-active .meta dt {
  color: var(--soft, rgba(255, 255, 255, 0.7));
  margin: 0;
}
.mandate-active .meta dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
.mandate-active .ghost {
  margin-top: 14px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--line2, #2a2a32);
  background: transparent;
  color: var(--soft, rgba(255, 255, 255, 0.75));
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.mandate-active .ghost:hover {
  border-color: var(--blue, #4f6aff);
  color: #fff;
}
</style>
