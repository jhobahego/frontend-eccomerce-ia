<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { SearchX } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
</script>

<template>
  <main class="mx-auto w-full max-w-md py-8">
    <Card>
      <CardContent class="flex flex-col items-center gap-2 py-10 text-center">
        <SearchX class="text-muted-foreground size-10" aria-hidden="true" />
        <h1 class="text-2xl font-bold tracking-tight">Página no encontrada</h1>
        <p class="text-muted-foreground text-sm">La página que buscas no existe.</p>
        <p>
          <Button type="button" as-child><RouterLink to="/">Volver al inicio</RouterLink></Button>
        </p>
      </CardContent>
    </Card>
  </main>
</template>
