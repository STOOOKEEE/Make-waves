<script setup lang="ts">
/* Sélecteur de langue FR | EN réutilisable. Deux variantes visuelles :
 * - "light" (défaut) : posé sur le bleu de l'app-bar des écrans app.
 * - "dark" : outline blanc, posé sur l'ink de la top-bar de la landing.
 * Lit/écrit l'état global de langue. */
import { LOCALES, locale, setLocale, type Locale } from "../i18n/locale";

withDefaults(defineProps<{ variant?: "light" | "dark" }>(), {
  variant: "light",
});

function select(value: Locale): void {
  setLocale(value);
}
</script>

<template>
  <div class="lang" :class="variant" role="group" aria-label="Language">
    <button
      v-for="l in LOCALES"
      :key="l"
      type="button"
      :class="{ on: locale === l }"
      :aria-pressed="locale === l"
      @click="select(l)"
    >
      {{ l.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.lang {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border-radius: 100px;
  padding: 3px;
  flex-shrink: 0;
}
.lang button {
  font-family: var(--mono, "JetBrains Mono", monospace);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 100px;
  padding: 6px 11px;
  line-height: 1;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
}

/* Variante claire (app-bar bleue). */
.lang.light {
  background: rgba(255, 255, 255, 0.12);
}
.lang.light button {
  color: rgba(255, 255, 255, 0.7);
}
.lang.light button.on {
  background: #fff;
  color: var(--blue, #4f6aff);
}

/* Variante sombre (landing, sur l'ink). */
.lang.dark {
  border: 1px solid rgba(255, 255, 255, 0.22);
}
.lang.dark button {
  color: rgba(255, 255, 255, 0.62);
}
.lang.dark button.on {
  background: #fff;
  color: #161618;
}
</style>
