<script setup lang="ts">
/* Salve de confettis pour la fin du tutoriel.
 *
 * Canvas maison, aucune dépendance (convention du repo). Couche non cliquable
 * posée au-dessus de tout : elle célèbre sans jamais bloquer l'écran, à la
 * différence d'une modale.
 *
 * Palette limitée aux tokens de marque. `prefers-reduced-motion` coupe
 * l'animation entièrement plutôt que de la ralentir : une pluie de particules
 * est exactement ce que ce réglage cherche à éviter.
 */
import { onMounted, onUnmounted, ref } from "vue";

const props = withDefaults(defineProps<{ count?: number; durationMs?: number }>(), {
  count: 130,
  durationMs: 4200,
});

const canvas = ref<HTMLCanvasElement | null>(null);
let frame = 0;

const COLORS = ["#bff6ce", "#ffb9ac", "#ffd66b", "#ffffff", "#4f6aff"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

onMounted(() => {
  const el = canvas.value;
  // `getContext` n'existe pas sous happy-dom : le composant ne casse pas les tests.
  if (el === null || typeof el.getContext !== "function" || prefersReducedMotion()) return;
  const ctx = el.getContext("2d");
  if (ctx === null) return;

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  el.width = width * dpr;
  el.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Deux gerbes latérales plutôt qu'une pluie du haut : ça lit comme une
  // célébration, pas comme de la neige. Elles partent en retrait des bords et
  // depuis le bas, avec un éventail large — tirer depuis x=0 envoyait la moitié
  // des particules hors de l'écran avant qu'on les voie.
  const particles: Particle[] = Array.from({ length: props.count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const spread = (Math.random() - 0.5) * 50; // éventail de ±25°
    const angle = ((fromLeft ? -55 : -125) + spread) * (Math.PI / 180);
    const speed = 13 + Math.random() * 12;
    return {
      x: fromLeft ? width * 0.1 : width * 0.9,
      y: height * 0.9,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 7 + Math.random() * 7,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.34,
      color: COLORS[i % COLORS.length] as string,
    };
  });

  const started = performance.now();

  function draw(now: number): void {
    const elapsed = now - started;
    const life = 1 - elapsed / props.durationMs;
    if (ctx === null) return;
    ctx.clearRect(0, 0, width, height);
    if (life <= 0) return;

    ctx.globalAlpha = Math.min(1, life * 1.6);
    for (const p of particles) {
      p.vy += 0.32; // gravité
      p.vx *= 0.995; // frottement
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    frame = requestAnimationFrame(draw);
  }

  frame = requestAnimationFrame(draw);
});

onUnmounted(() => {
  if (frame !== 0) cancelAnimationFrame(frame);
});
</script>

<template>
  <canvas ref="canvas" class="confetti" aria-hidden="true"></canvas>
</template>

<style scoped>
.confetti {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1400;
}
</style>
