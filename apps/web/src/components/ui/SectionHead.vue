<script setup lang="ts">
/* En-tête de section/page : eyebrow (libellé reculé) + titre. */
defineProps<{ eyebrow?: string; title: string }>();
</script>

<template>
  <header class="head">
    <span v-if="eyebrow" class="t-eyebrow">{{ eyebrow }}</span>
    <h2 class="t-heading">{{ title }}</h2>
    <p v-if="$slots.default" class="head__lede muted">
      <slot />
    </p>
  </header>
</template>

<style scoped>
.head {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-13);
}

.head__lede {
  max-width: var(--reading-max);
  font-size: var(--text-subheading);
  line-height: var(--leading-subheading);
  letter-spacing: var(--tracking-subheading);
}
</style>
