<script setup lang="ts">
/* Lien fantôme : texte seul, hiérarchie par opacité (0.6 → 1.0). Pas de soulignement. */
withDefaults(defineProps<{ active?: boolean }>(), { active: false });
defineEmits<{ (e: "click"): void }>();
</script>

<template>
  <button class="ghost" :class="{ 'ghost--active': active }" @click="$emit('click')">
    <slot />
  </button>
</template>

<style scoped>
.ghost {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-paper);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-caption);
  font-weight: var(--weight-regular);
  opacity: 0.6;
  transition: opacity var(--dur-fast) var(--ease);
}

.ghost:hover,
.ghost--active {
  opacity: 1;
}
</style>
