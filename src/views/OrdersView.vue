<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { formatAmount } from '../api/money'
import { orderStatusLabel } from '../api/orders'
import { useOrdersStore } from '../stores/orders'

const orders = useOrdersStore()

function reload(): void {
  void orders.loadHistory()
}

onMounted(() => {
  void orders.loadHistory()
})
</script>

<template>
  <main>
    <h1>Mis pedidos</h1>
    <p v-if="orders.historyLoading">Cargando…</p>
    <p v-else-if="orders.error !== null" role="alert">
      {{ orders.error.message }}
      <button type="button" @click="reload()">Reintentar</button>
    </p>
    <template v-else-if="orders.history.length === 0">
      <p>Aún no tienes pedidos.</p>
      <p><RouterLink to="/catalogo">Ver catálogo</RouterLink></p>
    </template>
    <ul v-else>
      <li v-for="entry in orders.history" :key="entry.id">
        <RouterLink :to="`/pedidos/${entry.id}`">{{ entry.order_number }}</RouterLink>
        <p>{{ orderStatusLabel(entry.status) }} — {{ formatAmount(entry.total_amount) }}</p>
      </li>
    </ul>
  </main>
</template>
