<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { AdminCompetitionInput } from "@tide/client";
import { useAdmin } from "../composables/useAdmin";
import { createLocalAdminClient } from "../lib/admin-client";

const {
  token,
  overview,
  error,
  loading,
  walletJob,
  provisionResult,
  competitionPayout,
  load,
  runTestnetE2E,
  refreshWalletJob,
  provisionWallets,
  grantNft,
  reclaimOne,
  reclaimAll,
  createCompetition,
  closeCompetition,
  logout,
} = useAdmin(createLocalAdminClient());

const selectedBadge = ref<Record<string, string>>({});
const bulkConfirmation = ref("");
const provisionCount = ref(1);
const closeCompetitionId = ref("");
const competitionForm = ref({
  id: "",
  nameEn: "",
  nameFr: "",
  descriptionEn: "",
  descriptionFr: "",
  mode: "paper" as "paper" | "live",
  buyIn: 0.01,
  startsAt: "",
  endsAt: "",
});
const DELETE_CONFIRMATION = "DELETE ALL TESTNET WALLETS";
const BADGES = [
  { code: "first_trade", label: "First Trade" },
  { code: "ten_trades", label: "Ten Trades" },
  { code: "first_competition", label: "First Competition" },
] as const;
const paperWallets = computed(() =>
  overview.value?.wallets.filter((wallet) => wallet.kind === "paper") ?? [],
);
const fundedPaperWallets = computed(() =>
  paperWallets.value.filter((wallet) => wallet.status === "funded").length,
);
const reclaimedPaperWallets = computed(() =>
  paperWallets.value.filter((wallet) => wallet.status === "reclaimed").length,
);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const SEGMENT_LABEL: Record<string, string> = {
  operator: "À moi",
  frontend: "Via le front",
  agent: "Agent IA",
};

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

onMounted(() => {
  if (token.value !== "") {
    void load();
  }
  pollTimer = setInterval(() => {
    if (walletJob.value?.state === "running") void refreshWalletJob();
  }, 2_000);
});

onUnmounted(() => {
  if (pollTimer !== null) clearInterval(pollTimer);
});

function badgeFor(userId: string): string {
  return selectedBadge.value[userId] ?? "first_trade";
}

function confirmReclaim(userId: string, address: string | null): void {
  if (address === null) return;
  if (window.confirm(`Brûler les NFT, supprimer ${address} et envoyer le solde à l'issuer ?`)) {
    void reclaimOne(userId);
  }
}

function confirmReclaimAll(): void {
  if (bulkConfirmation.value !== DELETE_CONFIRMATION) return;
  if (window.confirm(`Action irréversible sur ${String(paperWallets.value.length)} wallets Testnet. Continuer ?`)) {
    void reclaimAll(bulkConfirmation.value);
  }
}

async function submitCompetition(): Promise<void> {
  const form = competitionForm.value;
  const input: AdminCompetitionInput = {
    id: form.id,
    nameEn: form.nameEn,
    nameFr: form.nameFr,
    descriptionEn: form.descriptionEn,
    descriptionFr: form.descriptionFr,
    mode: form.mode,
    buyIn: form.buyIn,
    startsAt: new Date(form.startsAt).getTime(),
    endsAt: new Date(form.endsAt).getTime(),
  };
  if (await createCompetition(input)) {
    closeCompetitionId.value = input.id;
    form.id = "";
  }
}
</script>

<template>
  <section class="admin">
    <header class="admin__head">
      <h1>Console admin</h1>
      <p class="admin__sub">Administration privée des wallets Testnet créés par les trades Paper de tidetrade.xyz.</p>
    </header>

    <form v-if="overview === null" class="admin__gate" @submit.prevent="load">
      <label for="admin-token">Token opérateur</label>
      <input id="admin-token" v-model="token" type="password" autocomplete="off" />
      <button type="submit" :disabled="loading">Entrer</button>
      <p v-if="error" class="admin__error">{{ error }}</p>
    </form>

    <template v-else>
      <div class="admin__bar">
        <button type="button" @click="load" :disabled="loading">Rafraîchir</button>
        <button type="button" @click="logout">Verrouiller</button>
        <span v-if="error" class="admin__error">{{ error }}</span>
      </div>

      <div class="admin__totals">
        <div class="card">
          <span class="card__label">Utilisateurs</span>
          <strong class="card__value">{{ overview.totals.users }}</strong>
          <ul class="segments">
            <li>À moi : {{ overview.totals.bySegment.operator }} ({{ pct(overview.totals.bySegment.operator, overview.totals.users) }})</li>
            <li>Via le front : {{ overview.totals.bySegment.frontend }} ({{ pct(overview.totals.bySegment.frontend, overview.totals.users) }})</li>
            <li>Agent IA : {{ overview.totals.bySegment.agent }} ({{ pct(overview.totals.bySegment.agent, overview.totals.users) }})</li>
          </ul>
        </div>

        <div class="card">
          <span class="card__label">Wallets Paper actifs</span>
          <strong class="card__value">{{ fundedPaperWallets }}</strong>
          <ul class="segments">
            <li>{{ paperWallets.length }} créés au total</li>
            <li>{{ reclaimedPaperWallets }} supprimés / récupérés</li>
          </ul>
        </div>

        <div class="card">
          <span class="card__label">Arène de simulation</span>
          <strong class="card__value">{{ overview.simulation.enabled ? `${overview.simulation.provisionedUsers} profils` : "Désactivée" }}</strong>
          <ul class="segments">
            <li v-if="overview.simulation.enabled">{{ overview.simulation.tradesPerTick }} trades / {{ Math.round(overview.simulation.tickIntervalMs / 1000) }} s</li>
            <li v-if="overview.simulation.enabled">{{ overview.simulation.executedTrades }} exécutés depuis le boot</li>
            <li v-if="overview.simulation.enabled">Exclue des utilisateurs, rangs et récompenses</li>
            <li v-if="overview.simulation.lastError" class="admin__error">{{ overview.simulation.lastError }}</li>
          </ul>
        </div>

        <div class="card">
          <span class="card__label">Parcours E2E Testnet</span>
          <strong class="card__value">{{ overview.testnetE2E.enabled ? overview.testnetE2E.state : "Désactivé" }}</strong>
          <ul class="segments">
            <li v-if="overview.testnetE2E.enabled">{{ overview.testnetE2E.completedUsers }} / {{ overview.testnetE2E.configuredUsers }} profils terminés</li>
            <li v-if="overview.testnetE2E.enabled">LLM · wallet faucet · ordre Paper · NFT</li>
            <li v-if="overview.testnetE2E.lastError" class="admin__error">{{ overview.testnetE2E.lastError }}</li>
          </ul>
          <button v-if="overview.testnetE2E.enabled" type="button" :disabled="loading || overview.testnetE2E.state === 'running'" @click="runTestnetE2E">
            Lancer le parcours Testnet
          </button>
        </div>
      </div>

      <h2>Utilisateurs</h2>
      <table class="admin__table">
        <thead>
          <tr><th>userId</th><th>Origine</th><th>Equity</th><th>PnL</th><th>Ordres</th><th>Positions</th><th>Rang</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in overview.users" :key="u.userId">
            <td>{{ u.userId }}</td>
            <td>{{ SEGMENT_LABEL[u.segment] }}</td>
            <td>{{ u.equity.toFixed(2) }}</td>
            <td>{{ u.pnl.toFixed(2) }}</td>
            <td>{{ u.orders }}</td>
            <td>{{ u.positions }}</td>
            <td>{{ u.rank }}</td>
          </tr>
        </tbody>
      </table>

      <section class="admin__competitions">
        <h2>Compétitions réelles</h2>
        <p>Aucun seed ni chiffre décoratif. Le ticket est un Payment XRP vérifié et le gagnant reçoit 100 % de la pool.</p>
        <form class="competition-form" @submit.prevent="submitCompetition">
          <label>ID<input v-model="competitionForm.id" required /></label>
          <label>Nom EN<input v-model="competitionForm.nameEn" required /></label>
          <label>Nom FR<input v-model="competitionForm.nameFr" required /></label>
          <label class="wide">Description EN<input v-model="competitionForm.descriptionEn" required /></label>
          <label class="wide">Description FR<input v-model="competitionForm.descriptionFr" required /></label>
          <label>Mode<select v-model="competitionForm.mode"><option value="paper">Paper</option><option value="live">Live</option></select></label>
          <label>Ticket XRP<input v-model.number="competitionForm.buyIn" type="number" min="0.000001" step="0.000001" required /></label>
          <label>Début<input v-model="competitionForm.startsAt" type="datetime-local" required /></label>
          <label>Fin<input v-model="competitionForm.endsAt" type="datetime-local" required /></label>
          <button type="submit" :disabled="loading">Créer la compétition</button>
        </form>
        <p class="admin__warning">Le mode Live n'affichera aucun classement tant que l'indexeur de PnL Live réel n'est pas configuré.</p>
        <div class="admin__bar">
          <input v-model="closeCompetitionId" placeholder="ID à clôturer" />
          <button type="button" :disabled="loading || closeCompetitionId === ''" @click="closeCompetition(closeCompetitionId)">Clôturer et préparer le payout</button>
        </div>
        <div v-if="competitionPayout" class="payout">
          <b>Pool : {{ competitionPayout.pot }} XRP</b>
          <span>Gagnant : {{ competitionPayout.winner?.walletAddress ?? "aucun" }}</span>
          <p v-if="competitionPayout.payoutTx">Transaction multisig préparée. Elle doit être signée par le quorum du prize pool avant soumission.</p>
          <pre v-if="competitionPayout.payoutTx">{{ JSON.stringify(competitionPayout.payoutTx, null, 2) }}</pre>
        </div>
      </section>

      <section class="admin__testnet">
        <h2>Création manuelle de wallets techniques</h2>
        <p>Les utilisateurs de tidetrade.xyz obtiennent automatiquement leur wallet au premier trade Paper. Ce contrôle crée seulement des wallets techniques supplémentaires pour les tests opérateur.</p>
        <p>Les seeds sont chiffrées dans la DB privée et chaque wallet reçoit 1,25 Test XRP. Ils ne comptent jamais comme utilisateurs humains.</p>
        <p v-if="walletJob?.enabled === false" class="admin__error">Runtime wallet Paper Testnet désactivé : configure les variables <code>TIDE_PAPER_WALLET_*</code>.</p>
        <div class="admin__bar">
          <label for="provision-count">Nombre</label>
          <input id="provision-count" v-model.number="provisionCount" type="number" min="1" max="10" step="1" />
          <button type="button" :disabled="loading || walletJob?.enabled !== true || !Number.isInteger(provisionCount) || provisionCount < 1 || provisionCount > 10" @click="provisionWallets(provisionCount)">
            Créer et financer
          </button>
        </div>
        <p v-if="provisionResult">{{ provisionResult.funded }} / {{ provisionResult.requested }} wallets financés sur {{ provisionResult.network }}.</p>
      </section>

      <div class="admin__danger">
        <h2>Récupération globale</h2>
        <p v-if="walletJob?.enabled === false" class="admin__error">Runtime wallet Paper Testnet désactivé.</p>
        <p>Brûle les NFT détenus, attend les 256 ledgers requis, supprime chaque compte avec <code>AccountDelete</code>, puis envoie le solde restant à l'issuer Testnet.</p>
        <label for="bulk-confirm">Saisir <code>{{ DELETE_CONFIRMATION }}</code></label>
        <div class="admin__bar">
          <input id="bulk-confirm" v-model="bulkConfirmation" autocomplete="off" />
          <button type="button" class="danger" :disabled="loading || walletJob?.enabled !== true || bulkConfirmation !== DELETE_CONFIRMATION || walletJob?.state === 'running'" @click="confirmReclaimAll">
            Récupérer tous les fonds
          </button>
        </div>
      </div>

      <section v-if="walletJob !== null && walletJob.state !== 'idle'" class="admin__job">
        <h2>Récupération {{ walletJob.state }}</h2>
        <p>{{ walletJob.completed }} / {{ walletJob.total }} terminés · {{ walletJob.failed }} échecs · destination {{ walletJob.destination }}</p>
        <ul class="segments">
          <li v-for="result in walletJob.results" :key="result.userId">
            {{ result.address }} — {{ result.state }}<span v-if="result.recoveredXrpEstimate > 0"> · {{ result.recoveredXrpEstimate.toFixed(6) }} XRP récupérés</span><span v-if="result.error" class="admin__error"> · {{ result.error }}</span>
          </li>
        </ul>
      </section>

      <h2>Wallets Paper Testnet</h2>
      <table class="admin__table">
        <thead>
          <tr><th>Adresse</th><th>Utilisateur</th><th>Réseau</th><th>Statut</th><th>NFT individuel</th><th>Récupération</th></tr>
        </thead>
        <tbody>
          <tr v-for="(w, i) in paperWallets" :key="i">
            <td>{{ w.address ?? "—" }}</td>
            <td>{{ w.userId ?? "—" }}</td>
            <td>Testnet</td>
            <td>{{ w.status ?? "—" }}</td>
            <td>
              <select :value="badgeFor(w.userId ?? '')" :disabled="w.status !== 'funded' || loading" @change="selectedBadge[w.userId ?? ''] = ($event.target as HTMLSelectElement).value">
                <option v-for="badge in BADGES" :key="badge.code" :value="badge.code">{{ badge.label }}</option>
              </select>
              <button type="button" :disabled="walletJob?.enabled !== true || w.status !== 'funded' || loading || w.userId === null" @click="w.userId !== null && grantNft(w.userId, badgeFor(w.userId))">Envoyer</button>
            </td>
            <td><button type="button" class="danger" :disabled="walletJob?.enabled !== true || w.status !== 'funded' || loading || walletJob?.state === 'running' || w.userId === null" @click="w.userId !== null && confirmReclaim(w.userId, w.address)">Supprimer + sweep</button></td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>

<style scoped>
.admin { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
.admin__head h1 { margin: 0; }
.admin__sub { opacity: 0.7; margin: 0.25rem 0 1.5rem; }
.admin__gate { display: grid; gap: 0.5rem; max-width: 360px; }
.admin__bar { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1.5rem; }
.admin__error { color: #c0392b; }
.admin__totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.card { border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 8px; padding: 1rem; }
.card__label { text-transform: uppercase; font-size: 0.7rem; opacity: 0.7; }
.card__value { display: block; font-size: 1.8rem; margin: 0.25rem 0; }
.segments { list-style: none; padding: 0; margin: 0.5rem 0 0; font-size: 0.85rem; opacity: 0.85; }
.admin__table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.9rem; }
.admin__table th,
.admin__table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid rgba(128, 128, 128, 0.2); }
.admin__danger { border: 1px solid #c0392b; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
.admin__danger h2, .admin__job h2 { margin-top: 0; }
.admin__danger input { min-width: 300px; }
.admin__job { border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
.admin__competitions { border: 1px solid rgba(79, 106, 255, .55); border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
.admin__testnet { border: 1px solid rgba(44, 160, 90, .65); border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
.admin__testnet h2 { margin-top: 0; }
.competition-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; margin:1rem 0; }
.competition-form label { display:flex; flex-direction:column; gap:.3rem; font-size:.8rem; }
.competition-form .wide,.competition-form button { grid-column:1/-1; }
.competition-form input,.competition-form select { padding:.55rem; }
.admin__warning { color:#c98800; }.payout { display:flex; flex-direction:column; gap:.4rem; }.payout pre { overflow:auto; max-height:260px; }
button.danger { color: #fff; background: #a93226; }
select { margin-right: 0.4rem; }
</style>
