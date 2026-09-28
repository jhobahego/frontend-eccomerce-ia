<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogIn } from 'lucide-vue-next'

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
      errorMessage.value = isApiError(error) ? error.message : 'Ha ocurrido un error inesperado.'
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
        <CardTitle class="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Entra para ver tu cuenta, cesta y pedidos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4" @submit.prevent="onSubmit" novalidate>
          <div class="grid gap-1.5">
            <Label for="login-identifier">Correo o usuario</Label>
            <Input
              id="login-identifier"
              v-model="identifier"
              type="text"
              name="username"
              autocomplete="username"
              required
              placeholder="ana@example.es"
              :aria-invalid="errorMessage !== null"
              :aria-describedby="errorMessage !== null ? 'login-error' : undefined"
            />
          </div>
          <div class="grid gap-1.5">
            <Label for="login-password">Contraseña</Label>
            <Input
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
          <Alert v-if="errorMessage !== null" id="login-error" variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>
          <Button type="submit" :disabled="loading" class="w-full">
            <LogIn class="size-4" aria-hidden="true" />
            {{ loading ? 'Entrando…' : 'Entrar' }}
          </Button>
        </form>
      </CardContent>
    </Card>
    <p class="text-center text-sm text-muted-foreground">
      ¿Sin cuenta?
      <RouterLink to="/register" class="text-primary font-medium hover:underline"
        >Regístrate</RouterLink
      >
    </p>
  </main>
</template>
