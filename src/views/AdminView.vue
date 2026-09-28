<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { FolderTree, Package, ShoppingCart, Users } from 'lucide-vue-next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
</script>

<template>
  <main class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Administración</h1>
      <p class="text-muted-foreground text-sm">Gestiona catálogo, pedidos y usuarios.</p>
    </div>
    <ul class="grid gap-4 sm:grid-cols-2">
      <li>
        <RouterLink to="/admin/categorias" class="block">
          <Card class="transition-colors hover:bg-muted/50">
            <CardHeader class="flex flex-row items-center gap-3 space-y-0">
              <span
                class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg"
              >
                <FolderTree class="size-4" aria-hidden="true" />
              </span>
              <CardTitle class="text-base">Categorías</CardTitle>
            </CardHeader>
            <CardContent class="text-muted-foreground text-sm"
              >Crear, editar y retirar categorías.</CardContent
            >
          </Card>
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/admin/productos" class="block">
          <Card class="transition-colors hover:bg-muted/50">
            <CardHeader class="flex flex-row items-center gap-3 space-y-0">
              <span
                class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg"
              >
                <Package class="size-4" aria-hidden="true" />
              </span>
              <CardTitle class="text-base">Productos</CardTitle>
            </CardHeader>
            <CardContent class="text-muted-foreground text-sm"
              >Altas, stock y destacados.</CardContent
            >
          </Card>
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/admin/pedidos" class="block">
          <Card class="transition-colors hover:bg-muted/50">
            <CardHeader class="flex flex-row items-center gap-3 space-y-0">
              <span
                class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg"
              >
                <ShoppingCart class="size-4" aria-hidden="true" />
              </span>
              <CardTitle class="text-base">Pedidos</CardTitle>
            </CardHeader>
            <CardContent class="text-muted-foreground text-sm">Estados y pagos.</CardContent>
          </Card>
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/admin/usuarios" class="block">
          <Card class="transition-colors hover:bg-muted/50">
            <CardHeader class="flex flex-row items-center gap-3 space-y-0">
              <span
                class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg"
              >
                <Users class="size-4" aria-hidden="true" />
              </span>
              <CardTitle class="text-base">Usuarios</CardTitle>
            </CardHeader>
            <CardContent class="text-muted-foreground text-sm"
              >Clientes y administración.</CardContent
            >
          </Card>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>
