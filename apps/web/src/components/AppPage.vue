<script setup lang="ts">
/* Gabarit des vues applicatives : void plein écran, dégage la nav, contenu centré. */
</script>

<template>
  <section class="app-page surface-void">
    <div class="container app-page__inner">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.app-page {
  min-height: 100svh;
  padding: calc(var(--spacing-100) + var(--spacing-30)) var(--spacing-20)
    var(--spacing-70);
}

.app-page__inner {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}
</style>
