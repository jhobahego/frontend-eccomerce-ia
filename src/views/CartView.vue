<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Minus, Plus, RotateCcw, ShoppingBag, Trash2 } from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import { useCartStore } from '../stores/cart'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const cart = useCartStore()

function reload(): void {
  void cart.loadCart()
}

function decrease(itemId: number, quantity: number): void {
  void cart.updateLine(itemId, quantity - 1)
}

function increase(itemId: number, quantity: number): void {
  void cart.updateLine(itemId, quantity + 1)
}

function remove(itemId: number): void {
  void cart.removeLine(itemId)
}

function clear(): void {
  void cart.clearCart()
}

onMounted(() => {
  void cart.loadCart()
})
</script>

<template>
  <main class="mx-auto w-full max-w-3xl space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Cesta</h1>
      <p class="text-muted-foreground text-sm">Revisa cantidades antes de confirmar tu pedido.</p>
    </div>

    <div v-if="cart.loading" class="space-y-3">
      <Skeleton class="h-20 w-full rounded-xl" />
      <Skeleton class="h-20 w-full rounded-xl" />
      <p class="sr-only">Cargando…</p>
    </div>
    <Alert v-else-if="cart.error !== null" variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ cart.error.message }}
        <Button type="button" size="sm" variant="outline" @click="reload()">
          <RotateCcw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <Card v-else-if="cart.cart === null || cart.cart.items.length === 0">
      <CardContent class="flex flex-col items-center gap-2 py-10 text-center">
        <ShoppingBag class="text-muted-foreground size-8" aria-hidden="true" />
        <p class="font-medium">Tu cesta está vacía.</p>
        <p class="text-muted-foreground text-sm">
          Empieza por el
          <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
            >catálogo</RouterLink
          >.
        </p>
      </CardContent>
    </Card>
    <template v-else>
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">{{ cart.cart.total_items }} artículos</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <ul class="divide-y">
            <li
              v-for="line in cart.cart.items"
              :key="line.id"
              class="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="space-y-0.5">
                <h2 class="font-semibold">{{ line.product.name }}</h2>
                <p class="text-muted-foreground text-sm">
                  {{ formatAmount(line.unit_price) }} cada uno
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    :aria-label="`Quitar uno de ${line.product.name}`"
                    @click="decrease(line.id, line.quantity)"
                  >
                    <Minus class="size-4" aria-hidden="true" />
                  </Button>
                  <span class="w-8 text-center text-sm font-semibold" aria-live="polite">{{
                    line.quantity
                  }}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    :aria-label="`Añadir uno de ${line.product.name}`"
                    @click="increase(line.id, line.quantity)"
                  >
                    <Plus class="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <p class="min-w-24 text-sm font-semibold">
                  Subtotal: {{ formatAmount(line.subtotal) }}
                </p>
                <Button type="button" variant="ghost" size="sm" @click="remove(line.id)">
                  <Trash2 class="size-4" aria-hidden="true" />
                  Quitar
                </Button>
              </div>
            </li>
          </ul>
          <Separator />
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="font-semibold">
              {{ cart.cart.total_items }} artículos — Total:
              {{ formatAmount(cart.cart.total_amount) }}
            </p>
            <div class="flex gap-2">
              <Button type="button" variant="outline" @click="clear()">Vaciar cesta</Button>
              <Button type="button" as-child>
                <RouterLink to="/checkout">Confirmar pedido</RouterLink>
              </Button>
            </div>
          </div>
          <p class="text-sm">
            <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
              >Seguir comprando</RouterLink
            >
          </p>
        </CardContent>
      </Card>
    </template>
  </main>
</template>
