<script setup lang="ts">
/*
 * Bouton ligné — la seule forme de bouton du système. Pill 100px, sans ombre.
 * Survol : inversion (fond Paper, texte Ink). `solid` = état plein au repos.
 */
withDefaults(
  defineProps<{ solid?: boolean; type?: "button" | "submit" }>(),
  { solid: false, type: "button" },
);
defineEmits<{ (e: "click"): void }>();
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="{ 'btn--solid': solid }"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-10);
  font-size: var(--text-caption);
  letter-spacing: var(--tracking-caption);
  font-weight: var(--weight-medium);
  color: var(--color-paper);
  background: transparent;
  border: 1px solid var(--color-paper);
  border-radius: var(--radius-buttons);
  padding: var(--spacing-10) var(--spacing-20);
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.btn:hover {
  background: var(--color-paper);
  color: var(--color-ink);
}

.btn--solid {
  background: var(--color-paper);
  color: var(--color-ink);
}

.btn--solid:hover {
  background: transparent;
  color: var(--color-paper);
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
