<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { RotateCcw } from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import { isCancellableStatus, orderStatusLabel, paymentStatusLabel } from '../api/orders'
import { useOrdersStore } from '../stores/orders'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

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
  <main class="mx-auto w-full max-w-3xl space-y-6">
    <p v-if="invalidId" class="text-sm">
      Pedido no válido.
      <RouterLink to="/pedidos" class="text-primary font-medium hover:underline"
        >Ver mis pedidos</RouterLink
      >
    </p>
    <template v-else>
      <div v-if="orders.detailLoading" class="space-y-3">
        <Skeleton class="h-8 w-48" />
        <Skeleton class="h-40 w-full rounded-xl" />
        <p class="sr-only">Cargando…</p>
      </div>
      <Alert v-else-if="orders.error !== null" variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          {{ orders.error.message }}
          <Button type="button" size="sm" variant="outline" @click="load()">
            <RotateCcw class="size-4" aria-hidden="true" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
      <template v-else-if="orders.detail !== null">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
            {{ orders.detail.order_number }}
          </h1>
          <p class="flex flex-wrap gap-2 text-sm">
            <Badge>{{ orderStatusLabel(orders.detail.status) }}</Badge>
            <Badge variant="outline"
              >Pago: {{ paymentStatusLabel(orders.detail.payment_status) }}</Badge
            >
          </p>
        </div>
        <Card>
          <CardContent class="space-y-2 text-sm">
            <p class="text-base font-semibold">
              Total: {{ formatAmount(orders.detail.total_amount) }}
            </p>
            <p class="text-muted-foreground">
              Envío: {{ orders.detail.shipping_address }}, {{ orders.detail.shipping_city }} ({{
                orders.detail.shipping_postal_code
              }}, {{ orders.detail.shipping_country }})
            </p>
            <Separator />
            <section aria-label="Artículos">
              <ul class="divide-y">
                <li
                  v-for="item in orders.detail.items"
                  :key="item.id"
                  class="flex justify-between gap-3 py-2"
                >
                  <span>{{ item.product_name }} × {{ item.quantity }}</span>
                  <span class="font-medium">{{ formatAmount(item.total_price) }}</span>
                </li>
              </ul>
            </section>
          </CardContent>
        </Card>
        <Card v-if="orders.tracking !== null">
          <CardHeader class="pb-2">
            <CardTitle id="tracking-heading" class="text-base">Seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <ul class="space-y-1.5 text-sm">
              <li
                v-for="(step, index) in orders.tracking.timeline"
                :key="index"
                class="flex justify-between gap-3"
              >
                <span>{{ orderStatusLabel(step.status) }}</span>
                <span class="text-muted-foreground">{{ step.at }}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        <div>
          <Button
            v-if="isCancellableStatus(orders.detail.status)"
            type="button"
            variant="destructive"
            :disabled="cancelling"
            @click="onCancel"
          >
            {{ cancelling ? 'Cancelando…' : 'Cancelar pedido' }}
          </Button>
          <p v-else class="text-muted-foreground text-sm">Este pedido ya no se puede cancelar.</p>
        </div>
      </template>
      <Card v-else>
        <CardContent class="py-8 text-center text-sm">
          Pedido no encontrado.
          <RouterLink to="/pedidos" class="text-primary font-medium hover:underline"
            >Ver mis pedidos</RouterLink
          >
        </CardContent>
      </Card>
    </template>
  </main>
</template>
