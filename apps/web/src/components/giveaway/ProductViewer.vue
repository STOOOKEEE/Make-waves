<script setup lang="ts">
/*
 * Visionneuse 3D du lot (glTF, WebGL).
 *
 * Trois contraintes ont dessiné ce composant :
 *  - three.js pèse trop pour le bundle principal, donc il est chargé en import
 *    dynamique : seul un visiteur de la page tombola le télécharge ;
 *  - une boucle de rendu qui tourne hors écran ou dans un onglet caché vide une
 *    batterie pour rien, donc elle est suspendue dans les deux cas ;
 *  - sans WebGL (ou si le modèle échoue), la page doit rester présentable :
 *    l'image `poster` prend le relais et personne ne voit d'erreur.
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const props = defineProps<{
  /** URL du fichier .glb à afficher. */
  src: string;
  /** Image de repli, affichée tant que la 3D n'est pas prête ou si elle échoue. */
  poster: string;
  /** Texte alternatif du repli, et description accessible de la scène. */
  label: string;
}>();

const host = ref<HTMLElement | null>(null);
const ready = ref(false);
const failed = ref(false);

// `shallowRef` : ces objets three.js sont énormes et muter leurs graphes n'a
// aucune raison de déclencher un rendu Vue.
const renderer = shallowRef<WebGLRenderer | null>(null);
const scene = shallowRef<Scene | null>(null);
const camera = shallowRef<PerspectiveCamera | null>(null);
const controls = shallowRef<OrbitControls | null>(null);

let frame = 0;
let visible = false;
let disposed = false;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** WebGL absent (happy-dom, navigateur ancien, accélération coupée). */
function webglAvailable(): boolean {
  try {
    const probe = document.createElement("canvas");
    return (
      typeof probe.getContext === "function" &&
      probe.getContext("webgl2") !== null
    );
  } catch {
    return false;
  }
}

function renderOnce(): void {
  const r = renderer.value;
  const s = scene.value;
  const c = camera.value;
  if (r === null || s === null || c === null) return;
  controls.value?.update();
  r.render(s, c);
}

function loop(): void {
  if (disposed || !visible) return;
  frame = requestAnimationFrame(loop);
  renderOnce();
}

function start(): void {
  if (disposed || visible) return;
  visible = true;
  frame = requestAnimationFrame(loop);
}

function stop(): void {
  visible = false;
  if (frame !== 0) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

function onVisibilityChange(): void {
  if (document.hidden) stop();
  else if (intersecting) start();
}

let intersecting = false;

async function boot(): Promise<void> {
  const el = host.value;
  if (el === null || !webglAvailable()) {
    failed.value = true;
    return;
  }

  const [THREE, { OrbitControls: Controls }, { GLTFLoader }, { RoomEnvironment }] =
    await Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/environments/RoomEnvironment.js"),
    ]);
  if (disposed) return;

  const width = Math.max(1, el.clientWidth);
  const height = Math.max(1, el.clientHeight);

  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(width, height, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  el.appendChild(r.domElement);
  renderer.value = r;

  const s = new THREE.Scene();
  scene.value = s;

  // Éclairage d'ambiance neutre par IBL : le métal et le maillage du casque ont
  // besoin de quelque chose à réfléchir, sinon ils rendent plats et gris.
  const pmrem = new THREE.PMREMGenerator(r);
  s.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Deux accents au bleu de marque, pour raccorder l'objet à la page.
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(3, 4, 5);
  s.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x4f6aff, 3.4);
  rimLight.position.set(-4, 1, -4);
  s.add(rimLight);

  const c = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.value = c;

  const orbit = new Controls(c, r.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;
  // On n'offre que la rotation : ni zoom (qui capture le scroll de la page),
  // ni panoramique (qui laisse sortir l'objet du cadre sans moyen de revenir).
  orbit.enableZoom = false;
  orbit.enablePan = false;
  orbit.autoRotate = !reducedMotion();
  orbit.autoRotateSpeed = 0.9;
  orbit.minPolarAngle = Math.PI * 0.15;
  orbit.maxPolarAngle = Math.PI * 0.85;
  controls.value = orbit;

  const gltf = await new GLTFLoader().loadAsync(props.src);
  if (disposed) {
    return;
  }
  const model: Object3D = gltf.scene;

  // Le bake Sketchfab arrive en `alphaMode: BLEND` alors qu'il n'a pas de vraie
  // transparence : gardé tel quel, le tri des faces fait clignoter le casque.
  model.traverse((child) => {
    const mesh = child as { isMesh?: boolean; material?: { transparent: boolean; depthWrite: boolean } };
    if (mesh.isMesh === true && mesh.material !== undefined) {
      mesh.material.transparent = false;
      mesh.material.depthWrite = true;
    }
  });

  // Recentrage : le modèle arrive à une échelle et une origine arbitraires, on
  // le normalise pour que la caméra n'ait rien à deviner.
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(1 / longest);
  model.position.sub(center.multiplyScalar(1 / longest));
  s.add(model);

  // Rayon de la sphère englobante APRÈS normalisation : c'est lui qui borne le
  // cadrage, pas la boîte, parce que l'objet tourne et qu'un coin qui rentre de
  // face peut sortir du cadre un quart de tour plus loin.
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius / longest;

  /**
   * Distance de caméra qui fait tenir la sphère dans le cadre, verticalement
   * ET horizontalement. Recalculée à chaque redimensionnement : en colonne
   * étroite c'est la largeur qui contraint, pas la hauteur.
   */
  function frameModel(): void {
    const vFov = (c.fov * Math.PI) / 180;
    const fitHeight = radius / Math.tan(vFov / 2);
    const fitWidth = fitHeight / c.aspect;
    // 1,08 : juste assez d'air pour que la rotation ne rase jamais les bords.
    const distance = Math.max(fitHeight, fitWidth) * 1.08;
    c.position.set(0, radius * 0.12, distance);
    orbit.target.set(0, 0, 0);
    orbit.update();
  }

  frameModel();
  ready.value = true;

  resizeObserver = new ResizeObserver(() => {
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    c.aspect = w / h;
    c.updateProjectionMatrix();
    r.setSize(w, h, false);
    frameModel();
    renderOnce();
  });
  resizeObserver.observe(el);

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      intersecting = entries.some((entry) => entry.isIntersecting);
      if (intersecting && !document.hidden) start();
      else stop();
    },
    { threshold: 0.05 },
  );
  intersectionObserver.observe(el);

  document.addEventListener("visibilitychange", onVisibilityChange);
  renderOnce();
}

onMounted(() => {
  boot().catch(() => {
    // Modèle introuvable, WebGL perdu, navigateur exotique : la page garde son
    // visuel de repli plutôt que d'afficher un trou.
    failed.value = true;
  });
});

onBeforeUnmount(() => {
  disposed = true;
  stop();
  document.removeEventListener("visibilitychange", onVisibilityChange);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  controls.value?.dispose();
  scene.value?.traverse((child) => {
    const mesh = child as {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | { dispose: () => void }[];
    };
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
  renderer.value?.dispose();
  renderer.value?.domElement.remove();
});
</script>

<template>
  <div class="viewer" :class="{ live: ready && !failed }">
    <div ref="host" class="stage" :aria-label="label" role="img"></div>
    <img v-if="!ready || failed" class="poster" :src="poster" :alt="label" />
    <p v-if="ready && !failed" class="hint lab">
      <slot name="hint" />
    </p>
  </div>
</template>

<style scoped>
.viewer { position: relative; width: 100%; height: 100%; }
.stage { position: absolute; inset: 0; }
/* Le canvas capte le pointeur pour la rotation ; le tactile garde le scroll
   vertical de la page, sinon on piège le doigt du lecteur mobile. */
.stage :deep(canvas) { display: block; width: 100%; height: 100%; touch-action: pan-y; cursor: grab; }
.stage :deep(canvas:active) { cursor: grabbing; }
.poster { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.hint { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; opacity: 0; transition: opacity .5s var(--ease); }
.viewer.live .hint { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .hint { transition: none; }
}
</style>
