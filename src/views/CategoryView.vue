<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { RotateCcw } from 'lucide-vue-next'

import ProductCard from '../components/ProductCard.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  <main class="space-y-6">
    <div v-if="invalidId" class="space-y-2">
      <h1 class="text-2xl font-bold tracking-tight">Categoría no válida</h1>
      <p class="text-muted-foreground text-sm">
        <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
          >Ver catálogo</RouterLink
        >
      </p>
    </div>
    <template v-else>
      <div v-if="catalog.loading" class="space-y-4">
        <Skeleton class="h-8 w-48" />
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton v-for="n in 6" :key="n" class="h-64 w-full rounded-xl" />
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
      <template v-else-if="catalog.category !== null">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ catalog.category.name }}</h1>
          <p v-if="catalog.category.description" class="text-muted-foreground text-sm">
            {{ catalog.category.description }}
          </p>
        </div>
        <section
          v-if="catalog.subcategories.length > 0"
          aria-label="Subcategorías"
          class="flex flex-wrap gap-2"
        >
          <RouterLink
            v-for="child in catalog.subcategories"
            :key="child.id"
            :to="`/categoria/${child.id}`"
          >
            <Badge variant="secondary" class="hover:bg-secondary/80">{{ child.name }}</Badge>
          </RouterLink>
        </section>
        <p v-if="catalog.categoryProducts.length === 0" class="text-muted-foreground text-sm">
          Sin productos en esta categoría.
          <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
            >Ver catálogo</RouterLink
          >
        </p>
        <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="item in catalog.categoryProducts" :key="item.id" class="h-full">
            <ProductCard :product="item" />
          </li>
        </ul>
      </template>
    </template>
  </main>
</template>
