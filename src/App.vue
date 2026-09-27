<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useSessionStore } from './stores/session'

const session = useSessionStore()
const router = useRouter()

async function onLogout(): Promise<void> {
  // Leave no protected content on screen: logout clears the session and the
  // shell returns to the public home (the guard would bounce the next
  // protected navigation anyway, but the current view must not linger).
  session.logout()
  await router.push('/')
}
</script>

<template>
  <div id="app-shell">
    <header>
      <nav aria-label="Principal">
        <RouterLink to="/">Inicio</RouterLink>
        <RouterLink to="/catalogo">Catálogo</RouterLink>
        <RouterLink v-if="session.isAdmin" to="/admin">Administración</RouterLink>
        <RouterLink v-if="!session.isAuthenticated" to="/login">Entrar</RouterLink>
        <button v-else type="button" @click="onLogout()">Salir</button>
      </nav>
    </header>
    <RouterView />
  </div>
</template>
