<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { PackageOpen, RotateCcw } from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import { orderStatusLabel } from '../api/orders'
import { useOrdersStore } from '../stores/orders'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const orders = useOrdersStore()

function reload(): void {
  void orders.loadHistory()
}

onMounted(() => {
  void orders.loadHistory()
})
</script>

<template>
  <main class="mx-auto w-full max-w-3xl space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Mis pedidos</h1>
      <p class="text-muted-foreground text-sm">Historial y estado de tus compras.</p>
    </div>
    <div v-if="orders.historyLoading" class="space-y-3">
      <Skeleton class="h-16 w-full rounded-xl" />
      <Skeleton class="h-16 w-full rounded-xl" />
      <p class="sr-only">Cargando…</p>
    </div>
    <Alert v-else-if="orders.error !== null" variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ orders.error.message }}
        <Button type="button" size="sm" variant="outline" @click="reload()">
          <RotateCcw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <Card v-else-if="orders.history.length === 0">
      <CardContent class="flex flex-col items-center gap-2 py-10 text-center">
        <PackageOpen class="text-muted-foreground size-8" aria-hidden="true" />
        <p>Aún no tienes pedidos.</p>
        <p class="text-sm">
          <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
            >Ver catálogo</RouterLink
          >
        </p>
      </CardContent>
    </Card>
    <ul v-else class="grid gap-3">
      <li v-for="entry in orders.history" :key="entry.id">
        <RouterLink :to="`/pedidos/${entry.id}`" class="block">
          <Card class="transition-colors hover:bg-muted/50">
            <CardContent class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-semibold">{{ entry.order_number }}</span>
              <span class="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{{ orderStatusLabel(entry.status) }}</Badge>
                <span class="font-semibold">{{ formatAmount(entry.total_amount) }}</span>
              </span>
            </CardContent>
          </Card>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>
