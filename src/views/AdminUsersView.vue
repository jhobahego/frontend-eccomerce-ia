<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { RefreshCw, Users } from 'lucide-vue-next'

import { useAdminStore } from '../stores/admin'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const admin = useAdminStore()

function reload(): void {
  void admin.loadUsers()
}

onMounted(() => {
  void admin.loadUsers()
})
</script>

<template>
  <main class="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
    <div class="flex items-center gap-3">
      <span class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
        <Users class="size-4" aria-hidden="true" />
      </span>
      <h1 class="text-2xl font-semibold tracking-tight">Usuarios</h1>
    </div>
    <p v-if="admin.usersLoading" class="text-sm text-muted-foreground">Cargando…</p>
    <Alert v-else-if="admin.error !== null" variant="destructive">
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ admin.error.message }}
        <Button type="button" variant="outline" size="sm" @click="reload()">
          <RefreshCw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <Card v-else>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="user in admin.users" :key="user.id">
              <TableCell>
                <RouterLink
                  :to="`/admin/usuarios/${user.id}`"
                  class="text-primary font-medium hover:underline"
                  >{{ user.username }}</RouterLink
                >
              </TableCell>
              <TableCell class="text-muted-foreground">{{ user.email }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </main>
</template>
