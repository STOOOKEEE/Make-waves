<script setup lang="ts">
import { ref } from "vue";
import type { TideClient } from "@tide/client";
import { useAgent } from "../../composables/useAgent";
import { useI18n } from "../../i18n/useI18n";

/* Bouton d'arrêt d'urgence d'un agent. 1er clic = ouvre une modale de
 * confirmation ; 2e clic = kill réel (POST /api/agents/:id/kill). Toast
 * court sur succès. */

const props = defineProps<{ client: TideClient; agentId: string }>();
const emit = defineEmits<{ killed: [agentId: string] }>();

const { t } = useI18n({
  en: {
    label: "Kill switch",
    confirm: "Confirm stop",
    cancel: "Cancel",
    done: "Agent stopped",
    title: "Stop this agent?",
    body: "All active mandates will be revoked. The agent will no longer be able to trade.",
  },
  fr: {
    label: "Kill switch",
    confirm: "Confirmer l'arrêt",
    cancel: "Annuler",
    done: "Agent arrêté",
    title: "Arrêter cet agent ?",
    body: "Tous les mandats actifs seront révoqués. L'agent ne pourra plus trader.",
  },
});

const { kill, error } = useAgent(props.client);

const confirming = ref(false);
const done = ref(false);
const submitting = ref(false);

async function confirmKill(): Promise<void> {
  submitting.value = true;
  const killed = await kill(props.agentId);
  submitting.value = false;
  confirming.value = false;
  if (!killed) return;
  emit("killed", props.agentId);
  done.value = true;
  // Le toast s'efface tout seul après 2.5 s.
  setTimeout(() => {
    done.value = false;
  }, 2500);
}
</script>

<template>
  <div class="ks">
    <button class="ksbtn" :disabled="submitting" @click="confirming = true">
      ⚠ {{ t('label') }}
    </button>
    <span v-if="done" class="ok">✓ {{ t('done') }}</span>
    <span v-if="error" class="kill-error">{{ error }}</span>

    <div v-if="confirming" class="ov" @click.self="confirming = false">
      <div class="modal">
        <h3>{{ t('title') }}</h3>
        <p>{{ t('body') }}</p>
        <div class="acts">
          <button class="ghost" @click="confirming = false">{{ t('cancel') }}</button>
          <button class="danger" :disabled="submitting" @click="confirmKill">
            {{ submitting ? "…" : t('confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ks {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.ksbtn {
  padding: 8px 14px;
  border-radius: 100px;
  background: rgba(255, 185, 172, 0.1);
  color: var(--down, #ffb9ac);
  border: 1px solid rgba(255, 185, 172, 0.4);
  font-weight: 700;
  font-size: 12.5px;
  cursor: pointer;
}
.ksbtn:hover {
  background: rgba(255, 185, 172, 0.2);
}
.ksbtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ok {
  color: var(--up, #bff6ce);
  font-size: 12.5px;
  font-weight: 700;
}
.kill-error {
  color: var(--down, #ffb9ac);
  font-size: 12.5px;
}
.ov {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: min(360px, 92vw);
  background: #14141a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 22px 24px 20px;
  color: #fff;
}
.modal h3 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 800;
}
.modal p {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.78);
}
.acts {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.ghost {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  padding: 9px 16px;
  border-radius: 100px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.danger {
  background: var(--down, #ffb9ac);
  color: #1a0a0a;
  border: none;
  padding: 9px 16px;
  border-radius: 100px;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
}
.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
