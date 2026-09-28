<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { ShoppingBag, Sparkles, Store } from 'lucide-vue-next'

import AssistantPanel from './components/AssistantPanel.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import { Button } from '@/components/ui/button'
import { useSessionStore } from './stores/session'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()

const assistantOpen = ref(false)
const launcher = ref<HTMLElement | null>(null)

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
  const el = launcher.value as unknown as HTMLElement | { $el?: unknown } | null
  if (el instanceof HTMLElement) {
    el.focus()
  } else if (
    el !== null &&
    typeof el === 'object' &&
    '$el' in el &&
    el.$el instanceof HTMLElement
  ) {
    el.$el.focus()
  }
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
  <div id="app-shell" class="bg-background text-foreground min-h-screen antialiased">
    <header
      class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur"
    >
      <div
        class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <div class="flex min-w-0 items-center gap-6">
          <RouterLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
            <span
              class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg"
            >
              <Store class="size-4" aria-hidden="true" />
            </span>
            <span class="hidden sm:inline">Tienda IA</span>
          </RouterLink>
          <nav aria-label="Principal" class="flex items-center gap-1 text-sm">
            <RouterLink
              to="/"
              class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2.5 py-1.5 transition-colors [&.router-link-exact-active]:bg-muted [&.router-link-exact-active]:text-foreground"
              >Inicio</RouterLink
            >
            <RouterLink
              to="/catalogo"
              class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2.5 py-1.5 transition-colors [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
              >Catálogo</RouterLink
            >
            <RouterLink
              to="/cesta"
              class="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
            >
              <ShoppingBag class="size-4" aria-hidden="true" />
              Cesta
            </RouterLink>
            <RouterLink
              v-if="session.isAuthenticated"
              to="/cuenta"
              class="text-muted-foreground hover:text-foreground hover:bg-muted hidden rounded-md px-2.5 py-1.5 transition-colors sm:inline-flex [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
              >Mi cuenta</RouterLink
            >
            <RouterLink
              v-if="session.isAuthenticated"
              to="/pedidos"
              class="text-muted-foreground hover:text-foreground hover:bg-muted hidden rounded-md px-2.5 py-1.5 transition-colors md:inline-flex [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
              >Mis pedidos</RouterLink
            >
            <RouterLink
              v-if="session.isAdmin"
              to="/admin"
              class="text-muted-foreground hover:text-foreground hover:bg-muted hidden rounded-md px-2.5 py-1.5 transition-colors lg:inline-flex [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
              >Administración</RouterLink
            >
          </nav>
        </div>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            type="button"
            aria-haspopup="dialog"
            @click="openAssistant"
          >
            <Sparkles class="size-4" aria-hidden="true" />
            Asistente
          </Button>
          <Button v-if="!session.isAuthenticated" size="sm" as-child>
            <RouterLink to="/login">Entrar</RouterLink>
          </Button>
          <Button v-else size="sm" variant="ghost" type="button" @click="onLogout()">Salir</Button>
        </div>
      </div>
      <!-- Secondary row for account links on small screens, keeps a11y order stable -->
      <div v-if="session.isAuthenticated" class="border-t sm:hidden">
        <nav
          aria-label="Cuenta"
          class="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5 text-sm"
        >
          <RouterLink to="/cuenta" class="text-muted-foreground rounded px-2 py-1"
            >Mi cuenta</RouterLink
          >
          <RouterLink to="/pedidos" class="text-muted-foreground rounded px-2 py-1"
            >Mis pedidos</RouterLink
          >
          <RouterLink
            v-if="session.isAdmin"
            to="/admin"
            class="text-muted-foreground rounded px-2 py-1"
            >Administración</RouterLink
          >
        </nav>
      </div>
    </header>

    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <AssistantPanel v-if="assistantOpen" @close="closeAssistant" />
      <RouterView />
    </div>

    <footer class="border-t">
      <div
        class="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"
      >
        <p>Tienda online con asistente IA 24/7.</p>
        <p>Catálogo, cesta y pedidos manuales siempre disponibles.</p>
      </div>
    </footer>
  </div>
</template>
