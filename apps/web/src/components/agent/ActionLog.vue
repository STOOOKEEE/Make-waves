<script setup lang="ts">
import { computed } from "vue";
import type { AgentActionDto } from "@tide/client";
import { useI18n } from "../../i18n/useI18n";

/* Journal des actions d'un agent — composant d'affichage PUR : la liste est
 * fournie par le parent (`AgentView`), qui la recharge après chaque tour de
 * chat (les actions sont auditées côté serveur). */

const props = defineProps<{ actions: readonly AgentActionDto[] }>();

const { t } = useI18n({
  en: {
    title: "Action log",
    empty: "No actions yet",
    tool: "Tool",
    time: "Time",
    error: "Error",
  },
  fr: {
    title: "Journal d'actions",
    empty: "Aucune action",
    tool: "Outil",
    time: "Heure",
    error: "Erreur",
  },
});

const items = computed<readonly AgentActionDto[]>(() => props.actions);

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}
</script>

<template>
  <section class="alog">
    <h3 class="atitle">{{ t('title') }}</h3>
    <p v-if="items.length === 0" class="empty">{{ t('empty') }}</p>
    <ul v-else class="alist">
      <li v-for="a in items" :key="a.id" class="arow" :class="{ ko: a.error !== null }">
        <span class="atool mono">{{ a.toolName }}</span>
        <span class="atime mono">{{ fmtTime(a.executedAt) }}</span>
        <span v-if="a.error" class="abadge ko mono">{{ t('error') }}: {{ a.error }}</span>
        <span v-else class="abadge ok mono">✓</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.alog {
  padding: 16px 18px;
  background: var(--panel, #1d1d24);
  border: 1px solid var(--line2, #2a2a32);
  border-radius: 14px;
  color: #fff;
  max-width: 520px;
}
.atitle {
  margin: 0 0 10px;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soft, rgba(255, 255, 255, 0.7));
}
.empty {
  color: var(--soft, rgba(255, 255, 255, 0.6));
  font-size: 13px;
  margin: 6px 0;
}
.alist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 360px;
  overflow-y: auto;
}
.arow {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--panel2, #16161b);
  font-size: 12.5px;
}
.arow.ko {
  background: rgba(255, 185, 172, 0.08);
}
.atool {
  color: #fff;
  font-weight: 700;
}
.atime {
  color: var(--soft, rgba(255, 255, 255, 0.6));
  font-size: 11.5px;
}
.abadge.ok {
  color: var(--up, #bff6ce);
}
.abadge.ko {
  color: var(--down, #ffb9ac);
  font-weight: 700;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
