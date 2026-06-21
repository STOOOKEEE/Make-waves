<script setup lang="ts">
import { ref } from "vue";
import type { TideClient } from "@tide/client";
import type { Side } from "@tide/core";
import { usePaper } from "../composables/usePaper";

const props = defineProps<{ client: TideClient }>();
const { userId, connected, balances, orders, error, connect, placeOrder } =
  usePaper(props.client);

const base = ref("XRP");
const quote = ref("RLUSD");
const side = ref<Side>("buy");
const amount = ref(0);
const price = ref(0);

function submit(): void {
  void placeOrder({
    pair: { base: base.value, quote: quote.value },
    side: side.value,
    amount: amount.value,
    price: price.value,
  });
}
</script>

<template>
  <section>
    <div v-if="!connected" class="connect">
      <input v-model="userId" placeholder="Identifiant" @keyup.enter="connect" />
      <button @click="connect">Connecter</button>
    </div>

    <div v-else>
      <p>Connecté : <strong>{{ userId }}</strong></p>

      <h2>Soldes</h2>
      <ul>
        <li v-for="(value, currency) in balances" :key="currency">
          {{ currency }} : {{ value }}
        </li>
      </ul>

      <h2>Passer un ordre</h2>
      <form @submit.prevent="submit">
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

      <h2>Historique</h2>
      <ul>
        <li v-for="(order, index) in orders" :key="index">
          {{ order.side }} {{ order.amount }} {{ order.pair.base }} @ {{ order.price }}
        </li>
      </ul>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
