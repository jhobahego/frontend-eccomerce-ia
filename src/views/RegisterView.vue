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

const email = ref('')
const username = ref('')
const firstName = ref('')
const lastName = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const errorField = ref<string | null>(null)

function fieldInvalid(field: string): boolean {
  return errorField.value !== null && (errorField.value === field || errorField.value === 'all')
}

async function onSubmit(): Promise<void> {
  if (loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = null
  errorField.value = null
  try {
    await session.register({
      email: email.value.trim(),
      username: username.value.trim(),
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      password: password.value,
    })
    await cart.mergeOnLogin()
    const destination = session.returnTo ?? '/'
    session.setReturnTo(null)
    await router.push(destination)
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      errorMessage.value = 'Tu sesión caducó. Entra de nuevo.'
    } else if (isApiError(error)) {
      errorMessage.value = error.message
      // Duplicate accounts come back without a machine field: point at the
      // identity fields so the message sits next to a plausible culprit.
      errorField.value = error.field ?? (error.code === 'CONFLICT' ? 'email' : null)
    } else {
      errorMessage.value = 'Unexpected error'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main>
    <h1>Crear cuenta</h1>
    <form @submit.prevent="onSubmit" novalidate>
      <div>
        <label for="register-email">Correo</label>
        <input
          id="register-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          :aria-invalid="fieldInvalid('email')"
          :aria-describedby="errorMessage !== null ? 'register-error' : undefined"
        />
      </div>
      <div>
        <label for="register-username">Usuario</label>
        <input
          id="register-username"
          v-model="username"
          type="text"
          name="username"
          autocomplete="username"
          required
          :aria-invalid="fieldInvalid('username') || fieldInvalid('email')"
          :aria-describedby="errorMessage !== null ? 'register-error' : undefined"
        />
      </div>
      <div>
        <label for="register-first-name">Nombre</label>
        <input
          id="register-first-name"
          v-model="firstName"
          type="text"
          name="first-name"
          autocomplete="given-name"
          required
          :aria-invalid="fieldInvalid('first_name')"
          :aria-describedby="errorMessage !== null ? 'register-error' : undefined"
        />
      </div>
      <div>
        <label for="register-last-name">Apellidos</label>
        <input
          id="register-last-name"
          v-model="lastName"
          type="text"
          name="last-name"
          autocomplete="family-name"
          required
          :aria-invalid="fieldInvalid('last_name')"
          :aria-describedby="errorMessage !== null ? 'register-error' : undefined"
        />
      </div>
      <div>
        <label for="register-password">Contraseña</label>
        <input
          id="register-password"
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          required
          :aria-invalid="fieldInvalid('password')"
          :aria-describedby="errorMessage !== null ? 'register-error' : undefined"
        />
      </div>
      <p v-if="errorMessage !== null" id="register-error" role="alert">{{ errorMessage }}</p>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Creando…' : 'Crear cuenta' }}
      </button>
    </form>
    <p>¿Ya tienes cuenta? <RouterLink to="/login">Inicia sesión</RouterLink></p>
  </main>
</template>
