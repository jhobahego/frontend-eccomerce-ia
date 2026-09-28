<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()

const label = computed(() => (isDark.value ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'))
</script>

<template>
  <Button
    variant="ghost"
    size="icon-sm"
    type="button"
    :aria-label="label"
    :aria-pressed="isDark"
    title="Cambiar tema"
    @click="toggleTheme()"
  >
    <Sun v-if="isDark" class="size-4" aria-hidden="true" />
    <Moon v-else class="size-4" aria-hidden="true" />
  </Button>
</template>
