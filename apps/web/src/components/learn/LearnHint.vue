<script setup lang="ts">
/* Puce « ? » contextuelle : ouvre la leçon Tide School correspondante.
 * Un simple <a href="#/learn/:slug"> suffit (routeur en hash) — pas de JS de
 * navigation, robuste. `bubble` (défaut vrai) = tooltip on-brand au survol ;
 * mets-le à faux dans un conteneur scrollable (ex. le ticket), qui clipperait
 * la bulle — on retombe alors sur le `title` natif. */
import { useI18n } from "../../i18n/useI18n";

withDefaults(defineProps<{ slug: string; label?: string; bubble?: boolean }>(), {
  bubble: true,
});

const { t } = useI18n({
  en: { learn: "Learn", read: "Read lesson →" },
  fr: { learn: "Apprendre", read: "Lire la leçon →" },
});
</script>

<template>
  <span class="hint-wrap">
    <a
      class="hint"
      :href="`#/learn/${slug}`"
      :aria-label="label || t('learn')"
      :title="bubble ? undefined : label || t('learn')"
      @click.stop
      >?</a
    >
    <span v-if="bubble" class="hint-pop" role="tooltip">
      <span v-if="label" class="hint-label">{{ label }}</span>
      <span class="hint-read">{{ t("read") }}</span>
    </span>
  </span>
</template>

<style scoped>
.hint-wrap {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  margin-left: 6px;
}
.hint {
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1px solid var(--line2);
  color: var(--soft);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}
.hint:hover,
.hint:focus-visible {
  color: var(--blue);
  border-color: var(--blue);
  background: #fff;
  outline: none;
}
.hint-pop {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  z-index: 60;
  width: max-content;
  max-width: 200px;
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--panel2);
  border: 1px solid var(--line2);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.2s var(--ease),
    transform 0.2s var(--ease);
}
.hint-wrap:hover .hint-pop,
.hint:focus-visible + .hint-pop {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.hint-label {
  display: block;
  font-family: var(--disp);
  font-weight: 600;
  font-size: 12px;
  line-height: 1.35;
  color: #fff;
  text-transform: none;
  letter-spacing: 0;
  margin-bottom: 4px;
}
.hint-read {
  display: block;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--blue);
}
</style>
