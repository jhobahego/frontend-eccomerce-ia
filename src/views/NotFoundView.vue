<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <h1>Página no encontrada</h1>
    <p>La página que buscas no existe.</p>
    <p><RouterLink to="/">Volver al inicio</RouterLink></p>
  </main>
</template>
