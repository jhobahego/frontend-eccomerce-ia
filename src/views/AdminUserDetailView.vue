<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

import { useAdminStore } from '../stores/admin'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const admin = useAdminStore()
const route = useRoute()

function currentId(): number | null {
  const id = Number(route.params.id)
  return Number.isInteger(id) ? id : null
}

function load(): void {
  const id = currentId()
  if (id !== null) {
    void admin.loadUserDetail(id)
  }
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
  <main class="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
    <p>
      <RouterLink
        to="/admin/usuarios"
        class="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
      >
        <ArrowLeft class="size-4" aria-hidden="true" />
        Volver a usuarios
      </RouterLink>
    </p>
    <p v-if="admin.usersLoading" class="text-sm text-muted-foreground">Cargando…</p>
    <Alert v-else-if="admin.error !== null" variant="destructive">
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ admin.error.message }}
        <Button type="button" variant="outline" size="sm" @click="load()">
          <RefreshCw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <Card v-else-if="admin.selectedUser !== null">
      <CardHeader class="space-y-2">
        <CardTitle>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ admin.selectedUser.username }}
          </h1>
        </CardTitle>
        <div>
          <Badge variant="secondary">{{
            admin.selectedUser.is_superuser ? 'Administración' : 'Cliente'
          }}</Badge>
        </div>
      </CardHeader>
      <CardContent class="space-y-1">
        <p class="text-sm text-muted-foreground">{{ admin.selectedUser.email }}</p>
        <p class="text-sm">
          {{ admin.selectedUser.first_name }} {{ admin.selectedUser.last_name }}
        </p>
      </CardContent>
    </Card>
    <p v-else class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      Usuario no encontrado.
    </p>
  </main>
</template>
