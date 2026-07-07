<script setup lang="ts">
/* Carte « spécimen » d'agent (Arène IA). Affiche le rang, l'auteur, une
 * EMPREINTE D'ARCHITECTURE (génome de 12 modules en code-barres), une mini
 * sparkline déterministe et le rendement. Composant réutilisable de la meute. */

import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  rank: number;
  name: string;
  author: string;
  /** 12 modules optionnels (true = branché) — regroupés par étage. */
  genome: boolean[];
  ret: number;
  sharpe: number;
  seed: number;
}>();

const { t } = useI18n({
  en: {
    by: "by {author}",
    genomeAria: "architecture fingerprint of {name}",
  },
  fr: {
    by: "par {author}",
    genomeAria: "empreinte d'architecture de {name}",
  },
});

/* tailles de groupes du génome : perception 4 · raisonnement 4 · risque 2 · exécution 2 */
const GROUPS = [4, 4, 2, 2];

function groupSlots(): { on: boolean; gap: boolean }[] {
  const out: { on: boolean; gap: boolean }[] = [];
  let idx = 0;
  GROUPS.forEach((size, g) => {
    for (let i = 0; i < size; i++) {
      out.push({ on: props.genome[idx] === true, gap: i === 0 && g > 0 });
      idx++;
    }
  });
  return out;
}

/* sparkline déterministe (LCG seedé) tendant vers le rendement. */
function spark(): string {
  let a = props.seed >>> 0;
  const rnd = (): number => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const n = 14;
  const W = 120;
  const H = 34;
  const pts: number[] = [];
  let v = 50;
  const target = 50 - Math.min(28, props.ret / 6);
  for (let i = 0; i < n; i++) {
    v += (target - v) / (n - i) + (rnd() - 0.5) * 7;
    pts.push(v);
  }
  const mx = Math.max(...pts) + 2;
  const mn = Math.min(...pts) - 2;
  const X = (i: number): number => (i / (n - 1)) * W;
  const Y = (val: number): number => ((val - mn) / (mx - mn || 1)) * H;
  return pts
    .map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p).toFixed(1)}`)
    .join(" ");
}
</script>

<template>
  <div class="spec">
    <div class="spec-top">
      <span class="srank mono">{{ rank < 10 ? "0" + rank : rank }}</span>
      <span class="ssharpe mono">SHARPE {{ sharpe }}</span>
    </div>
    <div class="sname">{{ name }}</div>
    <div class="sauthor mono">{{ t('by', { author }) }}</div>

    <div class="genome" :aria-label="t('genomeAria', { name })">
      <span
        v-for="(slot, i) in groupSlots()"
        :key="i"
        class="gbar"
        :class="{ on: slot.on, gap: slot.gap }"
      ></span>
    </div>

    <div class="spec-foot">
      <svg class="sspark" viewBox="0 0 120 34" preserveAspectRatio="none">
        <path :d="spark()" fill="none" stroke="var(--up)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="sret mono">+{{ ret }}%</span>
    </div>
  </div>
</template>

<style scoped>
.spec {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s var(--ease), border-color 0.2s, background 0.2s;
  cursor: default;
}
.spec:hover {
  transform: translateY(-4px);
  border-color: var(--line2);
  background: var(--panel2);
}
.spec-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.srank {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--mut2);
}
.ssharpe {
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--soft);
  border: 1px solid var(--line);
  border-radius: 100px;
  padding: 4px 9px;
}
.sname {
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.02em;
}
.sauthor {
  font-size: 11px;
  color: var(--soft);
  margin-top: 3px;
}
.genome {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 26px;
  margin: 18px 0;
}
.gbar {
  width: 6px;
  height: 10px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
  transition: height 0.3s var(--ease), background 0.3s;
}
.gbar.on {
  height: 26px;
  background: var(--blue);
}
.gbar.gap {
  margin-left: 9px;
}
.spec-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.sspark {
  width: 120px;
  height: 34px;
  flex-shrink: 0;
}
.sret {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--up);
}
</style>
