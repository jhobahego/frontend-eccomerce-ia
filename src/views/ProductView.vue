<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { formatAmount } from '../api/money'
import { useCartStore } from '../stores/cart'
import { useCatalogStore } from '../stores/catalog'

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
  <main>
    <p v-if="catalog.loading">Cargando…</p>
    <p v-else-if="catalog.error !== null" role="alert">
      {{ catalog.error.message }}
      <button type="button" @click="load()">Reintentar</button>
    </p>
    <template v-else-if="catalog.product !== null">
      <h1>{{ catalog.product.name }}</h1>
      <p>
        {{ formatAmount(catalog.product.current_price) }}
        <s v-if="catalog.product.sale_price !== null">{{ formatAmount(catalog.product.price) }}</s>
      </p>
      <p>{{ catalog.product.is_in_stock ? 'Disponible' : 'No disponible' }}</p>
      <p v-if="catalog.product.description !== null">{{ catalog.product.description }}</p>
      <div>
        <label for="product-quantity">Cantidad</label>
        <input id="product-quantity" v-model.number="quantity" type="number" min="1" />
        <button type="button" :disabled="adding" @click="onAdd">Añadir a la cesta</button>
        <p v-if="addFailed" role="alert">No se pudo añadir. Reintenta.</p>
      </div>
      <img v-if="cover !== null" :src="cover" :alt="catalog.product.name" />
      <p v-else>Sin imagen</p>
      <p v-if="catalog.product.category !== null">
        <RouterLink :to="`/categoria/${catalog.product.category.id}`">
          {{ catalog.product.category.name }}
        </RouterLink>
      </p>
      <section v-if="catalog.similar.length > 0" aria-labelledby="similar-heading">
        <h2 id="similar-heading">Similares</h2>
        <ul>
          <li v-for="item in catalog.similar" :key="item.id">
            <RouterLink :to="`/producto/${item.slug}`">{{ item.name }}</RouterLink>
          </li>
        </ul>
      </section>
    </template>
    <p v-else>
      Producto no encontrado.
      <RouterLink to="/catalogo">Ver catálogo</RouterLink>
    </p>
  </main>
</template>
