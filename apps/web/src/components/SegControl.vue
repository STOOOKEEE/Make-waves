<script setup lang="ts">
/* Segmented control des écrans app (pill blanche = actif). Utilise les classes
 * globales .seg de base.css. v-model = option active. */

defineProps<{ options: string[]; modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div class="seg">
    <button
      v-for="opt in options"
      :key="opt"
      :class="{ on: opt === modelValue }"
      @click="emit('update:modelValue', opt)"
    >
      {{ opt }}
    </button>
  </div>
</template>
