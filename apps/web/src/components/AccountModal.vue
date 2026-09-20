<script setup lang="ts">
import { ref } from "vue";
import type { TideClient } from "@tide/client";
import { useAccountAuth } from "../composables/useAccountAuth";
import { useI18n } from "../i18n/useI18n";

const props = defineProps<{ client: TideClient }>();
const emit = defineEmits<{ loggedOut: [] }>();
const account = useAccountAuth(props.client);
const email = ref("");
const confirmingLogout = ref(false);
const { t } = useI18n({
  en: {
    title: "Your Tide account",
    titleLoggedOut: "Log in or create a wallet",
    createNote: "New to Tide? Your Paper account is created automatically, and you claim your XRPL wallet from the terminal.",
    subtitle: "Keep the same Paper portfolio and XRP wallet on every device.",
    email: "Email address",
    continueEmail: "Continue with email",
    continueGoogle: "Continue with Google",
    sent: "Check your inbox. The secure link will bring you back to Tide.",
    unavailable: "Email and social login are not configured yet.",
    connected: "Connected account",
    logout: "Log out",
    logoutWarning: "This anonymous Paper account only exists in this browser. If it is not linked to an email, you will not be able to recover it after logging out.",
    confirmLogout: "Log out anyway",
    cancel: "Cancel",
    close: "Close",
  },
  fr: {
    title: "Ton compte Tide",
    titleLoggedOut: "Se connecter ou créer un wallet",
    createNote: "Nouveau sur Tide ? Ton compte Paper est créé automatiquement, et tu réclames ton wallet XRPL depuis le terminal.",
    subtitle: "Retrouve le même portefeuille Paper et le même wallet XRP sur chaque appareil.",
    email: "Adresse email",
    continueEmail: "Continuer avec l’email",
    continueGoogle: "Continuer avec Google",
    sent: "Vérifie ta boîte mail. Le lien sécurisé te ramènera sur Tide.",
    unavailable: "La connexion email et sociale n’est pas encore configurée.",
    connected: "Compte connecté",
    logout: "Se déconnecter",
    logoutWarning: "Ce compte Paper anonyme existe uniquement dans ce navigateur. S’il n’est pas lié à un email, tu ne pourras plus le récupérer après la déconnexion.",
    confirmLogout: "Se déconnecter quand même",
    cancel: "Annuler",
    close: "Fermer",
  },
});

function submitEmail(): void {
  if (email.value.trim() !== "") void account.sendEmail(email.value);
}

function close(): void {
  confirmingLogout.value = false;
  account.close();
}

async function requestLogout(): Promise<void> {
  if (account.anonymousPaper.value && !confirmingLogout.value) {
    confirmingLogout.value = true;
    return;
  }
  await account.logout();
  confirmingLogout.value = false;
  emit("loggedOut");
}
</script>

<template>
  <div v-if="account.modalOpen.value" class="overlay" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true" :aria-label="t('title')">
      <button class="close" :aria-label="t('close')" @click="close">×</button>
      <p class="eyebrow">TIDE ID</p>
      <h2>{{ account.canLogout.value ? t("title") : t("titleLoggedOut") }}</h2>
      <p class="subtitle">{{ t("subtitle") }}</p>
      <p v-if="!account.canLogout.value" class="subtitle create-note">{{ t("createNote") }}</p>

      <template v-if="account.canLogout.value">
        <div class="identity">
          <span>{{ t("connected") }}</span>
          <strong>{{ account.label.value }}</strong>
        </div>
        <button
          v-if="!confirmingLogout"
          class="secondary"
          :disabled="account.loading.value"
          @click="requestLogout"
        >
          {{ t("logout") }}
        </button>
        <div v-else class="logout-confirmation">
          <p>{{ t("logoutWarning") }}</p>
          <div class="logout-actions">
            <button class="secondary" @click="confirmingLogout = false">{{ t("cancel") }}</button>
            <button class="danger" :disabled="account.loading.value" @click="requestLogout">
              {{ t("confirmLogout") }}
            </button>
          </div>
        </div>
      </template>

      <template v-if="!account.signedIn.value && account.configured">
        <div v-if="account.canLogout.value" class="or"><span>OR</span></div>
        <form @submit.prevent="submitEmail">
          <label for="tide-login-email">{{ t("email") }}</label>
          <input id="tide-login-email" v-model="email" type="email" autocomplete="email" required />
          <button class="primary" :disabled="account.loading.value" type="submit">
            {{ t("continueEmail") }}
          </button>
        </form>
        <div class="or"><span>OR</span></div>
        <button class="google-button" :disabled="account.loading.value" @click="account.loginGoogle">
          <b>G</b> {{ t("continueGoogle") }}
        </button>
        <p v-if="account.emailSent.value" class="success">{{ t("sent") }}</p>
      </template>

      <p v-else-if="!account.canLogout.value" class="notice">{{ t("unavailable") }}</p>
      <p v-if="account.error.value" class="error">{{ account.error.value }}</p>
    </section>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 20px; background: rgba(10,10,12,.72); backdrop-filter: blur(12px); }
.modal { position: relative; width: min(440px, 100%); border: 1px solid rgba(255,255,255,.18); border-radius: 22px; padding: 34px; background: #17171b; color: #fff; box-shadow: 0 28px 90px rgba(0,0,0,.45); }
.close { position: absolute; top: 14px; right: 16px; border: 0; background: transparent; color: #fff; font-size: 28px; cursor: pointer; }
.eyebrow { margin: 0 0 12px; font: 700 11px/1 "JetBrains Mono", monospace; letter-spacing: .16em; color: #9db4ff; }
h2 { margin: 0; font: 800 34px/1.05 "Archivo", sans-serif; }
.subtitle { margin: 12px 0 26px; color: rgba(255,255,255,.64); line-height: 1.5; }
form { display: grid; gap: 10px; }
label { font-size: 13px; color: rgba(255,255,255,.72); }
input { width: 100%; box-sizing: border-box; border: 1px solid rgba(255,255,255,.18); border-radius: 12px; padding: 14px 15px; background: #222228; color: #fff; font: inherit; outline: none; }
input:focus { border-color: #7f94ff; box-shadow: 0 0 0 3px rgba(79,106,255,.2); }
button.primary, .google-button, .secondary, .danger { width: 100%; border: 0; border-radius: 100px; padding: 14px 18px; font: 700 14px/1 "Archivo", sans-serif; cursor: pointer; }
.primary { margin-top: 4px; background: #fff; color: #161618; }
.google-button { background: #fff; color: #202124; border: 1px solid rgba(255,255,255,.18); }
.google-button b { margin-right: 8px; color: #4285f4; font-size: 17px; }
.secondary { background: rgba(255,255,255,.1); color: #fff; }
.danger { background: #ff725e; color: #1b0d0a; }
button:disabled { opacity: .5; cursor: wait; }
.or { display: flex; align-items: center; gap: 12px; margin: 17px 0; color: rgba(255,255,255,.35); font: 700 10px/1 "JetBrains Mono", monospace; }
.or::before, .or::after { content: ""; height: 1px; flex: 1; background: rgba(255,255,255,.12); }
.success { margin: 18px 0 0; color: #bff6ce; font-size: 13px; line-height: 1.45; }
.error { margin: 16px 0 0; color: #ffb9ac; font-size: 13px; }
.notice { padding: 14px; border-radius: 12px; background: rgba(255,255,255,.06); color: rgba(255,255,255,.7); }
.identity { display: grid; gap: 7px; margin: 22px 0; padding: 16px; border-radius: 14px; background: rgba(255,255,255,.07); }
.identity span { color: rgba(255,255,255,.55); font-size: 12px; }
.identity strong { overflow: hidden; text-overflow: ellipsis; }
.logout-confirmation { display: grid; gap: 14px; padding: 15px; border: 1px solid rgba(255,114,94,.35); border-radius: 14px; background: rgba(255,114,94,.08); }
.logout-confirmation p { margin: 0; color: #ffd3cb; font-size: 13px; line-height: 1.5; }
.logout-actions { display: grid; grid-template-columns: 1fr 1.35fr; gap: 8px; }
</style>
