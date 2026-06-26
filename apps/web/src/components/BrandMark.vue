<script setup lang="ts">
/* Marque TIDE — vague blanche (tide_wave_logo). Source unique : l'asset SVG.
 * À poser dans un conteneur carré (.mk / .mark) qui en fixe la taille ;
 * `object-fit: contain` préserve le ratio du logo. */
import logo from "../assets/tide-wave-logo.svg";
</script>

<template>
  <img class="brandmark" :src="logo" alt="" aria-hidden="true" />
</template>

<style scoped>
.brandmark {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
</style>
