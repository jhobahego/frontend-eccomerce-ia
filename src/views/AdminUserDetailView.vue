<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useAdminStore } from '../stores/admin'

const admin = useAdminStore()
const route = useRoute()

function currentId(): number | null {
  const id = Number(route.params.id)
  return Number.isInteger(id) ? id : null
}

function load(): void {
  const id = currentId()
  if (id !== null) {
    void admin.loadUserDetail(id)
  }
}

onMounted(load)
watch(
  () => route.params.id,
  () => {
    load()
  },
)
</script>

<template>
  <main>
    <p><RouterLink to="/admin/usuarios">Volver a usuarios</RouterLink></p>
    <p v-if="admin.usersLoading">Cargando…</p>
    <p v-else-if="admin.error !== null" role="alert">
      {{ admin.error.message }}
      <button type="button" @click="load()">Reintentar</button>
    </p>
    <template v-else-if="admin.selectedUser !== null">
      <h1>{{ admin.selectedUser.username }}</h1>
      <p>{{ admin.selectedUser.email }}</p>
      <p>{{ admin.selectedUser.first_name }} {{ admin.selectedUser.last_name }}</p>
      <p>{{ admin.selectedUser.is_superuser ? 'Administración' : 'Cliente' }}</p>
    </template>
    <p v-else>Usuario no encontrado.</p>
  </main>
</template>
