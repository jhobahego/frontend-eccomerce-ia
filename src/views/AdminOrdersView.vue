<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Package, RefreshCw } from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import { orderStatusLabel, paymentStatusLabel } from '../api/orders'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../api/types'
import { useAdminStore } from '../stores/admin'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

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
  <main class="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
    <div class="flex items-center gap-3">
      <span class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
        <Package class="size-4" aria-hidden="true" />
      </span>
      <h1 class="text-2xl font-semibold tracking-tight">Pedidos</h1>
    </div>
    <Card>
      <CardContent>
        <div class="grid w-full max-w-xs gap-1.5">
          <Label for="admin-orders-filter">Filtrar por estado</Label>
          <select
            id="admin-orders-filter"
            v-model="filter"
            class="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Todos</option>
            <option v-for="status in ORDER_STATUSES" :key="status" :value="status">
              {{ statusLabel(status) }}
            </option>
          </select>
        </div>
      </CardContent>
    </Card>
    <p v-if="admin.ordersLoading" class="text-sm text-muted-foreground">Cargando…</p>
    <Alert v-else-if="admin.error !== null" variant="destructive">
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ admin.error.message }}
        <Button type="button" variant="outline" size="sm" @click="reload()">
          <RefreshCw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <p
      v-else-if="admin.orders.length === 0"
      class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      Sin pedidos para este filtro.
    </p>
    <ul v-else class="space-y-4">
      <li v-for="entry in admin.orders" :key="entry.id">
        <Card>
          <CardHeader class="space-y-2">
            <CardTitle>
              <h2 class="text-base font-semibold">{{ entry.order_number }}</h2>
            </CardTitle>
            <p class="text-sm text-muted-foreground">
              {{ orderStatusLabel(entry.status) }} — {{ formatAmount(entry.total_amount) }}
            </p>
            <p class="text-sm text-muted-foreground">
              Pago: {{ paymentStatusLabel(entry.payment_status) }}
            </p>
          </CardHeader>
          <CardContent class="space-y-4">
            <Separator />
            <div class="grid gap-1.5">
              <Label :for="`new-status-${entry.id}`"
                >Nuevo estado de {{ entry.order_number }}</Label
              >
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  :id="`new-status-${entry.id}`"
                  v-model="pendingStatus[entry.id]"
                  class="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Elige</option>
                  <option v-for="status in ORDER_STATUSES" :key="status" :value="status">
                    {{ statusLabel(status) }}
                  </option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="shrink-0"
                  @click="changeStatus(entry.id)"
                >
                  Cambiar estado de {{ entry.order_number }}
                </Button>
              </div>
            </div>
            <div class="grid gap-1.5">
              <Label :for="`new-payment-${entry.id}`">Nuevo pago de {{ entry.order_number }}</Label>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  :id="`new-payment-${entry.id}`"
                  v-model="pendingPayment[entry.id]"
                  class="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Elige</option>
                  <option v-for="status in PAYMENT_STATUSES" :key="status" :value="status">
                    {{ paymentStatusLabel(status) }}
                  </option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="shrink-0"
                  @click="changePayment(entry.id)"
                >
                  Cambiar pago de {{ entry.order_number }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </li>
    </ul>
  </main>
</template>
