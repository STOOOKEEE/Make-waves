<script setup lang="ts">
import { ref } from "vue";
import type { TideClient } from "@tide/client";
import type { Side } from "@tide/core";
import { usePaper } from "../composables/usePaper";
import { formatAmount } from "../lib/format";
import AppPage from "../components/AppPage.vue";
import SectionHead from "../components/ui/SectionHead.vue";
import OutlineButton from "../components/ui/OutlineButton.vue";
import LcdReadout from "../components/ui/LcdReadout.vue";

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
  <AppPage>
    <SectionHead eyebrow="Mode Paper" title="Terminal.">
      Ordres simulés au prix réel du marché. Aucun risque — c'est ton terrain
      d'entraînement.
    </SectionHead>

    <!-- Connexion -->
    <div v-if="!connected" class="connect">
      <div class="field">
        <label for="handle">Identifiant</label>
        <input
          id="handle"
          v-model="userId"
          placeholder="ton-pseudo"
          @keyup.enter="connect"
        />
      </div>
      <OutlineButton solid @click="connect">Connecter</OutlineButton>
    </div>

    <template v-else>
      <!-- Soldes -->
      <div class="ledger">
        <div class="ledger__head">
          <span class="t-eyebrow">Compte</span>
          <LcdReadout>{{ userId.toUpperCase() }}</LcdReadout>
        </div>
        <div v-if="balances" class="balances">
          <div v-for="(value, currency) in balances" :key="currency" class="bal">
            <span class="t-eyebrow">{{ currency }}</span>
            <span class="bal__v">{{ formatAmount(value) }}</span>
          </div>
        </div>
      </div>

      <!-- Ordre -->
      <div class="panel">
        <h3 class="t-subheading">Passer un ordre</h3>
        <form class="order" @submit.prevent="submit">
          <div class="field">
            <label for="base">Base</label>
            <input id="base" v-model="base" placeholder="XRP" />
          </div>
          <div class="field">
            <label for="quote">Quote</label>
            <input id="quote" v-model="quote" placeholder="RLUSD" />
          </div>
          <div class="field">
            <label for="side">Sens</label>
            <select id="side" v-model="side">
              <option value="buy">Achat</option>
              <option value="sell">Vente</option>
            </select>
          </div>
          <div class="field">
            <label for="amount">Quantité</label>
            <input
              id="amount"
              v-model.number="amount"
              type="number"
              step="any"
              placeholder="0"
            />
          </div>
          <div class="field">
            <label for="price">Prix</label>
            <input
              id="price"
              v-model.number="price"
              type="number"
              step="any"
              placeholder="0"
            />
          </div>
          <div class="order__action">
            <OutlineButton solid type="submit">Exécuter</OutlineButton>
          </div>
        </form>
      </div>

      <!-- Historique -->
      <div class="panel">
        <h3 class="t-subheading">Historique</h3>
        <ul v-if="orders.length > 0" class="fills">
          <li v-for="(order, index) in orders" :key="index" class="fill">
            <span class="fill__side">{{
              order.side === "buy" ? "Achat" : "Vente"
            }}</span>
            <span class="fill__qty"
              >{{ formatAmount(order.amount) }} {{ order.pair.base }}</span
            >
            <span class="fill__px dim">@ {{ formatAmount(order.price) }}</span>
          </li>
        </ul>
        <p v-else class="empty">Aucun ordre passé.</p>
      </div>
    </template>

    <p v-if="error" class="error">{{ error }}</p>
  </AppPage>
</template>

<style scoped>
.connect {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-13);
  padding: var(--card-padding);
  border-radius: var(--radius-cards);
  background: var(--tint-raise);
  border: 1px solid var(--hairline-dark);
  max-width: 420px;
}
.connect .field {
  flex: 1;
}

.ledger {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-20);
}
.ledger__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.balances {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--element-gap);
}
.bal {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
  padding: var(--spacing-20);
  border-radius: var(--radius-cards);
  background: var(--tint-raise);
  border: 1px solid var(--hairline-dark);
}
.bal__v {
  font-size: var(--text-heading);
  line-height: 1;
  letter-spacing: var(--tracking-heading);
  font-weight: var(--weight-medium);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-20);
}

.order {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-13);
  align-items: end;
}
.order__action {
  display: flex;
  align-items: flex-end;
}

.fills {
  display: flex;
  flex-direction: column;
}
.fill {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: var(--spacing-20);
  align-items: baseline;
  padding: var(--spacing-13) 0;
  border-bottom: 1px solid var(--hairline-dark);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-caption);
}
.fill__side {
  font-weight: var(--weight-medium);
}
.fill__px {
  text-align: right;
}
</style>
