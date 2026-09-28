<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ImageOff, ShoppingCart } from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import type { Product } from '../api/types'
import { useCartStore } from '../stores/cart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

const props = defineProps<{ product: Product }>()

const cart = useCartStore()
const adding = ref(false)
const addFailed = ref(false)

const cover = computed(() => {
  const images = props.product.images
  if (images === null || images === undefined || images.length === 0) {
    return null
  }
  return images[0] ?? null
})

async function onAdd(): Promise<void> {
  if (adding.value) {
    return
  }
  adding.value = true
  addFailed.value = false
  await cart.addItem(props.product.id, 1)
  addFailed.value = cart.error !== null
  adding.value = false
}
</script>

<template>
  <Card class="group flex h-full flex-col overflow-hidden py-0">
    <div class="bg-muted relative aspect-[4/3] overflow-hidden">
      <img
        v-if="cover !== null"
        :src="cover"
        :alt="props.product.name"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <p
        v-else
        class="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2 text-sm"
      >
        <ImageOff class="size-6" aria-hidden="true" />
        Sin imagen
      </p>
      <Badge
        :variant="props.product.is_in_stock ? 'secondary' : 'destructive'"
        class="absolute top-2 left-2"
      >
        {{ props.product.is_in_stock ? 'Disponible' : 'No disponible' }}
      </Badge>
    </div>
    <CardContent class="flex flex-1 flex-col gap-2 pt-4">
      <!-- h2 (not h3): cards sit directly under each view's h1, and skipping a
        level trips axe `heading-order` (T014). Sections keep their own h2. -->
      <h2 data-testid="product-name" class="line-clamp-2 text-base leading-tight font-semibold">
        <RouterLink :to="`/producto/${props.product.slug}`" class="hover:underline">
          {{ props.product.name }}
        </RouterLink>
      </h2>
      <p class="text-lg font-bold tracking-tight">
        {{ formatAmount(props.product.current_price) }}
      </p>
      <p v-if="addFailed" role="alert" class="text-destructive text-sm">
        No se pudo añadir. Reintenta.
      </p>
    </CardContent>
    <CardFooter class="pt-0">
      <Button type="button" class="w-full" :disabled="adding" @click="onAdd">
        <ShoppingCart class="size-4" aria-hidden="true" />
        {{ adding ? 'Añadiendo…' : 'Añadir a la cesta' }}
      </Button>
    </CardFooter>
  </Card>
</template>
