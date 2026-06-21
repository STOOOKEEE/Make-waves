<script setup lang="ts">
import type { RoutePath } from "../../composables/useRoute";
import GhostLink from "./GhostLink.vue";

/* Nav flottante : pill translucide frostée centrée en haut, lisible sur tout fond. */
defineProps<{ current: RoutePath }>();
const emit = defineEmits<{ (e: "navigate", path: RoutePath): void }>();

const links: { path: RoutePath; label: string }[] = [
  { path: "/terminal", label: "Terminal" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/competitions", label: "Compétitions" },
];
</script>

<template>
  <nav class="pill">
    <button class="pill__mark" @click="emit('navigate', '/')">tide</button>
    <span class="pill__sep" aria-hidden="true" />
    <ul class="pill__links">
      <li v-for="link in links" :key="link.path">
        <GhostLink :active="current === link.path" @click="emit('navigate', link.path)">
          {{ link.label }}
        </GhostLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.pill {
  position: fixed;
  top: var(--spacing-20);
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--spacing-13);
  padding: var(--spacing-5) var(--spacing-20);
  border-radius: var(--radius-navpill);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  box-shadow: var(--shadow-pill);
  max-width: calc(100vw - 2 * var(--spacing-20));
}

.pill__mark {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-paper);
  font-size: var(--text-caption);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-caption);
}

.pill__sep {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.18);
}

.pill__links {
  display: flex;
  align-items: center;
  gap: var(--spacing-20);
}

@media (max-width: 520px) {
  .pill {
    gap: var(--spacing-10);
    padding: var(--spacing-5) var(--spacing-13);
  }
  .pill__links {
    gap: var(--spacing-13);
  }
}
</style>
