<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { formatAmount } from '../api/money'
import { isCancellableStatus, orderStatusLabel, paymentStatusLabel } from '../api/orders'
import { useOrdersStore } from '../stores/orders'

const orders = useOrdersStore()
const route = useRoute()
const invalidId = ref(false)
const cancelling = ref(false)

function currentId(): number | null {
  const id = Number(route.params.id)
  return Number.isInteger(id) ? id : null
}

function load(): void {
  const id = currentId()
  if (id === null) {
    invalidId.value = true
    return
  }
  invalidId.value = false
  void orders.loadOrder(id)
}

async function onCancel(): Promise<void> {
  const id = currentId()
  if (id === null || cancelling.value) {
    return
  }
  cancelling.value = true
  await orders.cancelOrder(id)
  cancelling.value = false
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
    <p v-if="invalidId">Pedido no válido. <RouterLink to="/pedidos">Ver mis pedidos</RouterLink></p>
    <template v-else>
      <p v-if="orders.detailLoading">Cargando…</p>
      <p v-else-if="orders.error !== null" role="alert">
        {{ orders.error.message }}
        <button type="button" @click="load()">Reintentar</button>
      </p>
      <template v-else-if="orders.detail !== null">
        <h1>{{ orders.detail.order_number }}</h1>
        <p>{{ orderStatusLabel(orders.detail.status) }}</p>
        <p>Pago: {{ paymentStatusLabel(orders.detail.payment_status) }}</p>
        <p>Total: {{ formatAmount(orders.detail.total_amount) }}</p>
        <p>
          Envío: {{ orders.detail.shipping_address }}, {{ orders.detail.shipping_city }} ({{
            orders.detail.shipping_postal_code
          }}, {{ orders.detail.shipping_country }})
        </p>
        <section aria-label="Artículos">
          <ul>
            <li v-for="item in orders.detail.items" :key="item.id">
              {{ item.product_name }} × {{ item.quantity }} —
              {{ formatAmount(item.total_price) }}
            </li>
          </ul>
        </section>
        <section v-if="orders.tracking !== null" aria-labelledby="tracking-heading">
          <h2 id="tracking-heading">Seguimiento</h2>
          <ul>
            <li v-for="(step, index) in orders.tracking.timeline" :key="index">
              {{ orderStatusLabel(step.status) }} — {{ step.at }}
            </li>
          </ul>
        </section>
        <button
          v-if="isCancellableStatus(orders.detail.status)"
          type="button"
          :disabled="cancelling"
          @click="onCancel"
        >
          Cancelar pedido
        </button>
      </template>
      <p v-else>
        Pedido no encontrado.
        <RouterLink to="/pedidos">Ver mis pedidos</RouterLink>
      </p>
    </template>
  </main>
</template>
