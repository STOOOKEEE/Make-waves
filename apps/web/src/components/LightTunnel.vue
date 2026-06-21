<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

/*
 * Tunnel de lumière — burst de rayons radiaux rendu en canvas (façon warp/supernova).
 * Des centaines de stries fines jaillissent du foyer, s'allument à l'arrivée puis
 * respirent. Bleu froid dominant, blanc/chaud rares. La seule couleur du système.
 */
withDefaults(defineProps<{ full?: boolean }>(), { full: false });

const host = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

interface Ray {
  angle: number; // direction (rad)
  length: number; // longueur, fraction de maxR
  start: number; // départ depuis le centre, fraction de maxR
  width: number; // épaisseur (px CSS)
  bright: number; // intensité de base 0..1
  freq: number; // fréquence de scintillement
  phase: number;
  color: string; // "r,g,b"
}

const RAY_COUNT = 340;
const INTRO_MS = 2300;
const INTRO_DELAY_MS = 200;
const FOCAL_Y = 0.45; // foyer un peu au-dessus du centre
const MAX_DPR = 2;

// Palette froide pondérée (bleus dominants, blanc/chaud comme étincelles rares).
const PALETTE: string[] = (() => {
  const out: string[] = [];
  const add = (c: string, n: number): void => {
    for (let i = 0; i < n; i += 1) out.push(c);
  };
  add("130,180,255", 7);
  add("80,140,255", 7);
  add("48,96,220", 5);
  add("180,210,255", 5);
  add("214,230,255", 4);
  add("255,255,255", 3);
  add("255,224,190", 1);
  return out;
})();

let ctx: CanvasRenderingContext2D | null = null;
let rays: Ray[] = [];
let raf = 0;
let observer: ResizeObserver | null = null;
let startTime = 0;
let reduced = false;

let dpr = 1;
let width = 0;
let height = 0;
let cx = 0;
let cy = 0;
let maxR = 1;

// Parallaxe pointeur (lissée) — casse l'aspect figé.
let targetOX = 0;
let targetOY = 0;
let ox = 0;
let oy = 0;

const DEFAULT_COLOR = "120,170,255";

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? DEFAULT_COLOR;
}

function buildRays(): void {
  rays = [];
  for (let i = 0; i < RAY_COUNT; i += 1) {
    rays.push({
      angle: Math.random() * Math.PI * 2,
      length: rand(0.6, 1.2),
      start: rand(0.003, 0.02),
      width: rand(0.5, 2.3),
      bright: rand(0.35, 1.2),
      freq: rand(0.4, 2.1),
      phase: Math.random() * Math.PI * 2,
      color: pickColor(),
    });
  }
}

function resize(): void {
  const el = host.value;
  const cv = canvas.value;
  if (!el || !cv) return;
  dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const rect = el.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  cv.width = Math.round(width * dpr);
  cv.height = Math.round(height * dpr);
  cv.style.width = `${width}px`;
  cv.style.height = `${height}px`;
  ctx = cv.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = width * 0.5;
  cy = height * FOCAL_Y;
  maxR = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
  // En statique (reduced-motion), aucune boucle ne repeint : le redimensionnement
  // efface le canvas, il faut donc le redessiner ici.
  if (reduced) render(performance.now());
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function render(now: number): void {
  if (!ctx) return;
  if (startTime === 0) startTime = now;
  const elapsed = now - startTime;
  const introT = Math.min(1, Math.max(0, (elapsed - INTRO_DELAY_MS) / INTRO_MS));
  const intro = reduced ? 1 : easeOut(introT);
  const t = now / 1000;

  // Léger twist qui se résorbe à l'allumage + rotation lente continue.
  const rot = (reduced ? 0 : t * 0.012) + (1 - intro) * 0.5;

  ox += (targetOX - ox) * 0.06;
  oy += (targetOY - oy) * 0.06;
  const fx = cx + ox;
  const fy = cy + oy;

  // Fond void
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000004";
  ctx.fillRect(0, 0, width, height);

  // Rayons (additif → bloom là où ils se superposent)
  ctx.globalCompositeOperation = "lighter";
  for (const r of rays) {
    const twinkle = reduced ? 1 : 0.62 + 0.38 * Math.sin(t * r.freq + r.phase);
    const alpha = r.bright * twinkle * intro;
    if (alpha <= 0.002) continue;
    const ang = r.angle + rot;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const r1 = r.start * maxR;
    const r2 = (r.start + r.length * intro) * maxR;
    const x1 = fx + dx * r1;
    const y1 = fy + dy * r1;
    const x2 = fx + dx * r2;
    const y2 = fy + dy * r2;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, `rgba(${r.color},${Math.min(1, alpha).toFixed(3)})`);
    grad.addColorStop(0.25, `rgba(${r.color},${Math.min(1, alpha * 0.6).toFixed(3)})`);
    grad.addColorStop(0.6, `rgba(${r.color},${(alpha * 0.22).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${r.color},0)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = r.width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Cœur incandescent (gros bloom blanc-bleu)
  const coreR = maxR * 0.42;
  const core = ctx.createRadialGradient(fx, fy, 0, fx, fy, coreR);
  core.addColorStop(0, `rgba(244,248,255,${(0.98 * intro).toFixed(3)})`);
  core.addColorStop(0.12, `rgba(170,205,255,${(0.7 * intro).toFixed(3)})`);
  core.addColorStop(0.4, `rgba(90,150,255,${(0.28 * intro).toFixed(3)})`);
  core.addColorStop(1, "rgba(70,120,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, width, height);

  // Vignette douce : assombrit seulement les bords lointains
  ctx.globalCompositeOperation = "source-over";
  const vg = ctx.createRadialGradient(fx, fy, maxR * 0.18, fx, fy, maxR * 1.02);
  vg.addColorStop(0, "rgba(0,0,4,0)");
  vg.addColorStop(0.78, "rgba(0,0,4,0.2)");
  vg.addColorStop(1, "rgba(0,0,4,0.92)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);

  if (!reduced) raf = requestAnimationFrame(render);
}

function onPointer(event: PointerEvent): void {
  const el = host.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  targetOX = ((event.clientX - rect.left) / rect.width - 0.5) * rect.width * 0.05;
  targetOY = ((event.clientY - rect.top) / rect.height - 0.42) * rect.height * 0.04;
}

function onLeave(): void {
  targetOX = 0;
  targetOY = 0;
}

onMounted(() => {
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  buildRays();
  resize();
  observer = new ResizeObserver(resize);
  if (host.value) observer.observe(host.value);
  if (reduced) {
    render(performance.now());
  } else {
    raf = requestAnimationFrame(render);
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  observer?.disconnect();
});
</script>

<template>
  <section
    ref="host"
    class="tunnel"
    :class="{ 'tunnel--full': full }"
    @pointermove="onPointer"
    @pointerleave="onLeave"
  >
    <canvas ref="canvas" class="tunnel__canvas" aria-hidden="true" />
    <div class="tunnel__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.tunnel {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  isolation: isolate;
  background: #000004;
  padding: var(--spacing-100) var(--spacing-20);
}

.tunnel--full {
  min-height: 100svh;
}

.tunnel__canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
}

.tunnel__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--content-max);
  text-align: center;
}
</style>
