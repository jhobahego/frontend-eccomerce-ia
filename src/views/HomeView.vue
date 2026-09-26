<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <h1>Inicio</h1>
    <p>Bienvenido a la tienda. El catálogo completo llega con la lectura de catálogo.</p>
    <p><RouterLink to="/login">Entrar</RouterLink></p>
  </main>
</template>
