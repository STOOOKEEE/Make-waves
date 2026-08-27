<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { AdminCompetitionInput, AdminWalletDto } from "@tide/client";
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
  lastNftGrant,
  lastBatchNftGrant,
  lastInactiveDelete,
  load,
  refreshWalletJob,
  createUserWallets,
  fundUserWallets,
  deleteInactiveUsers,
  grantNft,
  grantNftBatch,
  reclaimOne,
  reclaimAll,
  createCompetition,
  closeCompetition,
  logout,
} = useAdmin(createLocalAdminClient());

const selectedUserIds = ref<string[]>([]);
const bulkSetupRunning = ref(false);
const bulkSetupStep = ref<"idle" | "creating" | "funding" | "nft">("idle");
const bulkConfirmation = ref("");
const batchBadgeCode = ref("first_trade");
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
const BADGES = [
  { code: "first_trade", label: "First Trade" },
  { code: "ten_trades", label: "Ten Trades" },
  { code: "first_competition", label: "First Competition" },
] as const;
const PAPER_WALLET_FUNDING_XRP = 2.22;
const paperWallets = computed<AdminWalletDto[]>(() => {
  if (overview.value === null) return [];
  const stored = overview.value.wallets.filter((wallet) => wallet.kind === "paper");
  const byUser = new Map(stored.flatMap((wallet) => wallet.userId === null ? [] : [[wallet.userId, wallet]]));
  const userIds = new Set(overview.value.users.map((user) => user.userId));
  const userRows = overview.value.users.map((user): AdminWalletDto => byUser.get(user.userId) ?? {
    address: null,
    kind: "paper",
    agentId: null,
    userId: user.userId,
    live: false,
    status: "not_created",
    network: "mainnet",
    fundingTxHash: null,
    fundedAt: null,
    createdAt: null,
  });
  return [...userRows, ...stored.filter((wallet) => wallet.userId === null || !userIds.has(wallet.userId))];
});
const createdPaperWallets = computed(() =>
  paperWallets.value.filter((wallet) => wallet.status !== "not_created"),
);
const fundedPaperWallets = computed(() =>
  paperWallets.value.filter((wallet) => wallet.status === "funded").length,
);
/** Les comptes opérateur restent une voie frontend dans le total produit. */
const frontendActiveUsers = computed(() => {
  const totals = overview.value?.totals.bySegment;
  return (totals?.frontend ?? 0) + (totals?.operator ?? 0);
});
const usersById = computed(() => new Map(overview.value?.users.map((user) => [user.userId, user]) ?? []));
const managedRows = computed(() => paperWallets.value.map((wallet) => ({
  wallet,
  user: wallet.userId === null ? undefined : usersById.value.get(wallet.userId),
})));
const selectedRows = computed(() => {
  const selected = new Set(selectedUserIds.value);
  return managedRows.value.filter(({ wallet }) => wallet.userId !== null && selected.has(wallet.userId));
});
const selectedMissingIds = computed(() => selectedRows.value
  .filter(({ wallet }) => wallet.status === "not_created")
  .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]));
const selectedFundableIds = computed(() => selectedRows.value
  .filter(({ wallet, user }) =>
    (wallet.status === "not_created" || wallet.status === "pending_funding") &&
    user !== undefined &&
    (user.orders > 0 || user.positions > 0),
  )
  .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]));
const selectedFundedIds = computed(() => selectedRows.value
  .filter(({ wallet }) => wallet.status === "funded")
  .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]));
const selectedSetupRows = computed(() => selectedRows.value.filter(({ wallet, user }) =>
  user !== undefined &&
  (user.orders > 0 || user.positions > 0) &&
  (wallet.status === "not_created" ||
    wallet.status === "pending_funding" ||
    wallet.status === "funded"),
));
const selectedSetupIds = computed(() => selectedSetupRows.value
  .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]));
const selectedSetupMissingIds = computed(() => selectedSetupRows.value
  .filter(({ wallet }) => wallet.status === "not_created")
  .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]));
const selectedSetupFundIds = computed(() => selectedSetupRows.value
  .filter(({ wallet }) => wallet.status === "not_created" || wallet.status === "pending_funding")
  .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]));
const inactiveUserIds = computed(() => managedRows.value
  .filter(({ wallet, user }) =>
    user !== undefined &&
    user.segment === "frontend" &&
    user.orders === 0 &&
    user.positions === 0 &&
    Math.abs(user.pnl) < 1e-9 &&
    (wallet.status === "not_created" || wallet.status === "pending_funding"),
  )
  .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]));
const selectedInactiveIds = computed(() => {
  const eligible = new Set(inactiveUserIds.value);
  return selectedUserIds.value.filter((userId) => eligible.has(userId));
});
const allRowsSelected = computed(() =>
  managedRows.value.length > 0 &&
  managedRows.value.every(({ wallet }) => wallet.userId !== null && selectedUserIds.value.includes(wallet.userId)),
);
const someRowsSelected = computed(() => selectedUserIds.value.length > 0 && !allRowsSelected.value);
const bulkSetupLabel = computed(() => {
  if (bulkSetupStep.value === "creating") return "Création des wallets…";
  if (bulkSetupStep.value === "funding") return "Funding Mainnet…";
  if (bulkSetupStep.value === "nft") return "Envoi des NFT…";
  return `Créer + financer + NFT pour ${String(selectedSetupIds.value.length)}`;
});
const walletNetwork = computed<"mainnet">(() => "mainnet");
const deleteConfirmation = computed(
  () => `DELETE ALL ${walletNetwork.value.toUpperCase()} WALLETS`,
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

function selectAllRows(): void {
  selectedUserIds.value = managedRows.value
    .flatMap(({ wallet }) => wallet.userId === null ? [] : [wallet.userId]);
}

function clearSelectedRows(): void {
  selectedUserIds.value = [];
}

function updateAllRows(event: Event): void {
  const checkbox = event.target;
  if (!(checkbox instanceof HTMLInputElement)) return;
  if (checkbox.checked) selectAllRows();
  else clearSelectedRows();
}

function selectFundedRows(): void {
  selectedUserIds.value = paperWallets.value
    .filter((wallet) => wallet.status === "funded")
    .flatMap((wallet) => wallet.userId === null ? [] : [wallet.userId]);
}

function selectInactiveRows(): void {
  selectedUserIds.value = [...inactiveUserIds.value];
}

function statusLabel(status: AdminWalletDto["status"]): string {
  const labels: Record<Exclude<AdminWalletDto["status"], null>, string> = {
    not_created: "Non créé",
    pending_funding: "Créé · non financé",
    funding_in_progress: "Funding en cours",
    funded: "Financé · 2,22 XRP",
    funding_failed: "Funding à vérifier",
    reclaimed: "Supprimé · récupéré",
    deleted: "Fermé · solde renvoyé",
  };
  return status === null ? "—" : labels[status];
}

function statusClass(status: AdminWalletDto["status"]): string {
  if (status === "funded") return "status status--funded";
  if (status === "funding_failed") return "status status--failed";
  if (status === "funding_in_progress") return "status status--pending";
  if (status === "reclaimed") return "status status--reclaimed";
  if (status === "deleted") return "status status--reclaimed";
  return "status";
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function explorerTx(hash: string): string {
  return `https://xrpscan.com/tx/${encodeURIComponent(hash)}`;
}

/**
 * Une adresse XRPL utilisée directement comme userId vient d'un wallet
 * personnel connecté au front. Ce wallet est non-custodial : Tide ne doit ni
 * le financer, ni tenter de signer à sa place.
 */
function connectedWalletAddress(userId: string | null): string | null {
  if (userId === null) return null;
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(userId) ? userId : null;
}

function explorerAccount(address: string): string {
  return `https://xrpscan.com/account/${encodeURIComponent(address)}`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);
}

async function createSelectedWallets(): Promise<void> {
  if (selectedMissingIds.value.length === 0) return;
  await createUserWallets(selectedMissingIds.value);
}

async function fundSelectedWallets(): Promise<void> {
  const ids = selectedFundableIds.value;
  if (ids.length === 0) return;
  const amount = ids.length * PAPER_WALLET_FUNDING_XRP;
  if (!window.confirm(`Financer ${String(ids.length)} wallets Mainnet pour ${amount.toFixed(2)} XRP maximum ?`)) return;
  await fundUserWallets(ids, `FUND ${String(ids.length)} MAINNET WALLETS`);
}

async function sendSelectedNfts(): Promise<void> {
  const ids = selectedFundedIds.value;
  if (ids.length === 0) return;
  if (!window.confirm(`Mint + envoyer ${String(ids.length)} NFT ${batchBadgeCode.value} ?`)) return;
  await grantNftBatch(ids, batchBadgeCode.value);
}

async function setupSelectedWallets(): Promise<void> {
  const userIds = [...selectedSetupIds.value];
  const missingIds = [...selectedSetupMissingIds.value];
  const fundIds = [...selectedSetupFundIds.value];
  const badgeCode = batchBadgeCode.value;
  if (userIds.length === 0) return;
  const maximumXrp = fundIds.length * PAPER_WALLET_FUNDING_XRP;
  const confirmed = window.confirm(
    `Traiter ${String(userIds.length)} utilisateur(s) sélectionné(s) sur Mainnet ?\n\n` +
    `• Créer ${String(missingIds.length)} wallet(s) manquant(s)\n` +
    `• Financer ${String(fundIds.length)} wallet(s), maximum ${maximumXrp.toFixed(2)} XRP\n` +
    `• Mint + envoyer le NFT ${badgeCode} aux ${String(userIds.length)} wallet(s)`,
  );
  if (!confirmed) return;

  bulkSetupRunning.value = true;
  try {
    if (missingIds.length > 0) {
      bulkSetupStep.value = "creating";
      await createUserWallets(missingIds);
      if (error.value !== "") return;
    }
    if (fundIds.length > 0) {
      bulkSetupStep.value = "funding";
      await fundUserWallets(fundIds, `FUND ${String(fundIds.length)} MAINNET WALLETS`);
      if (error.value !== "") return;
    }
    bulkSetupStep.value = "nft";
    await grantNftBatch(userIds, badgeCode);
  } finally {
    bulkSetupRunning.value = false;
    bulkSetupStep.value = "idle";
  }
}

async function deleteInactive(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!window.confirm(`Supprimer définitivement ${String(ids.length)} compte(s) Paper vierge(s) ? Aucun wallet Mainnet actif ne sera touché.`)) return;
  await deleteInactiveUsers(ids, `DELETE ${String(ids.length)} INACTIVE PAPER ACCOUNTS`);
  const deleted = new Set(ids);
  selectedUserIds.value = selectedUserIds.value.filter((userId) => !deleted.has(userId));
}

function confirmReclaim(userId: string, address: string | null): void {
  if (address === null) return;
  if (window.confirm(`Brûler les NFT, supprimer ${address} et envoyer le solde restant à l'adresse froide de récupération ?`)) {
    void reclaimOne(userId);
  }
}

function confirmReclaimAll(): void {
  if (bulkConfirmation.value !== deleteConfirmation.value) return;
  if (window.confirm(`Action irréversible sur ${String(paperWallets.value.length)} wallets ${walletNetwork.value}. Continuer ?`)) {
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
      <p class="admin__sub">Administration privée des wallets {{ walletNetwork }} créés par les trades Paper de tidetrade.xyz.</p>
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
          <span class="card__label">Users actifs</span>
          <strong class="card__value">{{ overview.totals.users }}</strong>
          <ul class="segments">
            <li>Via le frontend : {{ frontendActiveUsers }} ({{ pct(frontendActiveUsers, overview.totals.users) }})</li>
            <li>Agents IA : {{ overview.totals.bySegment.agent }} ({{ pct(overview.totals.bySegment.agent, overview.totals.users) }})</li>
          </ul>
        </div>

        <div class="card">
          <span class="card__label">Wallets Paper actifs</span>
          <strong class="card__value">{{ fundedPaperWallets }}</strong>
          <ul class="segments">
            <li>{{ createdPaperWallets.length }} créés · {{ paperWallets.length - createdPaperWallets.length }} manquants</li>
            <li>{{ reclaimedPaperWallets }} supprimés / récupérés</li>
          </ul>
        </div>

        <div class="card">
          <span class="card__label">Wallets financés avec NFT</span>
          <strong class="card__value">{{ overview.totals.fundedWalletsWithNft ?? "—" }}</strong>
          <ul class="segments">
            <li v-if="overview.totals.fundedWalletsWithNft !== null">Détiennent actuellement au moins 1 NFT</li>
            <li v-else class="admin__warning">Lecture XRPL Mainnet indisponible</li>
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

      </div>

      <section class="wallet-manager">
        <div class="wallet-manager__head">
          <div>
            <h2>Participants & wallets Mainnet</h2>
            <p>Chaque ligne distingue le wallet personnel connecté au front du wallet Paper custodial créé et financé par Tide.</p>
          </div>
          <strong>{{ selectedUserIds.length }} sélectionné(s)</strong>
        </div>

        <div class="wallet-manager__toolbar">
          <button type="button" :disabled="loading || allRowsSelected" @click="selectAllRows">Tout sélectionner</button>
          <button type="button" :disabled="loading || selectedUserIds.length === 0" @click="clearSelectedRows">Tout désélectionner</button>
          <button type="button" :disabled="loading || fundedPaperWallets === 0" @click="selectFundedRows">Sélectionner les financés</button>
          <button type="button" :disabled="loading || inactiveUserIds.length === 0" @click="selectInactiveRows">Sélectionner les inactifs</button>
        </div>

        <div class="wallet-manager__toolbar wallet-manager__toolbar--setup">
          <select v-model="batchBadgeCode" :disabled="loading || bulkSetupRunning" aria-label="NFT du parcours complet">
            <option v-for="badge in BADGES" :key="badge.code" :value="badge.code">{{ badge.label }}</option>
          </select>
          <button type="button" class="setup" :disabled="loading || bulkSetupRunning || walletJob?.enabled !== true || selectedSetupIds.length === 0" @click="setupSelectedWallets">
            {{ bulkSetupLabel }}
          </button>
          <span class="hint">Une confirmation, puis création → funding → NFT uniquement pour les lignes cochées.</span>
        </div>

        <div class="wallet-manager__toolbar wallet-manager__toolbar--advanced">
          <span class="hint">Actions séparées :</span>
          <button type="button" :disabled="loading || walletJob?.enabled !== true || selectedMissingIds.length === 0" @click="createSelectedWallets">
            Créer {{ selectedMissingIds.length }} wallet(s) manquant(s)
          </button>
          <button type="button" class="fund" :disabled="loading || walletJob?.enabled !== true || selectedFundableIds.length === 0" @click="fundSelectedWallets">
            Financer {{ selectedFundableIds.length }} éligible(s) · {{ (selectedFundableIds.length * PAPER_WALLET_FUNDING_XRP).toFixed(2) }} XRP
          </button>
          <button type="button" class="danger" :disabled="loading || selectedInactiveIds.length === 0" @click="deleteInactive(selectedInactiveIds)">
            Supprimer {{ selectedInactiveIds.length }} inactif(s)
          </button>
        </div>

        <div class="wallet-manager__toolbar wallet-manager__toolbar--nft">
          <button type="button" class="nft" :disabled="loading || walletJob?.enabled !== true || selectedFundedIds.length === 0" @click="sendSelectedNfts">
            Mint + envoyer à {{ selectedFundedIds.length }} wallet(s) financé(s)
          </button>
          <span v-if="selectedUserIds.length > selectedFundedIds.length" class="hint">Les wallets non financés sont ignorés pour l’envoi.</span>
        </div>

        <div class="table-scroll">
          <table class="admin__table wallet-table">
            <thead>
              <tr>
                <th><input type="checkbox" :checked="allRowsSelected" :indeterminate="someRowsSelected" aria-label="Sélectionner tous les wallets" @change="updateAllRows" /></th>
                <th>Utilisateur</th><th>Activité</th><th>Wallet connecté</th><th>Wallet Tide</th><th>Funding Tide</th><th>Transaction</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in managedRows" :key="row.wallet.userId ?? row.wallet.address ?? ''" :class="{ 'row--selected': row.wallet.userId !== null && selectedUserIds.includes(row.wallet.userId) }">
                <td><input v-if="row.wallet.userId !== null" v-model="selectedUserIds" type="checkbox" :value="row.wallet.userId" :aria-label="`Sélectionner ${row.wallet.userId}`" /></td>
                <td>
                  <strong class="user-id">{{ row.wallet.userId ?? "—" }}</strong>
                  <small>{{ row.user ? SEGMENT_LABEL[row.user.segment] : "Technique" }}</small>
                </td>
                <td>
                  <span v-if="row.user">{{ row.user.orders }} ordre(s) · {{ row.user.positions }} position(s)</span>
                  <span v-else>—</span>
                </td>
                <td>
                  <a
                    v-if="connectedWalletAddress(row.wallet.userId)"
                    :href="explorerAccount(connectedWalletAddress(row.wallet.userId) ?? '')"
                    class="wallet-address"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ connectedWalletAddress(row.wallet.userId) }}</a>
                  <span v-else class="muted">Identité Paper</span>
                </td>
                <td>
                  <code v-if="row.wallet.address" class="wallet-address">{{ row.wallet.address }}</code>
                  <span v-else class="muted">Pas encore créé</span>
                </td>
                <td>
                  <span :class="statusClass(row.wallet.status)">{{ statusLabel(row.wallet.status) }}</span>
                  <small v-if="row.wallet.fundedAt">{{ formatDate(row.wallet.fundedAt) }}</small>
                </td>
                <td>
                  <a v-if="row.wallet.fundingTxHash" :href="explorerTx(row.wallet.fundingTxHash)" target="_blank" rel="noopener noreferrer">{{ shortHash(row.wallet.fundingTxHash) }}</a>
                  <span v-else>—</span>
                </td>
                <td class="row-actions">
                  <button type="button" :disabled="loading || walletJob?.enabled !== true || row.wallet.status !== 'funded' || row.wallet.userId === null" @click="row.wallet.userId !== null && grantNft(row.wallet.userId, batchBadgeCode)">NFT</button>
                  <button type="button" class="danger" :disabled="walletJob?.enabled !== true || row.wallet.status !== 'funded' || loading || walletJob?.state === 'running' || row.wallet.userId === null" @click="row.wallet.userId !== null && confirmReclaim(row.wallet.userId, row.wallet.address)">Récupérer</button>
                  <button type="button" class="danger" :disabled="loading || row.wallet.userId === null || !inactiveUserIds.includes(row.wallet.userId)" @click="row.wallet.userId !== null && deleteInactive([row.wallet.userId])">Supprimer</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="provisionResult" class="result">Dernière opération : {{ provisionResult.requested }} wallet(s) traité(s), dont {{ provisionResult.funded }} financé(s).</p>
        <p v-if="lastNftGrant" class="result">NFT {{ lastNftGrant.badgeCode }} envoyé à {{ lastNftGrant.walletAddress }} · tx {{ lastNftGrant.claimHash }}</p>
        <div v-if="lastBatchNftGrant" class="batch-result">
          <strong>{{ lastBatchNftGrant.succeeded }} NFT envoyé(s) · {{ lastBatchNftGrant.failed }} échec(s)</strong>
          <ul v-if="lastBatchNftGrant.failed > 0" class="segments">
            <li v-for="result in lastBatchNftGrant.results.filter((item) => item.status === 'failed')" :key="result.userId" class="admin__error">{{ result.userId }} · {{ result.status === "failed" ? result.error : "" }}</li>
          </ul>
        </div>
        <p v-if="lastInactiveDelete" class="result">{{ lastInactiveDelete.deleted }} compte(s) Paper inactif(s) supprimé(s), dont {{ lastInactiveDelete.walletRowsDeleted }} adresse(s) locale(s) non financée(s).</p>
      </section>

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

      <div class="admin__danger">
        <h2>Récupération globale</h2>
        <p v-if="walletJob?.enabled === false" class="admin__error">Runtime wallet Paper désactivé.</p>
        <p>Brûle les NFT détenus, attend les 256 ledgers requis, supprime chaque compte avec <code>AccountDelete</code>, puis envoie le solde restant à l’adresse de récupération {{ walletNetwork }}.</p>
        <label for="bulk-confirm">Saisir <code>{{ deleteConfirmation }}</code></label>
        <div class="admin__bar">
          <input id="bulk-confirm" v-model="bulkConfirmation" autocomplete="off" />
          <button type="button" class="danger" :disabled="loading || walletJob?.enabled !== true || bulkConfirmation !== deleteConfirmation || walletJob?.state === 'running'" @click="confirmReclaimAll">
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

    </template>
  </section>
</template>

<style scoped>
.admin { max-width: 1500px; margin: 0 auto; padding: 2rem 1rem; }
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
.wallet-manager { border: 1px solid rgba(137, 91, 255, .7); border-radius: 12px; padding: 1.1rem; margin: 1.5rem 0; background: rgba(15, 18, 30, .12); }
.wallet-manager__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.wallet-manager__head h2 { margin: 0; }
.wallet-manager__head p { margin: .35rem 0 1rem; opacity: .75; }
.wallet-manager__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-bottom: .75rem; }
.wallet-manager__toolbar button, .wallet-manager__toolbar select, .row-actions button { min-height: 34px; border-radius: 7px; padding: .42rem .7rem; border: 1px solid rgba(128,128,128,.35); }
.wallet-manager__toolbar button:disabled, .row-actions button:disabled { opacity: .45; }
.wallet-manager__toolbar--setup { padding: .75rem; border: 1px solid rgba(35, 184, 103, .42); border-radius: 9px; background: rgba(35, 184, 103, .10); }
.wallet-manager__toolbar--setup button.setup { background: #116b42; color: #fff; font-weight: 700; }
.wallet-manager__toolbar--advanced { padding-top: .1rem; }
.wallet-manager__toolbar--nft { padding: .7rem; border-radius: 8px; background: rgba(137, 91, 255, .12); }
.wallet-manager button.fund { background: #207a4a; color: #fff; }
.wallet-manager button.nft { background: #6941c6; color: #fff; }
.hint, .muted { opacity: .65; font-size: .82rem; }
.table-scroll { overflow-x: auto; }
.wallet-table { min-width: 1180px; margin-bottom: .5rem; }
.wallet-table th:first-child, .wallet-table td:first-child { width: 34px; text-align: center; }
.wallet-table tbody tr.row--selected { background: rgba(137, 91, 255, .10); }
.user-id { display: block; max-width: 310px; overflow-wrap: anywhere; }
.wallet-table small { display: block; opacity: .65; margin-top: .2rem; }
.wallet-address { white-space: nowrap; font-size: .78rem; }
.status { display: inline-flex; white-space: nowrap; padding: .2rem .45rem; border-radius: 999px; background: rgba(128,128,128,.18); font-size: .75rem; }
.status--funded { color: #0d7a43; background: rgba(35, 184, 103, .16); }
.status--pending { color: #9b6500; background: rgba(236, 174, 45, .18); }
.status--failed { color: #b42318; background: rgba(220, 53, 69, .15); }
.status--reclaimed { opacity: .6; }
.row-actions { white-space: nowrap; }
.row-actions button + button { margin-left: .35rem; }
.result, .batch-result { margin: .75rem 0 0; padding: .65rem; border-radius: 8px; background: rgba(35, 184, 103, .10); overflow-wrap: anywhere; }
.admin__danger { border: 1px solid #c0392b; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
.admin__danger h2, .admin__job h2 { margin-top: 0; }
.admin__danger input { min-width: 300px; }
.admin__job { border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
.admin__competitions { border: 1px solid rgba(79, 106, 255, .55); border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
.competition-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; margin:1rem 0; }
.competition-form label { display:flex; flex-direction:column; gap:.3rem; font-size:.8rem; }
.competition-form .wide,.competition-form button { grid-column:1/-1; }
.competition-form input,.competition-form select { padding:.55rem; }
.admin__warning { color:#c98800; }.payout { display:flex; flex-direction:column; gap:.4rem; }.payout pre { overflow:auto; max-height:260px; }
button.danger { color: #fff; background: #a93226; }
select { margin-right: 0.4rem; }
</style>
