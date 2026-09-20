<script setup lang="ts">
import { reactive, ref } from "vue";
import type { MandateDto, TideClient } from "@tide/client";
import { MAX_PAPER_LEVERAGE } from "@tide/core";
import { useMandate, type MandateForm } from "../../composables/useMandate";
import { useI18n } from "../../i18n/useI18n";

/* Formulaire de création d'un mandat pour un agent. Délègue à `useMandate`
 * (composable) ; la signature Xaman = hors scope, gérée par `useWallet` (cf.
 * T25). */

const props = defineProps<{ client: TideClient; agentId: string }>();
const emit = defineEmits<{ created: [mandate: MandateDto] }>();

const { t } = useI18n({
  en: {
    title: "Mandate",
    capitalMax: "Max capital",
    perteMaxJour: "Max daily loss",
    maxTrades: "Max trades / day",
    maxLeverage: "Max leverage",
    paires: "Allowed pairs",
    style: "Style",
    styleNone: "(none)",
    styleMomentum: "Momentum",
    styleMeanReversion: "Mean reversion",
    styleDca: "DCA",
    styleGrid: "Grid",
    styleMixed: "Mixed",
    validity: "Validity (days)",
    create: "Create mandate",
    errorRequired: "Please fill every field",
  },
  fr: {
    title: "Mandat",
    capitalMax: "Capital max",
    perteMaxJour: "Perte max / jour",
    maxTrades: "Trades max / jour",
    maxLeverage: "Levier max",
    paires: "Paires autorisées",
    style: "Style",
    styleNone: "(aucun)",
    styleMomentum: "Momentum",
    styleMeanReversion: "Mean reversion",
    styleDca: "DCA",
    styleGrid: "Grid",
    styleMixed: "Mixte",
    validity: "Validité (jours)",
    create: "Créer le mandat",
    errorRequired: "Merci de remplir tous les champs",
  },
});

const { create, signing, signError } = useMandate(props.client);

const form = reactive<MandateForm>({
  capitalMax: 1000,
  perteMaxJour: 100,
  maxTradesPerDay: 20,
  maxLeverage: 3,
  pairesAutorisees: ["XRP/RLUSD"],
  style: "momentum",
  validDays: 7,
});

const pairsText = ref("XRP/RLUSD");

function syncPairs(): void {
  // Le backend attend des SYMBOLES DE BASE (`XRP`, `BTC` — le guard vérifie
  // `pairesAutorisees.includes(base)`, quote toujours RLUSD). L'utilisateur
  // saisit une notation de paire (`XRP/RLUSD`) → on extrait la base (avant `/`)
  // et on normalise en majuscules.
  form.pairesAutorisees = pairsText.value
    .split(",")
    .map((s) => (s.split("/")[0] ?? "").trim().toUpperCase())
    .filter((s) => s.length > 0);
}

const submitError = ref<string | null>(null);

async function submit(): Promise<void> {
  submitError.value = null;
  syncPairs();
  if (form.pairesAutorisees.length === 0) {
    submitError.value = t("errorRequired");
    return;
  }
  try {
    const mandate = await create(props.agentId, form);
    emit("created", mandate);
  } catch {
    // signError est déjà alimenté par useMandate
  }
}
</script>

<template>
  <form class="mform" @submit.prevent="submit">
    <h3 class="mttl">{{ t('title') }}</h3>
    <label>
      <span>{{ t('capitalMax') }}</span>
      <input v-model.number="form.capitalMax" type="number" min="0" required />
    </label>
    <label>
      <span>{{ t('perteMaxJour') }}</span>
      <input v-model.number="form.perteMaxJour" type="number" min="0" required />
    </label>
    <label>
      <span>{{ t('maxTrades') }}</span>
      <input v-model.number="form.maxTradesPerDay" type="number" min="1" required />
    </label>
    <label>
      <span>{{ t('maxLeverage') }}</span>
      <input v-model.number="form.maxLeverage" type="number" min="1" :max="MAX_PAPER_LEVERAGE" required />
    </label>
    <label>
      <span>{{ t('paires') }}</span>
      <input v-model="pairsText" type="text" placeholder="XRP/RLUSD, BTC/USDT" @blur="syncPairs" />
    </label>
    <label>
      <span>{{ t('style') }}</span>
      <select v-model="form.style">
        <option :value="null">{{ t('styleNone') }}</option>
        <option value="momentum">{{ t('styleMomentum') }}</option>
        <option value="mean_reversion">{{ t('styleMeanReversion') }}</option>
        <option value="dca">{{ t('styleDca') }}</option>
        <option value="grid">{{ t('styleGrid') }}</option>
        <option value="mixed">{{ t('styleMixed') }}</option>
      </select>
    </label>
    <label>
      <span>{{ t('validity') }}</span>
      <input v-model.number="form.validDays" type="number" min="1" max="365" required />
    </label>
    <button type="submit" :disabled="signing">
      {{ signing ? "…" : t('create') }}
    </button>
    <p v-if="signError || submitError" class="err">{{ signError ?? submitError }}</p>
  </form>
</template>

<style scoped>
.mform {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: var(--panel, #1d1d24);
  border: 1px solid var(--line2, #2a2a32);
  border-radius: 14px;
  color: #fff;
  max-width: 380px;
}
.mttl {
  margin: 0 0 6px;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soft, rgba(255, 255, 255, 0.7));
}
.mform label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  color: var(--soft, rgba(255, 255, 255, 0.7));
}
.mform input,
.mform select {
  background: var(--panel2, #16161b);
  border: 1px solid var(--line, #2a2a32);
  border-radius: 8px;
  padding: 9px 11px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
}
.mform input:focus,
.mform select:focus {
  outline: 1px solid var(--blue, #4f6aff);
  border-color: var(--blue, #4f6aff);
}
.mform button[type="submit"] {
  margin-top: 8px;
  padding: 11px 14px;
  border-radius: 100px;
  border: none;
  background: var(--blue, #4f6aff);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.mform button[type="submit"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.err {
  color: var(--down, #ffb9ac);
  font-size: 12.5px;
  margin: 0;
}
</style>
