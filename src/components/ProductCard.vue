<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { formatAmount } from '../api/money'
import type { Product } from '../api/types'

const props = defineProps<{ product: Product }>()

const cover = computed(() => {
  const images = props.product.images
  if (images === null || images === undefined || images.length === 0) {
    return null
  }
  return images[0] ?? null
})
</script>

<template>
  <article>
    <h3 data-testid="product-name">
      <RouterLink :to="`/producto/${props.product.slug}`">{{ props.product.name }}</RouterLink>
    </h3>
    <p>{{ formatAmount(props.product.current_price) }}</p>
    <p>{{ props.product.is_in_stock ? 'Disponible' : 'No disponible' }}</p>
    <img v-if="cover !== null" :src="cover" :alt="props.product.name" />
    <p v-else>Sin imagen</p>
  </article>
</template>
