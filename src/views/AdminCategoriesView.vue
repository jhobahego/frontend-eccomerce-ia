<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

import { countCategoryProducts, useAdminStore } from '../stores/admin'

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
  <main>
    <h1>Categorías</h1>
    <p v-if="admin.loading">Cargando…</p>
    <p v-else-if="admin.error !== null" role="alert">
      {{ admin.error.message }}
      <button type="button" @click="reload()">Reintentar</button>
    </p>
    <template v-else>
      <section aria-label="Crear categoría">
        <h2>Crear categoría</h2>
        <form @submit.prevent="create">
          <div>
            <label for="admin-category-name">Nombre de la categoría</label>
            <input id="admin-category-name" v-model="name" type="text" required />
            <p v-if="createErrors['name'] !== undefined">{{ createErrors['name'] }}</p>
          </div>
          <div>
            <label for="admin-category-slug">Slug</label>
            <input id="admin-category-slug" v-model="slug" type="text" required />
            <p v-if="createErrors['slug'] !== undefined">{{ createErrors['slug'] }}</p>
          </div>
          <div>
            <label for="admin-category-description">Descripción</label>
            <input id="admin-category-description" v-model="description" type="text" />
          </div>
          <div>
            <label for="admin-category-parent">Categoría padre</label>
            <select id="admin-category-parent" v-model="parentId">
              <option value="">Ninguna</option>
              <option v-for="node in admin.categories" :key="node.id" :value="String(node.id)">
                {{ node.name }}
              </option>
            </select>
          </div>
          <button type="submit">Crear categoría</button>
        </form>
      </section>
      <ul>
        <li v-for="node in admin.categories" :key="node.id">
          <h3>{{ node.name }}</h3>
          <p>{{ node.slug }}</p>
          <button type="button" @click="startEdit(node.id, node.name)">
            Editar {{ node.name }}
          </button>
          <button :id="`remove-category-${node.id}`" type="button" @click="askRemove(node.id)">
            Eliminar {{ node.name }}
          </button>
          <div
            v-if="confirmingCategoryId === node.id"
            id="retire-category-dialog"
            role="alertdialog"
            :aria-labelledby="`retire-category-heading-${node.id}`"
            :aria-describedby="`retire-category-desc-${node.id}`"
            tabindex="-1"
            @keydown="onDialogKeydown"
          >
            <h3 :id="`retire-category-heading-${node.id}`">Eliminar {{ node.name }}</h3>
            <p :id="`retire-category-desc-${node.id}`">
              {{
                productCount(node.id) === 1
                  ? 'Tiene 1 producto. '
                  : `Tiene ${productCount(node.id)} productos. `
              }}Esta acción no se puede deshacer.
            </p>
            <button type="button" @click="confirmRemove()">
              Confirmar eliminación de {{ node.name }}
            </button>
            <button type="button" @click="cancelRemove()">Cancelar</button>
          </div>
          <form v-if="editingId === node.id" @submit.prevent="saveEdit(node.id)">
            <label :for="`edit-category-name-${node.id}`">Nombre</label>
            <input :id="`edit-category-name-${node.id}`" v-model="editName" type="text" />
            <p v-if="editError !== null">{{ editError }}</p>
            <button type="submit">Guardar</button>
          </form>
        </li>
      </ul>
    </template>
  </main>
</template>
