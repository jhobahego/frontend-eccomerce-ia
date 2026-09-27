<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import { formatAmount } from '../api/money'
import { orderStatusLabel, paymentStatusLabel } from '../api/orders'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../api/types'
import { useAdminStore } from '../stores/admin'

const admin = useAdminStore()

const filter = ref('')
const pendingStatus = ref<Record<number, string>>({})
const pendingPayment = ref<Record<number, string>>({})

async function reload(): Promise<void> {
  await admin.loadOrders(filter.value === '' ? undefined : filter.value)
}

function statusLabel(value: string): string {
  if (value === '') {
    return 'Todos'
  }
  return orderStatusLabel(value)
}

async function changeStatus(id: number): Promise<void> {
  const next = pendingStatus.value[id]
  if (next === undefined || next === '') {
    return
  }
  await admin.setOrderStatus(id, next as (typeof ORDER_STATUSES)[number])
}

async function changePayment(id: number): Promise<void> {
  const next = pendingPayment.value[id]
  if (next === undefined || next === '') {
    return
  }
  await admin.setOrderPayment(id, next as (typeof PAYMENT_STATUSES)[number])
}

watch(filter, () => {
  void reload()
})

onMounted(() => {
  void reload()
})
</script>

<template>
  <main>
    <h1>Pedidos</h1>
    <div>
      <label for="admin-orders-filter">Filtrar por estado</label>
      <select id="admin-orders-filter" v-model="filter">
        <option value="">Todos</option>
        <option v-for="status in ORDER_STATUSES" :key="status" :value="status">
          {{ statusLabel(status) }}
        </option>
      </select>
    </div>
    <p v-if="admin.ordersLoading">Cargando…</p>
    <p v-else-if="admin.error !== null" role="alert">
      {{ admin.error.message }}
      <button type="button" @click="reload()">Reintentar</button>
    </p>
    <p v-else-if="admin.orders.length === 0">Sin pedidos para este filtro.</p>
    <ul v-else>
      <li v-for="entry in admin.orders" :key="entry.id">
        <h2>{{ entry.order_number }}</h2>
        <p>{{ orderStatusLabel(entry.status) }} — {{ formatAmount(entry.total_amount) }}</p>
        <p>Pago: {{ paymentStatusLabel(entry.payment_status) }}</p>
        <div>
          <label :for="`new-status-${entry.id}`">Nuevo estado de {{ entry.order_number }}</label>
          <select :id="`new-status-${entry.id}`" v-model="pendingStatus[entry.id]">
            <option value="">Elige</option>
            <option v-for="status in ORDER_STATUSES" :key="status" :value="status">
              {{ statusLabel(status) }}
            </option>
          </select>
          <button type="button" @click="changeStatus(entry.id)">
            Cambiar estado de {{ entry.order_number }}
          </button>
        </div>
        <div>
          <label :for="`new-payment-${entry.id}`">Nuevo pago de {{ entry.order_number }}</label>
          <select :id="`new-payment-${entry.id}`" v-model="pendingPayment[entry.id]">
            <option value="">Elige</option>
            <option v-for="status in PAYMENT_STATUSES" :key="status" :value="status">
              {{ paymentStatusLabel(status) }}
            </option>
          </select>
          <button type="button" @click="changePayment(entry.id)">
            Cambiar pago de {{ entry.order_number }}
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>
