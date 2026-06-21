<script setup lang="ts">
/*
 * Affichage LCD (police à points) — accent éditorial rare : un seul par page.
 * Interlettrage positif, à contre-courant du système (humaniste, tracking négatif).
 * Optionnellement précédé d'un libellé discret.
 */
defineProps<{ label?: string }>();
</script>

<template>
  <div class="lcd">
    <span v-if="label" class="lcd__label">{{ label }}</span>
    <span class="lcd__value"><slot /></span>
  </div>
</template>

<style scoped>
.lcd {
  display: inline-flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.lcd__label {
  font-size: var(--text-micro);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-on-dark-muted);
}

.lcd__value {
  font-family: var(--font-lcd);
  font-size: var(--text-lcd);
  line-height: 1;
  letter-spacing: var(--tracking-lcd);
  color: var(--color-paper);
}
</style>
