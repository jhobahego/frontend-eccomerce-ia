<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ImageOff, RotateCcw, ShoppingCart } from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import { useCartStore } from '../stores/cart'
import { useCatalogStore } from '../stores/catalog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const catalog = useCatalogStore()
const cart = useCartStore()
const route = useRoute()

const quantity = ref(1)
const adding = ref(false)
const addFailed = ref(false)

const cover = computed(() => {
  const images = catalog.product?.images
  if (images === null || images === undefined || images.length === 0) {
    return null
  }
  return images[0] ?? null
})

function load(): void {
  const slug = route.params.slug
  if (typeof slug !== 'string' || slug === '') {
    return
  }
  void catalog.loadProduct(slug)
}

async function onAdd(): Promise<void> {
  if (adding.value || catalog.product === null) {
    return
  }
  adding.value = true
  addFailed.value = false
  const wanted = Math.max(1, Math.floor(quantity.value))
  quantity.value = wanted
  await cart.addItem(catalog.product.id, wanted)
  addFailed.value = cart.error !== null
  adding.value = false
}

onMounted(load)
watch(
  () => route.params.slug,
  () => {
    load()
  },
)
</script>

<template>
  <main class="space-y-6">
    <div v-if="catalog.loading" class="grid gap-6 lg:grid-cols-2">
      <Skeleton class="aspect-square w-full rounded-2xl" />
      <div class="space-y-3">
        <Skeleton class="h-8 w-2/3" />
        <Skeleton class="h-6 w-1/3" />
        <Skeleton class="h-20 w-full" />
      </div>
      <p class="sr-only">Cargando…</p>
    </div>
    <Alert v-else-if="catalog.error !== null" variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ catalog.error.message }}
        <Button type="button" size="sm" variant="outline" @click="load()">
          <RotateCcw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <template v-else-if="catalog.product !== null">
      <div class="grid gap-6 lg:grid-cols-2">
        <Card class="overflow-hidden py-0">
          <div class="bg-muted aspect-square overflow-hidden">
            <img
              v-if="cover !== null"
              :src="cover"
              :alt="catalog.product.name"
              class="h-full w-full object-cover"
            />
            <p
              v-else
              class="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2 text-sm"
            >
              <ImageOff class="size-8" aria-hidden="true" />
              Sin imagen
            </p>
          </div>
        </Card>
        <div class="space-y-4">
          <div class="space-y-2">
            <Badge :variant="catalog.product.is_in_stock ? 'secondary' : 'destructive'">
              {{ catalog.product.is_in_stock ? 'Disponible' : 'No disponible' }}
            </Badge>
            <h1 class="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {{ catalog.product.name }}
            </h1>
            <p class="flex items-baseline gap-2">
              <span class="text-2xl font-bold">{{
                formatAmount(catalog.product.current_price)
              }}</span>
              <s v-if="catalog.product.sale_price !== null" class="text-muted-foreground text-sm">{{
                formatAmount(catalog.product.price)
              }}</s>
            </p>
            <p
              v-if="catalog.product.description !== null"
              class="text-muted-foreground text-sm leading-relaxed"
            >
              {{ catalog.product.description }}
            </p>
            <p v-if="catalog.product.category !== null" class="text-sm">
              <RouterLink
                :to="`/categoria/${catalog.product.category.id}`"
                class="text-primary font-medium hover:underline"
              >
                {{ catalog.product.category.name }}
              </RouterLink>
            </p>
          </div>
          <Card>
            <CardContent class="flex flex-wrap items-end gap-3">
              <div class="grid gap-1.5">
                <Label for="product-quantity">Cantidad</Label>
                <Input
                  id="product-quantity"
                  v-model.number="quantity"
                  type="number"
                  min="1"
                  class="w-24"
                />
              </div>
              <Button type="button" :disabled="adding" @click="onAdd" class="flex-1 sm:flex-none">
                <ShoppingCart class="size-4" aria-hidden="true" />
                {{ adding ? 'Añadiendo…' : 'Añadir a la cesta' }}
              </Button>
              <p v-if="addFailed" role="alert" class="text-destructive w-full text-sm">
                No se pudo añadir. Reintenta.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <section
        v-if="catalog.similar.length > 0"
        aria-labelledby="similar-heading"
        class="space-y-3"
      >
        <h2 id="similar-heading" class="text-lg font-semibold tracking-tight">Similares</h2>
        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="item in catalog.similar" :key="item.id">
            <RouterLink
              :to="`/producto/${item.slug}`"
              class="block rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              {{ item.name }}
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>
    <Card v-else>
      <CardContent class="py-8 text-center text-sm">
        Producto no encontrado.
        <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
          >Ver catálogo</RouterLink
        >
      </CardContent>
    </Card>
  </main>
</template>
