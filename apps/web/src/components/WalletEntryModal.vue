<script setup lang="ts">
import { computed, ref } from "vue";
import type { TideClient } from "@tide/client";
import { errorMessage } from "../composables/messages";
import { PAPER_WALLET_CHANGED_EVENT, useWalletEntry } from "../composables/useWalletEntry";
import { usePaper } from "../composables/usePaper";
import { useAuth } from "../composables/useAuth";
import { useSession } from "../composables/useSession";
import { useWallet } from "../composables/useWallet";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();

const { open, close } = useWalletEntry();
const paper = usePaper(props.client);
const auth = useAuth(props.client);
const wallet = useWallet(props.client);
const session = useSession();
const creating = ref(false);
const preparing = ref(false);
const error = ref("");

const connected = computed(() => session.walletConnected.value);

const { t } = useI18n({
  en: {
    title: "Connect wallet",
    subtitle: "Choose how you want to trade on Tide.",
    createTitle: "Create a Paper wallet",
    createBody: "Tide creates and funds a custodial XRPL wallet with 2.22 XRP. Trade in Paper, then reveal your First Trade NFT reward.",
    createCta: "Create and fund",
    connectTitle: "Connect an existing wallet",
    connectBody: "Use Xaman or GemWallet. Your Paper trade unlocks the option to claim the First Trade NFT on this wallet.",
    connectCta: "Connect wallet",
    connected: "Wallet already connected",
    close: "Close",
    creating: "Creating wallet…",
    preparing: "Preparing your Paper session…",
    chooseAnother: "Disconnect first to choose another wallet",
  },
  fr: {
    title: "Connecter un wallet",
    subtitle: "Choisis comment tu veux trader sur Tide.",
    createTitle: "Créer un wallet Paper",
    createBody: "Tide crée et finance un wallet XRPL custodial avec 2,22 XRP. Trade en Paper, puis révèle ton NFT First Trade.",
    createCta: "Créer et financer",
    connectTitle: "Connecter un wallet existant",
    connectBody: "Utilise Xaman ou GemWallet. Ton trade Paper débloque ensuite le claim du NFT First Trade sur ce wallet.",
    connectCta: "Connecter le wallet",
    connected: "Wallet déjà connecté",
    close: "Fermer",
    creating: "Création du wallet…",
    preparing: "Préparation de ta session Paper…",
    chooseAnother: "Déconnecte d'abord le wallet pour en choisir un autre",
  },
});

function readableError(value: unknown): string {
  return value instanceof Error ? value.message : errorMessage(value);
}

async function createPaperWallet(): Promise<void> {
  if (connected.value || creating.value) return;
  creating.value = true;
  error.value = "";
  try {
    await paper.claimWallet();
    close();
    window.dispatchEvent(new Event(PAPER_WALLET_CHANGED_EVENT));
  } catch (cause) {
    error.value = readableError(cause);
  } finally {
    creating.value = false;
  }
}

async function connectExistingWallet(): Promise<void> {
  if (connected.value || creating.value || preparing.value) return;
  preparing.value = true;
  error.value = "";
  try {
    // Persiste l'identité Paper avant d'ouvrir Xaman/GemWallet. Le serveur
    // pourra ainsi rattacher le wallet connecté à ce parcours et empêcher
    // qu'un changement d'adresse réinitialise la récompense.
    await auth.ensurePaperSession();
   close();
   wallet.connect();
  } catch (cause) {
    error.value = readableError(cause);
  } finally {
    preparing.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="entry-overlay" @click.self="close">
    <section class="entry-modal" role="dialog" aria-modal="true" :aria-label="t('title')">
      <button type="button" class="entry-close" :aria-label="t('close')" @click="close">×</button>
      <p class="entry-eyebrow">TIDE WALLET</p>
      <h2>{{ t('title') }}</h2>
      <p class="entry-subtitle">{{ t('subtitle') }}</p>

      <div v-if="connected" class="entry-connected">
        <span class="entry-dot"></span>
        <div>
          <strong>{{ t('connected') }}</strong>
          <span>{{ session.liveAddress.value }}</span>
        </div>
      </div>

      <div v-else class="entry-options">
        <button type="button" class="entry-option paper-option" :disabled="creating || preparing" @click="createPaperWallet">
          <span class="option-icon">◌</span>
          <span class="option-copy">
            <strong>{{ t('createTitle') }}</strong>
            <span>{{ t('createBody') }}</span>
            <em>{{ creating ? t('creating') : t('createCta') }} <b>→</b></em>
          </span>
        </button>

        <button type="button" class="entry-option external-option" :disabled="creating || preparing" @click="connectExistingWallet">
          <span class="option-icon">◇</span>
          <span class="option-copy">
            <strong>{{ t('connectTitle') }}</strong>
            <span>{{ t('connectBody') }}</span>
            <em>{{ preparing ? t('preparing') : t('connectCta') }} <b>→</b></em>
          </span>
        </button>
      </div>

      <p v-if="connected" class="entry-note">{{ t('chooseAnother') }}</p>
      <p v-if="error" class="entry-error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.entry-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(7, 8, 13, 0.76);
  backdrop-filter: blur(13px);
}
.entry-modal {
  position: relative;
  width: min(620px, 100%);
  box-sizing: border-box;
  padding: 34px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 24px;
  background: #171820;
  color: #fff;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.48);
}
.entry-close {
  position: absolute;
  top: 14px;
  right: 17px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.66);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.entry-eyebrow {
  margin: 0 0 12px;
  color: #9db4ff;
  font: 800 10px/1 "JetBrains Mono", monospace;
  letter-spacing: 0.16em;
}
h2 {
  margin: 0;
  font: 800 34px/1.05 "Archivo", sans-serif;
}
.entry-subtitle {
  margin: 12px 0 25px;
  color: rgba(255, 255, 255, 0.64);
  line-height: 1.5;
}
.entry-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.entry-option {
  display: flex;
  min-height: 206px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 17px;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s, transform 0.16s, background 0.16s;
}
.entry-option:hover:not(:disabled) {
  border-color: rgba(191, 246, 206, 0.76);
  transform: translateY(-2px);
}
.entry-option:disabled {
  cursor: wait;
  opacity: 0.62;
}
.paper-option {
  background: linear-gradient(145deg, rgba(95, 124, 255, 0.24), rgba(37, 39, 54, 0.94));
}
.external-option {
  background: linear-gradient(145deg, rgba(43, 212, 192, 0.18), rgba(37, 39, 54, 0.94));
}
.option-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.13);
  color: #bff6ce;
  font-size: 25px;
}
.option-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}
.option-copy strong {
  font-size: 16px;
}
.option-copy span {
  color: rgba(255, 255, 255, 0.63);
  font-size: 12px;
  line-height: 1.48;
}
.option-copy em {
  margin-top: auto;
  color: #bff6ce;
  font: 800 11px/1 "JetBrains Mono", monospace;
  font-style: normal;
}
.option-copy b {
  margin-left: 4px;
  font-size: 15px;
}
.entry-connected {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px;
  border-radius: 15px;
  background: rgba(191, 246, 206, 0.1);
}
.entry-connected div {
  display: grid;
  gap: 5px;
}
.entry-connected strong {
  font-size: 14px;
}
.entry-connected span:not(.entry-dot) {
  overflow: hidden;
  max-width: 450px;
  color: rgba(255, 255, 255, 0.6);
  font: 12px "JetBrains Mono", monospace;
  text-overflow: ellipsis;
}
.entry-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #bff6ce;
  box-shadow: 0 0 0 5px rgba(191, 246, 206, 0.12);
}
.entry-note,
.entry-error {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.45;
}
.entry-note {
  color: rgba(255, 255, 255, 0.54);
}
.entry-error {
  color: #ffb9ac;
}
@media (max-width: 600px) {
  .entry-modal {
    padding: 28px 20px 22px;
  }
  .entry-options {
    grid-template-columns: 1fr;
  }
  .entry-option {
    min-height: 0;
  }
}
</style>
