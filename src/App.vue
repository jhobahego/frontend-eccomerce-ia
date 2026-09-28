<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import AssistantPanel from './components/AssistantPanel.vue'
import { useSessionStore } from './stores/session'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()

const assistantOpen = ref(false)
const launcher = ref<HTMLButtonElement | null>(null)

async function onLogout(): Promise<void> {
  // Leave no protected content on screen: logout clears the session and the
  // shell returns to the public home (the guard would bounce the next
  // protected navigation anyway, but the current view must not linger).
  session.logout()
  await router.push('/')
}

function openAssistant(): void {
  assistantOpen.value = true
}

function closeAssistant(): void {
  assistantOpen.value = false
  launcher.value?.focus()
}

// The shell never traps: navigating follows a manual path and dismisses.
watch(
  () => route.fullPath,
  () => {
    assistantOpen.value = false
  },
)
</script>

<template>
  <div id="app-shell">
    <header>
      <nav aria-label="Principal">
        <RouterLink to="/">Inicio</RouterLink>
        <RouterLink to="/catalogo">Catálogo</RouterLink>
        <RouterLink to="/cesta">Cesta</RouterLink>
        <RouterLink v-if="session.isAuthenticated" to="/cuenta">Mi cuenta</RouterLink>
        <RouterLink v-if="session.isAuthenticated" to="/pedidos">Mis pedidos</RouterLink>
        <RouterLink v-if="session.isAdmin" to="/admin">Administración</RouterLink>
        <RouterLink v-if="!session.isAuthenticated" to="/login">Entrar</RouterLink>
        <button v-else type="button" @click="onLogout()">Salir</button>
      </nav>
      <button ref="launcher" type="button" aria-haspopup="dialog" @click="openAssistant">
        Asistente
      </button>
    </header>
    <AssistantPanel v-if="assistantOpen" @close="closeAssistant" />
    <RouterView />
  </div>
</template>
