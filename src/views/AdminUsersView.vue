<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { useAdminStore } from '../stores/admin'

const admin = useAdminStore()

function reload(): void {
  void admin.loadUsers()
}

onMounted(() => {
  void admin.loadUsers()
})
</script>

<template>
  <main>
    <h1>Usuarios</h1>
    <p v-if="admin.usersLoading">Cargando…</p>
    <p v-else-if="admin.error !== null" role="alert">
      {{ admin.error.message }}
      <button type="button" @click="reload()">Reintentar</button>
    </p>
    <ul v-else>
      <li v-for="user in admin.users" :key="user.id">
        <RouterLink :to="`/admin/usuarios/${user.id}`">{{ user.username }}</RouterLink>
        <p>{{ user.email }}</p>
      </li>
    </ul>
  </main>
</template>
