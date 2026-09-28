<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Save } from 'lucide-vue-next'

import { isApiError } from '../api/errors'
import { updateMyProfile } from '../api/users'
import { useSessionStore } from '../stores/session'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const session = useSessionStore()

const firstName = ref('')
const lastName = ref('')
const phone = ref('')
const address = ref('')
const city = ref('')
const country = ref('')
const postalCode = ref('')
const saving = ref(false)
const saved = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

function readProfile(): void {
  const user = session.user
  firstName.value = user?.first_name ?? ''
  lastName.value = user?.last_name ?? ''
  phone.value = user?.phone ?? ''
  address.value = user?.address ?? ''
  city.value = user?.city ?? ''
  country.value = user?.country ?? ''
  postalCode.value = user?.postal_code ?? ''
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

async function onSave(): Promise<void> {
  if (saving.value) {
    return
  }
  const invalid: Record<string, string> = {}
  if (firstName.value.trim() === '') {
    invalid['first_name'] = 'El nombre es obligatorio.'
  }
  if (lastName.value.trim() === '') {
    invalid['last_name'] = 'Los apellidos son obligatorios.'
  }
  fieldErrors.value = invalid
  if (Object.keys(invalid).length > 0) {
    return
  }
  saving.value = true
  errorMessage.value = null
  saved.value = false
  try {
    const updated = await updateMyProfile({
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      phone: optionalText(phone.value),
      address: optionalText(address.value),
      city: optionalText(city.value),
      country: optionalText(country.value),
      postal_code: optionalText(postalCode.value),
    })
    session.user = updated
    readProfile()
    saved.value = true
  } catch (error) {
    errorMessage.value = isApiError(error) ? error.message : 'Ha ocurrido un error inesperado.'
  } finally {
    saving.value = false
  }
}

onMounted(readProfile)
</script>

<template>
  <main class="mx-auto w-full max-w-2xl space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Mi cuenta</h1>
      <p class="text-muted-foreground text-sm">
        Correo: {{ session.user?.email }} · Usuario: {{ session.user?.username }}
      </p>
    </div>
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Perfil</CardTitle>
        <CardDescription>Actualiza tus datos de contacto y envío.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="onSave" novalidate>
          <div class="grid gap-1.5">
            <Label for="account-first-name">Nombre</Label>
            <Input
              id="account-first-name"
              v-model="firstName"
              type="text"
              name="first-name"
              autocomplete="given-name"
              required
              :aria-invalid="fieldErrors['first_name'] !== undefined"
              :aria-describedby="
                fieldErrors['first_name'] !== undefined ? 'account-first-name-error' : undefined
              "
            />
            <p
              v-if="fieldErrors['first_name'] !== undefined"
              id="account-first-name-error"
              role="alert"
              class="text-destructive text-xs"
            >
              {{ fieldErrors['first_name'] }}
            </p>
          </div>
          <div class="grid gap-1.5">
            <Label for="account-last-name">Apellidos</Label>
            <Input
              id="account-last-name"
              v-model="lastName"
              type="text"
              name="last-name"
              autocomplete="family-name"
              required
              :aria-invalid="fieldErrors['last_name'] !== undefined"
              :aria-describedby="
                fieldErrors['last_name'] !== undefined ? 'account-last-name-error' : undefined
              "
            />
            <p
              v-if="fieldErrors['last_name'] !== undefined"
              id="account-last-name-error"
              role="alert"
              class="text-destructive text-xs"
            >
              {{ fieldErrors['last_name'] }}
            </p>
          </div>
          <div class="grid gap-1.5">
            <Label for="account-phone">Teléfono</Label>
            <Input id="account-phone" v-model="phone" type="tel" name="phone" autocomplete="tel" />
          </div>
          <div class="grid gap-1.5">
            <Label for="account-address">Dirección</Label>
            <Input
              id="account-address"
              v-model="address"
              type="text"
              name="address"
              autocomplete="street-address"
            />
          </div>
          <div class="grid gap-1.5">
            <Label for="account-city">Ciudad</Label>
            <Input
              id="account-city"
              v-model="city"
              type="text"
              name="city"
              autocomplete="address-level2"
            />
          </div>
          <div class="grid gap-1.5">
            <Label for="account-country">País</Label>
            <Input
              id="account-country"
              v-model="country"
              type="text"
              name="country"
              autocomplete="country-name"
            />
          </div>
          <div class="grid gap-1.5 sm:col-span-2">
            <Label for="account-postal">Código postal</Label>
            <Input
              id="account-postal"
              v-model="postalCode"
              type="text"
              name="postal-code"
              autocomplete="postal-code"
            />
          </div>
          <Alert
            v-if="saved"
            class="sm:col-span-2 border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
          >
            <AlertTitle>Guardado</AlertTitle>
            <AlertDescription><span role="status">Perfil actualizado.</span></AlertDescription>
          </Alert>
          <Alert v-if="errorMessage !== null" variant="destructive" class="sm:col-span-2">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>
          <div class="sm:col-span-2">
            <Button type="submit" :disabled="saving">
              <Save class="size-4" aria-hidden="true" />
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
