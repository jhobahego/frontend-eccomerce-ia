<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div id="app-shell">
    <header>
      <nav aria-label="Principal">
        <RouterLink to="/">Inicio</RouterLink>
        <RouterLink to="/login">Entrar</RouterLink>
      </nav>
    </header>
    <RouterView />
  </div>
</template>
