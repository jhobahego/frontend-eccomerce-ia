<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import ProductCard from '../components/ProductCard.vue'
import { useCatalogStore } from '../stores/catalog'

const catalog = useCatalogStore()
const route = useRoute()
const invalidId = ref(false)

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
  void catalog.loadCategory(id)
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
    <p v-if="invalidId">Categoría no válida. <RouterLink to="/catalogo">Ver catálogo</RouterLink></p>
    <template v-else>
      <p v-if="catalog.loading">Cargando…</p>
      <p v-else-if="catalog.error !== null" role="alert">
        {{ catalog.error.message }}
        <button type="button" @click="load()">Reintentar</button>
      </p>
      <template v-else-if="catalog.category !== null">
        <h1>{{ catalog.category.name }}</h1>
        <section v-if="catalog.subcategories.length > 0" aria-label="Subcategorías">
          <ul>
            <li v-for="child in catalog.subcategories" :key="child.id">
              <RouterLink :to="`/categoria/${child.id}`">{{ child.name }}</RouterLink>
            </li>
          </ul>
        </section>
        <p v-if="catalog.categoryProducts.length === 0">
          Sin productos en esta categoría.
          <RouterLink to="/catalogo">Ver catálogo</RouterLink>
        </p>
        <ul v-else>
          <li v-for="item in catalog.categoryProducts" :key="item.id">
            <ProductCard :product="item" />
          </li>
        </ul>
      </template>
    </template>
  </main>
</template>
