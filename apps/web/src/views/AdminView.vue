<script setup lang="ts">
import { onMounted } from "vue";
import { useAdmin } from "../composables/useAdmin";
import { createLocalAdminClient } from "../lib/admin-client";

const { token, overview, error, loading, load, runTestnetE2E, logout } = useAdmin(
  createLocalAdminClient(),
);

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
  if (token.value !== "") void load();
});
</script>

<template>
  <section class="admin">
    <header class="admin__head">
      <h1>Console admin</h1>
      <p class="admin__sub">Supervision des comptes, lecture seule.</p>
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
          <span class="card__label">Agents</span>
          <strong class="card__value">{{ overview.totals.agents.total }}</strong>
          <ul class="segments">
            <li>Actifs : {{ overview.totals.agents.active }}</li>
            <li>En pause : {{ overview.totals.agents.paused }}</li>
            <li>Arrêtés : {{ overview.totals.agents.stopped }}</li>
          </ul>
        </div>

        <div class="card">
          <span class="card__label">Wallets</span>
          <strong class="card__value">{{ overview.totals.wallets }}</strong>
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

      <h2>Agents</h2>
      <table class="admin__table">
        <thead>
          <tr><th>Nom</th><th>Type</th><th>Statut</th><th>Owner</th><th>Mandat</th><th>Dernière action</th><th>Live</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in overview.agents" :key="a.id">
            <td>{{ a.name }}</td>
            <td>{{ a.type }}</td>
            <td>{{ a.status }}</td>
            <td>{{ a.ownerUserId }}</td>
            <td>{{ a.mandate ? `cap ${a.mandate.capitalMax} · x${a.mandate.maxLeverage}` : "—" }}</td>
            <td>{{ a.lastAction ? a.lastAction.toolName : "—" }}</td>
            <td>{{ a.hasLiveAccount ? "oui" : "non" }}</td>
          </tr>
        </tbody>
      </table>

      <h2>Wallets</h2>
      <table class="admin__table">
        <thead>
          <tr><th>Adresse</th><th>Type</th><th>Agent</th><th>Live</th></tr>
        </thead>
        <tbody>
          <tr v-for="(w, i) in overview.wallets" :key="i">
            <td>{{ w.address ?? "—" }}</td>
            <td>{{ w.kind }}</td>
            <td>{{ w.agentId ?? "—" }}</td>
            <td>{{ w.live ? "oui" : "non" }}</td>
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
</style>
