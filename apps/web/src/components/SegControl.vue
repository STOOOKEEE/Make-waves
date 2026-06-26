<script setup lang="ts">
/* Segmented control des écrans app (pill blanche = actif). Utilise les classes
 * globales .seg de base.css. v-model = `value` de l'option active.
 * L'option sépare `value` (stable, sert à la logique) de `label` (traduit, à
 * l'affichage) pour survivre au changement de langue. */

export interface SegOption {
  value: string;
  label: string;
}

defineProps<{ options: readonly SegOption[]; modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div class="seg">
    <button
      v-for="opt in options"
      :key="opt.value"
      :class="{ on: opt.value === modelValue }"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
