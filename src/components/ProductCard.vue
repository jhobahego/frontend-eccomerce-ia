<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { formatAmount } from '../api/money'
import type { Product } from '../api/types'
import { useCartStore } from '../stores/cart'

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
  <article>
    <!-- h2 (not h3): cards sit directly under each view's h1, and skipping a
      level trips axe `heading-order` (T014). Sections keep their own h2. -->
    <h2 data-testid="product-name">
      <RouterLink :to="`/producto/${props.product.slug}`">{{ props.product.name }}</RouterLink>
    </h2>
    <p>{{ formatAmount(props.product.current_price) }}</p>
    <p>{{ props.product.is_in_stock ? 'Disponible' : 'No disponible' }}</p>
    <img v-if="cover !== null" :src="cover" :alt="props.product.name" />
    <p v-else>Sin imagen</p>
    <button type="button" :disabled="adding" @click="onAdd">Añadir a la cesta</button>
    <p v-if="addFailed" role="alert">No se pudo añadir. Reintenta.</p>
  </article>
</template>
