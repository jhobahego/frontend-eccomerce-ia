<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Bot, X } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Honest AI shell (T011). A dialog with fixed copy: the assistant is not
 * available in v1 and the panel offers manual paths instead. Deliberately no
 * text input — a chat box would promise answers this frontend cannot give.
 */
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | { $el?: unknown } | null>(null)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  const el = dialog.value
  if (el instanceof HTMLElement) {
    el.focus()
  } else if (
    el !== null &&
    typeof el === 'object' &&
    '$el' in el &&
    el.$el instanceof HTMLElement
  ) {
    el.$el.focus()
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    @keydown="onKeydown"
  >
    <div class="fixed inset-0 bg-black/40" aria-hidden="true" @click="emit('close')" />
    <Card
      ref="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-heading"
      tabindex="-1"
      class="relative w-full max-w-md shadow-xl"
    >
      <CardHeader class="flex flex-row items-center justify-between space-y-0">
        <CardTitle id="assistant-heading" class="flex items-center gap-2">
          <span
            class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg"
          >
            <Bot class="size-4" aria-hidden="true" />
          </span>
          Asistente
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          @click="emit('close')"
          aria-label="Cerrar asistente"
        >
          <X class="size-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent class="space-y-3 text-sm">
        <p>El asistente aún no está disponible. Estamos preparando la ayuda automática.</p>
        <p class="text-muted-foreground">Mientras tanto puedes:</p>
        <ul class="grid gap-2">
          <li>
            <RouterLink to="/catalogo" class="text-primary font-medium hover:underline"
              >Buscar en el catálogo</RouterLink
            >
          </li>
          <li>
            <RouterLink to="/cesta" class="text-primary font-medium hover:underline"
              >Ver tu cesta</RouterLink
            >
          </li>
          <li>
            <RouterLink to="/cuenta" class="text-primary font-medium hover:underline"
              >Entrar en tu cuenta</RouterLink
            >
          </li>
        </ul>
        <Button type="button" variant="outline" class="w-full" @click="emit('close')"
          >Cerrar</Button
        >
      </CardContent>
    </Card>
  </div>
</template>
