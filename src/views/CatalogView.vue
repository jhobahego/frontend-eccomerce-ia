<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next'

import {
  CATALOG_PAGE_SIZE,
  filtersFromRouteQuery,
  filtersToRouteQuery,
  isValidPriceInput,
  type ProductSearchFilters,
  type ProductSort,
} from '../api/catalog'
import ProductCard from '../components/ProductCard.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
  <main class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Catálogo</h1>
      <p class="text-muted-foreground text-sm">Busca, filtra y ordena el catálogo completo.</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card class="h-fit lg:sticky lg:top-20">
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-base">
            <SlidersHorizontal class="size-4" aria-hidden="true" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form class="grid gap-4" @submit.prevent="applySearch">
            <div class="grid gap-1.5">
              <Label for="catalog-query">Buscar</Label>
              <Input
                id="catalog-query"
                v-model="query"
                type="search"
                name="query"
                placeholder="Nombre, SKU…"
              />
            </div>
            <div class="grid gap-1.5">
              <Label for="catalog-category">Categoría</Label>
              <select
                id="catalog-category"
                v-model="categoryId"
                name="category"
                class="border-input bg-transparent h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Todas</option>
                <option
                  v-for="node in catalog.filterCategories"
                  :key="node.id"
                  :value="String(node.id)"
                >
                  {{ node.name }}
                </option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="grid gap-1.5">
                <Label for="catalog-min">Mínimo</Label>
                <Input
                  id="catalog-min"
                  v-model="minPrice"
                  type="text"
                  name="min"
                  inputmode="decimal"
                  placeholder="0.00"
                  :aria-invalid="priceErrors['min'] !== undefined"
                  :aria-describedby="
                    priceErrors['min'] !== undefined ? 'catalog-min-error' : undefined
                  "
                />
                <p
                  v-if="priceErrors['min'] !== undefined"
                  id="catalog-min-error"
                  role="alert"
                  class="text-destructive text-xs"
                >
                  {{ priceErrors['min'] }}
                </p>
              </div>
              <div class="grid gap-1.5">
                <Label for="catalog-max">Máximo</Label>
                <Input
                  id="catalog-max"
                  v-model="maxPrice"
                  type="text"
                  name="max"
                  inputmode="decimal"
                  placeholder="99.99"
                  :aria-invalid="priceErrors['max'] !== undefined"
                  :aria-describedby="
                    priceErrors['max'] !== undefined ? 'catalog-max-error' : undefined
                  "
                />
                <p
                  v-if="priceErrors['max'] !== undefined"
                  id="catalog-max-error"
                  role="alert"
                  class="text-destructive text-xs"
                >
                  {{ priceErrors['max'] }}
                </p>
              </div>
            </div>
            <div class="grid gap-2.5">
              <label for="catalog-featured" class="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox id="catalog-featured" v-model="onlyFeatured" />
                Solo destacados
              </label>
              <label for="catalog-stock" class="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox id="catalog-stock" v-model="onlyInStock" />
                Solo disponibles
              </label>
            </div>
            <div class="grid gap-1.5">
              <Label for="catalog-sort">Orden</Label>
              <select
                id="catalog-sort"
                v-model="sort"
                name="sort"
                class="border-input bg-transparent h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                @change="applySearch"
              >
                <option value="novelty">Novedad</option>
                <option value="price-asc">Precio: de menor a mayor</option>
                <option value="price-desc">Precio: de mayor a menor</option>
              </select>
            </div>
            <div class="flex gap-2">
              <Button type="submit" class="flex-1">
                <Search class="size-4" aria-hidden="true" />
                Buscar
              </Button>
              <Button
                v-if="hasActiveFilters()"
                type="button"
                variant="outline"
                @click="clearFilters"
                >Quitar filtros</Button
              >
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-label="Resultados" class="space-y-4">
        <div
          v-if="catalog.loading"
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-hidden="true"
        >
          <Skeleton v-for="n in 6" :key="n" class="h-64 w-full rounded-xl" />
          <p class="sr-only">Cargando…</p>
        </div>
        <Alert v-else-if="catalog.error !== null" variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription class="flex flex-wrap items-center gap-3">
            {{ catalog.error.message }}
            <Button type="button" size="sm" variant="outline" @click="retry()">
              <RotateCcw class="size-4" aria-hidden="true" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
        <template v-else>
          <p class="text-muted-foreground text-sm">{{ catalog.page.items.length }} productos</p>
          <Card v-if="catalog.page.items.length === 0">
            <CardContent class="py-8 text-center text-sm">
              Sin resultados para estos filtros.
              <div class="mt-3">
                <Button type="button" variant="outline" @click="clearFilters"
                  >Ver todo el catálogo</Button
                >
              </div>
            </CardContent>
          </Card>
          <ul v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <li v-for="item in catalog.page.items" :key="item.id" class="h-full">
              <ProductCard :product="item" />
            </li>
          </ul>
          <div class="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              :disabled="catalog.page.skip === 0"
              @click="previousPage"
            >
              Anterior
            </Button>
            <Button type="button" variant="outline" :disabled="!catalog.hasMore" @click="nextPage"
              >Siguiente</Button
            >
          </div>
        </template>
      </section>
    </div>
  </main>
</template>
