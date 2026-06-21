<script setup lang="ts">
import { ref } from "vue";
import { TideApiError, TideClient } from "@tide/client";
import type { Balances, Fill, Side } from "@tide/core";
import { createFetchTransport } from "./lib/transport";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const client = new TideClient(createFetchTransport(API_BASE));

const userId = ref("");
const connected = ref(false);
const balances = ref<Balances | null>(null);
const orders = ref<readonly Fill[]>([]);
const error = ref("");

// Formulaire d'ordre
const base = ref("XRP");
const quote = ref("RLUSD");
const side = ref<Side>("buy");
const amount = ref(0);
const price = ref(0);

function show(e: unknown): void {
  error.value = e instanceof TideApiError ? e.message : "Erreur réseau";
}

async function refresh(): Promise<void> {
  balances.value = await client.balances(userId.value);
  orders.value = await client.orders(userId.value);
}

async function connect(): Promise<void> {
  error.value = "";
  if (userId.value.trim() === "") {
    error.value = "Entre un identifiant";
    return;
  }
  try {
    try {
      await client.openAccount(userId.value);
    } catch (e) {
      // 409 = compte déjà ouvert : on continue. Toute autre erreur remonte.
      if (!(e instanceof TideApiError && e.status === 409)) {
        throw e;
      }
    }
    await refresh();
    connected.value = true;
  } catch (e) {
    show(e);
  }
}

async function submitOrder(): Promise<void> {
  error.value = "";
  try {
    await client.placeOrder(userId.value, {
      pair: { base: base.value, quote: quote.value },
      side: side.value,
      amount: amount.value,
      price: price.value,
    });
    await refresh();
  } catch (e) {
    show(e);
  }
}
</script>

<template>
  <main class="app">
    <h1>Tide — terminal paper</h1>

    <section v-if="!connected" class="connect">
      <input v-model="userId" placeholder="Identifiant" @keyup.enter="connect" />
      <button @click="connect">Connecter</button>
    </section>

    <section v-else class="terminal">
      <p class="user">Connecté : <strong>{{ userId }}</strong></p>

      <div class="balances">
        <h2>Soldes</h2>
        <ul>
          <li v-for="(value, currency) in balances" :key="currency">
            {{ currency }} : {{ value }}
          </li>
        </ul>
      </div>

      <form class="order" @submit.prevent="submitOrder">
        <h2>Passer un ordre</h2>
        <input v-model="base" placeholder="Base" />
        <input v-model="quote" placeholder="Quote" />
        <select v-model="side">
          <option value="buy">Achat</option>
          <option value="sell">Vente</option>
        </select>
        <input v-model.number="amount" type="number" step="any" placeholder="Quantité" />
        <input v-model.number="price" type="number" step="any" placeholder="Prix" />
        <button type="submit">Exécuter</button>
      </form>

      <div class="orders">
        <h2>Historique</h2>
        <ul>
          <li v-for="(order, index) in orders" :key="index">
            {{ order.side }} {{ order.amount }} {{ order.pair.base }} @ {{ order.price }}
          </li>
        </ul>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<style scoped>
.app {
  max-width: 640px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}
.error {
  color: #c0392b;
}
h2 {
  font-size: 1rem;
  margin-top: 1.5rem;
}
input,
select,
button {
  margin: 0.2rem;
  padding: 0.4rem;
}
</style>
