<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { Pencil, Plus, RotateCcw, Trash2, TriangleAlert } from 'lucide-vue-next'

import { countCategoryProducts, useAdminStore } from '../stores/admin'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const admin = useAdminStore()

const name = ref('')
const slug = ref('')
const description = ref('')
const parentId = ref('')
const createErrors = ref<Record<string, string>>({})
const editingId = ref<number | null>(null)
const editName = ref('')
const editError = ref<string | null>(null)
/** Category awaiting explicit retire confirmation (T013: only when it holds products). */
const confirmingCategoryId = ref<number | null>(null)
let lastTriggerId: string | null = null

async function create(): Promise<void> {
  const invalid: Record<string, string> = {}
  if (name.value.trim() === '') {
    invalid['name'] = 'El nombre es obligatorio.'
  }
  if (slug.value.trim() === '') {
    invalid['slug'] = 'El slug es obligatorio.'
  }
  createErrors.value = invalid
  if (Object.keys(invalid).length > 0) {
    return
  }
  const parent = parentId.value === '' ? null : Number(parentId.value)
  await admin.createCategory({
    name: name.value.trim(),
    slug: slug.value.trim(),
    description: description.value.trim() === '' ? null : description.value.trim(),
    parent_id: parent !== null && Number.isInteger(parent) ? parent : null,
  })
  if (admin.error === null) {
    name.value = ''
    slug.value = ''
    description.value = ''
    parentId.value = ''
  }
}

function startEdit(id: number, current: string): void {
  editingId.value = id
  editName.value = current
  editError.value = null
}

async function saveEdit(id: number): Promise<void> {
  if (editName.value.trim() === '') {
    editError.value = 'El nombre es obligatorio.'
    return
  }
  await admin.updateCategory(id, { name: editName.value.trim() })
  if (admin.error === null) {
    editingId.value = null
  }
}

function remove(id: number): void {
  void admin.removeCategory(id)
}

function productCount(id: number): number {
  return countCategoryProducts(admin.products, id)
}

function focusDialog(): void {
  void nextTick(() => {
    document.getElementById('retire-category-dialog')?.focus()
  })
}

function focusTrigger(): void {
  if (lastTriggerId !== null) {
    document.getElementById(lastTriggerId)?.focus()
  }
}

/**
 * Retire gate (T013): categories holding products ask explicitly; empty ones
 * keep the direct removal from T010. No business logic here — just the gate.
 */
function askRemove(id: number): void {
  if (productCount(id) === 0) {
    remove(id)
    return
  }
  confirmingCategoryId.value = id
  lastTriggerId = `remove-category-${id}`
  focusDialog()
}

function cancelRemove(): void {
  confirmingCategoryId.value = null
  focusTrigger()
}

function confirmRemove(): void {
  const id = confirmingCategoryId.value
  confirmingCategoryId.value = null
  focusTrigger()
  if (id !== null) {
    remove(id)
  }
}

function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    cancelRemove()
  }
}

function reload(): void {
  void admin.loadAll()
}

onMounted(() => {
  void admin.loadAll()
})
</script>

<template>
  <main class="mx-auto w-full max-w-3xl space-y-6 py-4">
    <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Categorías</h1>
    <div v-if="admin.loading" class="space-y-3">
      <Skeleton class="h-28 w-full rounded-xl" />
      <Skeleton class="h-28 w-full rounded-xl" />
      <p class="text-muted-foreground text-sm">Cargando…</p>
    </div>
    <Alert v-else-if="admin.error !== null" variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription class="flex flex-wrap items-center gap-3">
        {{ admin.error.message }}
        <Button type="button" size="sm" variant="outline" @click="reload()">
          <RotateCcw class="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
    <template v-else>
      <section aria-label="Crear categoría">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 class="text-lg font-semibold tracking-tight">Crear categoría</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form class="grid gap-4" @submit.prevent="create">
              <div class="grid gap-1.5">
                <Label for="admin-category-name">Nombre de la categoría</Label>
                <Input
                  id="admin-category-name"
                  v-model="name"
                  type="text"
                  required
                  :aria-invalid="createErrors['name'] !== undefined"
                  :aria-describedby="
                    createErrors['name'] !== undefined ? 'admin-category-name-error' : undefined
                  "
                />
                <Alert
                  v-if="createErrors['name'] !== undefined"
                  id="admin-category-name-error"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ createErrors['name'] }}</AlertDescription>
                </Alert>
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-category-slug">Slug</Label>
                <Input
                  id="admin-category-slug"
                  v-model="slug"
                  type="text"
                  required
                  :aria-invalid="createErrors['slug'] !== undefined"
                  :aria-describedby="
                    createErrors['slug'] !== undefined ? 'admin-category-slug-error' : undefined
                  "
                />
                <Alert
                  v-if="createErrors['slug'] !== undefined"
                  id="admin-category-slug-error"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ createErrors['slug'] }}</AlertDescription>
                </Alert>
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-category-description">Descripción</Label>
                <Input id="admin-category-description" v-model="description" type="text" />
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-category-parent">Categoría padre</Label>
                <select
                  id="admin-category-parent"
                  v-model="parentId"
                  class="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm transition-colors outline-none focus-visible:ring-3"
                >
                  <option value="">Ninguna</option>
                  <option v-for="node in admin.categories" :key="node.id" :value="String(node.id)">
                    {{ node.name }}
                  </option>
                </select>
              </div>
              <div>
                <Button type="submit">
                  <Plus class="size-4" aria-hidden="true" />
                  Crear categoría
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardContent>
          <ul class="divide-y">
            <li
              v-for="node in admin.categories"
              :key="node.id"
              class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div class="space-y-0.5">
                <h3 class="font-semibold">{{ node.name }}</h3>
                <p class="text-muted-foreground text-sm">{{ node.slug }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="startEdit(node.id, node.name)"
                >
                  <Pencil class="size-4" aria-hidden="true" />
                  Editar {{ node.name }}
                </Button>
                <Button
                  :id="`remove-category-${node.id}`"
                  type="button"
                  variant="destructive"
                  size="sm"
                  @click="askRemove(node.id)"
                >
                  <Trash2 class="size-4" aria-hidden="true" />
                  Eliminar {{ node.name }}
                </Button>
              </div>
              <div
                v-if="confirmingCategoryId === node.id"
                id="retire-category-dialog"
                role="alertdialog"
                :aria-labelledby="`retire-category-heading-${node.id}`"
                :aria-describedby="`retire-category-desc-${node.id}`"
                tabindex="-1"
                class="border-destructive/40 bg-destructive/5 focus-visible:ring-ring space-y-3 rounded-xl border p-4 outline-none focus-visible:ring-3"
                @keydown="onDialogKeydown"
              >
                <h3 :id="`retire-category-heading-${node.id}`" class="font-semibold">
                  Eliminar {{ node.name }}
                </h3>
                <p :id="`retire-category-desc-${node.id}`" class="text-muted-foreground text-sm">
                  <TriangleAlert class="mr-1 inline size-4" aria-hidden="true" />
                  {{
                    productCount(node.id) === 1
                      ? 'Tiene 1 producto. '
                      : `Tiene ${productCount(node.id)} productos. `
                  }}Esta acción no se puede deshacer.
                </p>
                <div class="flex flex-wrap gap-2">
                  <Button type="button" variant="destructive" size="sm" @click="confirmRemove()">
                    <Trash2 class="size-4" aria-hidden="true" />
                    Confirmar eliminación de {{ node.name }}
                  </Button>
                  <Button type="button" variant="outline" size="sm" @click="cancelRemove()">
                    Cancelar
                  </Button>
                </div>
              </div>
              <form
                v-if="editingId === node.id"
                class="bg-muted/40 grid gap-2 rounded-xl border p-3"
                @submit.prevent="saveEdit(node.id)"
              >
                <Label :for="`edit-category-name-${node.id}`">Nombre</Label>
                <Input
                  :id="`edit-category-name-${node.id}`"
                  v-model="editName"
                  type="text"
                  :aria-invalid="editError !== null"
                  :aria-describedby="
                    editError !== null ? `edit-category-error-${node.id}` : undefined
                  "
                />
                <Alert
                  v-if="editError !== null"
                  :id="`edit-category-error-${node.id}`"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ editError }}</AlertDescription>
                </Alert>
                <div>
                  <Button type="submit" size="sm">Guardar</Button>
                </div>
              </form>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>
  </main>
</template>
