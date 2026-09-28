<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  CATALOG_PAGE_SIZE,
  filtersFromRouteQuery,
  filtersToRouteQuery,
  isValidPriceInput,
  type ProductSearchFilters,
  type ProductSort,
} from '../api/catalog'
import ProductCard from '../components/ProductCard.vue'
import { useCatalogStore } from '../stores/catalog'

const catalog = useCatalogStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const categoryId = ref('')
const minPrice = ref('')
const maxPrice = ref('')
const onlyFeatured = ref(false)
const onlyInStock = ref(false)
const sort = ref<ProductSort>('novelty')
const priceErrors = ref<Record<string, string>>({})

function readFilters(): ProductSearchFilters {
  const parsed = filtersFromRouteQuery(
    route.query as Record<string, string | string[] | null | undefined>,
  )
  query.value = parsed.query ?? ''
  categoryId.value = parsed.categoryId === undefined ? '' : String(parsed.categoryId)
  minPrice.value = parsed.minPrice ?? ''
  maxPrice.value = parsed.maxPrice ?? ''
  onlyFeatured.value = parsed.isFeatured === true
  onlyInStock.value = parsed.inStock === true
  sort.value = parsed.sort ?? 'novelty'
  return parsed
}

function currentFilters(skip: number): ProductSearchFilters {
  const filters: ProductSearchFilters = { skip, limit: CATALOG_PAGE_SIZE }
  const text = query.value.trim()
  if (text !== '') {
    filters.query = text
  }
  if (categoryId.value !== '') {
    const id = Number(categoryId.value)
    if (Number.isInteger(id)) {
      filters.categoryId = id
    }
  }
  if (minPrice.value.trim() !== '') {
    filters.minPrice = minPrice.value.trim()
  }
  if (maxPrice.value.trim() !== '') {
    filters.maxPrice = maxPrice.value.trim()
  }
  if (onlyFeatured.value) {
    filters.isFeatured = true
  }
  if (onlyInStock.value) {
    filters.inStock = true
  }
  if (sort.value !== 'novelty') {
    filters.sort = sort.value
  }
  return filters
}

function hasActiveFilters(): boolean {
  return Object.keys(filtersToRouteQuery(currentFilters(0))).length > 0
}

async function applySearch(): Promise<void> {
  // Malformed prices never reach the server silently (branch review): they
  // stay next to their field until fixed, and no search fires meanwhile.
  const invalid: Record<string, string> = {}
  if (!isValidPriceInput(minPrice.value)) {
    invalid['min'] = 'Precio con hasta dos decimales.'
  }
  if (!isValidPriceInput(maxPrice.value)) {
    invalid['max'] = 'Precio con hasta dos decimales.'
  }
  priceErrors.value = invalid
  if (Object.keys(invalid).length > 0) {
    return
  }
  const filters = currentFilters(0)
  await router.replace({ name: 'catalog', query: filtersToRouteQuery(filters) })
  await catalog.search(filters)
}

async function clearFilters(): Promise<void> {
  query.value = ''
  categoryId.value = ''
  minPrice.value = ''
  maxPrice.value = ''
  onlyFeatured.value = false
  onlyInStock.value = false
  sort.value = 'novelty'
  await router.replace({ name: 'catalog', query: {} })
  await catalog.search({ skip: 0, limit: CATALOG_PAGE_SIZE })
}

async function previousPage(): Promise<void> {
  await turnTo(-1)
}

async function nextPage(): Promise<void> {
  await turnTo(1)
}

/** Paging moves the served window and syncs it back to the URL (branch review). */
async function turnTo(direction: 1 | -1): Promise<void> {
  await catalog.turnPage(direction)
  await router.replace({
    name: 'catalog',
    query: filtersToRouteQuery(currentFilters(catalog.page.skip)),
  })
}

function retry(): void {
  void catalog.search(currentFilters(catalog.page.skip))
}

onMounted(() => {
  void (async () => {
    const parsed = readFilters()
    await catalog.ensureFilterCategories()
    await catalog.search(currentFilters(parsed.skip ?? 0))
  })()
})
</script>

<template>
  <main>
    <h1>Catálogo</h1>
    <form @submit.prevent="applySearch">
      <div>
        <label for="catalog-query">Buscar</label>
        <input id="catalog-query" v-model="query" type="search" name="query" />
      </div>
      <div>
        <label for="catalog-category">Categoría</label>
        <select id="catalog-category" v-model="categoryId" name="category">
          <option value="">Todas</option>
          <option v-for="node in catalog.filterCategories" :key="node.id" :value="String(node.id)">
            {{ node.name }}
          </option>
        </select>
      </div>
      <div>
        <label for="catalog-min">Precio mínimo</label>
        <input
          id="catalog-min"
          v-model="minPrice"
          type="text"
          name="min"
          inputmode="decimal"
          :aria-invalid="priceErrors['min'] !== undefined"
          :aria-describedby="priceErrors['min'] !== undefined ? 'catalog-min-error' : undefined"
        />
        <p v-if="priceErrors['min'] !== undefined" id="catalog-min-error" role="alert">
          {{ priceErrors['min'] }}
        </p>
      </div>
      <div>
        <label for="catalog-max">Precio máximo</label>
        <input
          id="catalog-max"
          v-model="maxPrice"
          type="text"
          name="max"
          inputmode="decimal"
          :aria-invalid="priceErrors['max'] !== undefined"
          :aria-describedby="priceErrors['max'] !== undefined ? 'catalog-max-error' : undefined"
        />
        <p v-if="priceErrors['max'] !== undefined" id="catalog-max-error" role="alert">
          {{ priceErrors['max'] }}
        </p>
      </div>
      <div>
        <input id="catalog-featured" v-model="onlyFeatured" type="checkbox" />
        <label for="catalog-featured">Solo destacados</label>
      </div>
      <div>
        <input id="catalog-stock" v-model="onlyInStock" type="checkbox" />
        <label for="catalog-stock">Solo disponibles</label>
      </div>
      <div>
        <label for="catalog-sort">Orden</label>
        <select id="catalog-sort" v-model="sort" name="sort" @change="applySearch">
          <option value="novelty">Novedad</option>
          <option value="price-asc">Precio: de menor a mayor</option>
          <option value="price-desc">Precio: de mayor a menor</option>
        </select>
      </div>
      <button type="submit">Buscar</button>
      <button v-if="hasActiveFilters()" type="button" @click="clearFilters">Quitar filtros</button>
    </form>

    <p v-if="catalog.loading">Cargando…</p>
    <p v-else-if="catalog.error !== null" role="alert">
      {{ catalog.error.message }}
      <button type="button" @click="retry()">Reintentar</button>
    </p>
    <template v-else>
      <p>{{ catalog.page.items.length }} productos</p>
      <p v-if="catalog.page.items.length === 0">
        Sin resultados para estos filtros.
        <button type="button" @click="clearFilters">Ver todo el catálogo</button>
      </p>
      <ul v-else>
        <li v-for="item in catalog.page.items" :key="item.id">
          <ProductCard :product="item" />
        </li>
      </ul>
      <div>
        <button type="button" :disabled="catalog.page.skip === 0" @click="previousPage">
          Anterior
        </button>
        <button type="button" :disabled="!catalog.hasMore" @click="nextPage">Siguiente</button>
      </div>
    </template>
  </main>
</template>
