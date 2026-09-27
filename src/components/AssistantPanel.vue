<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * Honest AI shell (T011). A dialog with fixed copy: the assistant is not
 * available in v1 and the panel offers manual paths instead. Deliberately no
 * text input — a chat box would promise answers this frontend cannot give.
 */
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  dialog.value?.focus()
})
</script>

<template>
  <div
    ref="dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="assistant-heading"
    tabindex="-1"
    @keydown="onKeydown"
  >
    <h2 id="assistant-heading">Asistente</h2>
    <p>El asistente aún no está disponible. Estamos preparando la ayuda automática.</p>
    <p>Mientras tanto puedes:</p>
    <ul>
      <li><RouterLink to="/catalogo">Buscar en el catálogo</RouterLink></li>
      <li><RouterLink to="/cesta">Ver tu cesta</RouterLink></li>
      <li><RouterLink to="/cuenta">Entrar en tu cuenta</RouterLink></li>
    </ul>
    <button type="button" @click="emit('close')">Cerrar</button>
  </div>
</template>
