<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import ProductCard from '../components/ProductCard.vue'
import { useCatalogStore } from '../stores/catalog'

const catalog = useCatalogStore()

function reload(): void {
  void catalog.loadHome()
}

onMounted(() => {
  void catalog.loadHome()
})
</script>

<template>
  <main>
    <h1>Inicio</h1>
    <p v-if="catalog.loading">Cargando…</p>
    <p v-else-if="catalog.error !== null" role="alert">
      {{ catalog.error.message }}
      <button type="button" @click="reload()">Reintentar</button>
    </p>
    <template v-else>
      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading">Destacados</h2>
        <p v-if="catalog.featured.length === 0">Aún no hay destacados.</p>
        <ul v-else>
          <li v-for="item in catalog.featured" :key="item.id">
            <ProductCard :product="item" />
          </li>
        </ul>
      </section>
      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading">Categorías</h2>
        <p v-if="catalog.tree.length === 0">Aún no hay categorías.</p>
        <ul v-else>
          <li v-for="node in catalog.tree" :key="node.id">
            <RouterLink :to="`/categoria/${node.id}`">{{ node.name }}</RouterLink>
            <ul v-if="node.children.length > 0">
              <li v-for="child in node.children" :key="child.id">
                <RouterLink :to="`/categoria/${child.id}`">{{ child.name }}</RouterLink>
              </li>
            </ul>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>
