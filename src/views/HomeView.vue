<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, PackageSearch, RotateCcw } from 'lucide-vue-next'

import ProductCard from '../components/ProductCard.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  <main class="space-y-8">
    <section
      class="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground"
    >
      <div class="space-y-4 p-8 sm:p-10">
        <p class="text-xs font-semibold tracking-widest uppercase opacity-80">
          Tienda online · Asistente IA 24/7
        </p>
        <h1 class="max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">Inicio</h1>
        <p class="text-primary-foreground/80 max-w-xl text-sm sm:text-base">
          Explora destacados y categorías. Compra manual completa: catálogo, cesta y pedidos sin
          depender del asistente.
        </p>
        <div class="flex flex-wrap gap-2">
          <Button variant="secondary" size="lg" as-child>
            <RouterLink to="/catalogo">
              Ver catálogo
              <ArrowRight class="size-4" aria-hidden="true" />
            </RouterLink>
          </Button>
          <Button
            variant="outline"
            size="lg"
            as-child
            class="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-white/10 hover:text-primary-foreground"
          >
            <RouterLink to="/cesta"> Ir a la cesta </RouterLink>
          </Button>
        </div>
      </div>
    </section>

    <div v-if="catalog.loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      <Skeleton v-for="n in 6" :key="n" class="h-64 w-full rounded-xl" />
    </div>
    <Alert v-else-if="catalog.error !== null" variant="destructive">
      <AlertTitle>Error al cargar</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ catalog.error.message }}
        <Button type="button" size="sm" variant="outline" @click="reload()">
          <RotateCcw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <template v-else>
      <section aria-labelledby="featured-heading" class="space-y-4">
        <div class="flex items-end justify-between">
          <div>
            <h2 id="featured-heading" class="text-xl font-semibold tracking-tight">Destacados</h2>
            <p class="text-muted-foreground text-sm">Selección de la tienda</p>
          </div>
          <RouterLink to="/catalogo" class="text-primary text-sm font-medium hover:underline"
            >Ver todo</RouterLink
          >
        </div>
        <p
          v-if="catalog.featured.length === 0"
          class="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <PackageSearch class="size-4" aria-hidden="true" />
          Aún no hay destacados.
        </p>
        <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="item in catalog.featured" :key="item.id" class="h-full">
            <ProductCard :product="item" />
          </li>
        </ul>
      </section>
      <section aria-labelledby="categories-heading" class="space-y-4">
        <h2 id="categories-heading" class="text-xl font-semibold tracking-tight">Categorías</h2>
        <p v-if="catalog.tree.length === 0" class="text-muted-foreground text-sm">
          Aún no hay categorías.
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="node in catalog.tree" :key="node.id">
            <Card class="transition-colors hover:bg-muted/50">
              <CardContent class="space-y-2">
                <RouterLink :to="`/categoria/${node.id}`" class="font-semibold hover:underline">{{
                  node.name
                }}</RouterLink>
                <ul v-if="node.children.length > 0" class="flex flex-wrap gap-1.5">
                  <li v-for="child in node.children" :key="child.id">
                    <RouterLink
                      :to="`/categoria/${child.id}`"
                      class="bg-secondary text-secondary-foreground inline-flex rounded-full px-2.5 py-0.5 text-xs hover:underline"
                      >{{ child.name }}</RouterLink
                    >
                  </li>
                </ul>
              </CardContent>
            </Card>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>
