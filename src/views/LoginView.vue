<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { isApiError } from '../api/errors'
import { SessionExpiredError } from '../api/client'
import { useCartStore } from '../stores/cart'
import { useSessionStore } from '../stores/session'

const session = useSessionStore()
const cart = useCartStore()
const router = useRouter()

const identifier = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function onSubmit(): Promise<void> {
  if (loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = null
  try {
    await session.login(identifier.value.trim(), password.value)
    // Guest lines merge into the owned cart before resuming (T007). Merge
    // failures surface on the cart page; they never block the login itself.
    await cart.mergeOnLogin()
    const destination = session.returnTo ?? '/'
    session.setReturnTo(null)
    await router.push(destination)
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      errorMessage.value = 'Tu sesión caducó. Entra de nuevo.'
    } else {
      errorMessage.value = isApiError(error) ? error.message : 'Unexpected error'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main>
    <h1>Iniciar sesión</h1>
    <form @submit.prevent="onSubmit" novalidate>
      <div>
        <label for="login-identifier">Correo o usuario</label>
        <input
          id="login-identifier"
          v-model="identifier"
          type="text"
          name="username"
          autocomplete="username"
          required
          :aria-invalid="errorMessage !== null"
          :aria-describedby="errorMessage !== null ? 'login-error' : undefined"
        />
      </div>
      <div>
        <label for="login-password">Contraseña</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          :aria-invalid="errorMessage !== null"
          :aria-describedby="errorMessage !== null ? 'login-error' : undefined"
        />
      </div>
      <p v-if="errorMessage !== null" id="login-error" role="alert">{{ errorMessage }}</p>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
    <p>¿Sin cuenta? <RouterLink to="/register">Regístrate</RouterLink></p>
  </main>
</template>
