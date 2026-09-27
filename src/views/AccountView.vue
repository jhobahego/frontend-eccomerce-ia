<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { isApiError } from '../api/errors'
import { updateMyProfile } from '../api/users'
import { useSessionStore } from '../stores/session'

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
    errorMessage.value = isApiError(error) ? error.message : 'Unexpected error'
  } finally {
    saving.value = false
  }
}

onMounted(readProfile)
</script>

<template>
  <main>
    <h1>Mi cuenta</h1>
    <p>Correo: {{ session.user?.email }}</p>
    <p>Usuario: {{ session.user?.username }}</p>
    <form @submit.prevent="onSave" novalidate>
      <div>
        <label for="account-first-name">Nombre</label>
        <input
          id="account-first-name"
          v-model="firstName"
          type="text"
          name="first-name"
          autocomplete="given-name"
          required
        />
        <p v-if="fieldErrors['first_name'] !== undefined">{{ fieldErrors['first_name'] }}</p>
      </div>
      <div>
        <label for="account-last-name">Apellidos</label>
        <input
          id="account-last-name"
          v-model="lastName"
          type="text"
          name="last-name"
          autocomplete="family-name"
          required
        />
        <p v-if="fieldErrors['last_name'] !== undefined">{{ fieldErrors['last_name'] }}</p>
      </div>
      <div>
        <label for="account-phone">Teléfono</label>
        <input id="account-phone" v-model="phone" type="tel" name="phone" autocomplete="tel" />
      </div>
      <div>
        <label for="account-address">Dirección</label>
        <input
          id="account-address"
          v-model="address"
          type="text"
          name="address"
          autocomplete="street-address"
        />
      </div>
      <div>
        <label for="account-city">Ciudad</label>
        <input
          id="account-city"
          v-model="city"
          type="text"
          name="city"
          autocomplete="address-level2"
        />
      </div>
      <div>
        <label for="account-country">País</label>
        <input
          id="account-country"
          v-model="country"
          type="text"
          name="country"
          autocomplete="country-name"
        />
      </div>
      <div>
        <label for="account-postal">Código postal</label>
        <input
          id="account-postal"
          v-model="postalCode"
          type="text"
          name="postal-code"
          autocomplete="postal-code"
        />
      </div>
      <p v-if="saved" role="status">Perfil actualizado.</p>
      <p v-if="errorMessage !== null" role="alert">{{ errorMessage }}</p>
      <button type="submit" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Guardar' }}
      </button>
    </form>
  </main>
</template>
