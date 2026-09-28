<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserPlus } from 'lucide-vue-next'

import { isApiError } from '../api/errors'
import { SessionExpiredError } from '../api/client'
import { useCartStore } from '../stores/cart'
import { useSessionStore } from '../stores/session'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      errorMessage.value = 'Ha ocurrido un error inesperado.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="mx-auto w-full max-w-md space-y-6 py-4">
    <Card>
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>Regístrate para comprar y seguir tus pedidos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4" @submit.prevent="onSubmit" novalidate>
          <div class="grid gap-1.5">
            <Label for="register-email">Correo</Label>
            <Input
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
          <div class="grid gap-1.5">
            <Label for="register-username">Usuario</Label>
            <Input
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
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="register-first-name">Nombre</Label>
              <Input
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
            <div class="grid gap-1.5">
              <Label for="register-last-name">Apellidos</Label>
              <Input
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
          </div>
          <div class="grid gap-1.5">
            <Label for="register-password">Contraseña</Label>
            <Input
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
          <Alert v-if="errorMessage !== null" id="register-error" variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>
          <Button type="submit" :disabled="loading" class="w-full">
            <UserPlus class="size-4" aria-hidden="true" />
            {{ loading ? 'Creando…' : 'Crear cuenta' }}
          </Button>
        </form>
      </CardContent>
    </Card>
    <p class="text-center text-sm text-muted-foreground">
      ¿Ya tienes cuenta?
      <RouterLink to="/login" class="text-primary font-medium hover:underline"
        >Inicia sesión</RouterLink
      >
    </p>
  </main>
</template>
