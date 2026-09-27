<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { formatAmount } from '../api/money'
import { useAdminStore } from '../stores/admin'

const admin = useAdminStore()

const name = ref('')
const slug = ref('')
const sku = ref('')
const price = ref('')
const categoryId = ref('')
const stock = ref('')
const featured = ref(false)
const createErrors = ref<Record<string, string>>({})
const editingId = ref<number | null>(null)
const editName = ref('')
const stockingId = ref<number | null>(null)
const stockQty = ref('')

function validPrice(raw: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(raw.trim())
}

async function create(): Promise<void> {
  const invalid: Record<string, string> = {}
  if (name.value.trim() === '') {
    invalid['name'] = 'El nombre es obligatorio.'
  }
  if (slug.value.trim() === '') {
    invalid['slug'] = 'El slug es obligatorio.'
  }
  if (sku.value.trim() === '') {
    invalid['sku'] = 'La referencia es obligatoria.'
  }
  if (!validPrice(price.value)) {
    invalid['price'] = 'Precio con hasta dos decimales.'
  }
  if (categoryId.value === '') {
    invalid['category'] = 'La categoría es obligatoria.'
  }
  createErrors.value = invalid
  if (Object.keys(invalid).length > 0) {
    return
  }
  const stockCount = stock.value.trim() === '' ? 0 : Number(stock.value)
  await admin.createProduct({
    name: name.value.trim(),
    slug: slug.value.trim(),
    sku: sku.value.trim(),
    price: price.value.trim(),
    category_id: Number(categoryId.value),
    stock_quantity: Number.isInteger(stockCount) && stockCount >= 0 ? stockCount : 0,
    is_featured: featured.value,
  })
  if (admin.error === null) {
    name.value = ''
    slug.value = ''
    sku.value = ''
    price.value = ''
    categoryId.value = ''
    stock.value = ''
    featured.value = false
  }
}

function startEdit(id: number, current: string): void {
  editingId.value = id
  editName.value = current
  stockingId.value = null
}

async function saveEdit(id: number): Promise<void> {
  if (editName.value.trim() === '') {
    return
  }
  await admin.updateProduct(id, { name: editName.value.trim() })
  if (admin.error === null) {
    editingId.value = null
  }
}

function remove(id: number): void {
  void admin.removeProduct(id)
}

function toggleFeatured(id: number, current: boolean): void {
  void admin.setFeatured(id, !current)
}

function startStock(id: number, current: number): void {
  stockingId.value = id
  stockQty.value = String(current)
  editingId.value = null
}

async function saveStock(id: number): Promise<void> {
  const quantity = Number(stockQty.value)
  if (!Number.isInteger(quantity) || quantity < 0) {
    return
  }
  await admin.setStock(id, quantity)
  if (admin.error === null) {
    stockingId.value = null
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
    <h1>Productos</h1>
    <p v-if="admin.loading">Cargando…</p>
    <p v-else-if="admin.error !== null" role="alert">
      {{ admin.error.message }}
      <button type="button" @click="reload()">Reintentar</button>
    </p>
    <template v-else>
      <section v-if="admin.lowStock.length > 0" aria-label="Stock bajo">
        <h2>Stock bajo</h2>
        <ul>
          <li v-for="item in admin.lowStock" :key="item.id">
            {{ item.name }}: quedan {{ item.stock_quantity }}
          </li>
        </ul>
      </section>
      <section aria-label="Crear producto">
        <h2>Crear producto</h2>
        <form @submit.prevent="create">
          <div>
            <label for="admin-product-name">Nombre del producto</label>
            <input id="admin-product-name" v-model="name" type="text" required />
            <p v-if="createErrors['name'] !== undefined">{{ createErrors['name'] }}</p>
          </div>
          <div>
            <label for="admin-product-slug">Slug del producto</label>
            <input id="admin-product-slug" v-model="slug" type="text" required />
            <p v-if="createErrors['slug'] !== undefined">{{ createErrors['slug'] }}</p>
          </div>
          <div>
            <label for="admin-product-sku">Referencia</label>
            <input id="admin-product-sku" v-model="sku" type="text" required />
            <p v-if="createErrors['sku'] !== undefined">{{ createErrors['sku'] }}</p>
          </div>
          <div>
            <label for="admin-product-price">Precio</label>
            <input
              id="admin-product-price"
              v-model="price"
              type="text"
              inputmode="decimal"
              required
            />
            <p v-if="createErrors['price'] !== undefined">{{ createErrors['price'] }}</p>
          </div>
          <div>
            <label for="admin-product-category">Categoría</label>
            <select id="admin-product-category" v-model="categoryId" required>
              <option value="">Elige</option>
              <option
                v-for="node in admin.categories"
                :key="node.id"
                :value="String(node.id)"
              >
                {{ node.name }}
              </option>
            </select>
            <p v-if="createErrors['category'] !== undefined">{{ createErrors['category'] }}</p>
          </div>
          <div>
            <label for="admin-product-stock">Stock inicial</label>
            <input
              id="admin-product-stock"
              v-model="stock"
              type="number"
              min="0"
              inputmode="numeric"
            />
          </div>
          <div>
            <input id="admin-product-featured" v-model="featured" type="checkbox" />
            <label for="admin-product-featured">Destacado</label>
          </div>
          <button type="submit">Crear producto</button>
        </form>
      </section>
      <ul>
        <li v-for="item in admin.products" :key="item.id">
          <h3>{{ item.name }}</h3>
          <p>{{ formatAmount(item.current_price) }} — stock: {{ item.stock_quantity }}</p>
          <p>{{ item.is_featured ? 'Destacado' : 'No destacado' }}</p>
          <button type="button" @click="startEdit(item.id, item.name)">
            Editar {{ item.name }}
          </button>
          <button type="button" @click="toggleFeatured(item.id, item.is_featured)">
            {{ item.is_featured ? `Quitar destacado de ${item.name}` : `Destacar ${item.name}` }}
          </button>
          <button type="button" @click="startStock(item.id, item.stock_quantity)">
            Ajustar stock de {{ item.name }}
          </button>
          <button type="button" @click="remove(item.id)">Eliminar {{ item.name }}</button>
          <form v-if="editingId === item.id" @submit.prevent="saveEdit(item.id)">
            <label :for="`edit-product-name-${item.id}`">Nombre</label>
            <input :id="`edit-product-name-${item.id}`" v-model="editName" type="text" />
            <button type="submit">Guardar</button>
          </form>
          <form v-if="stockingId === item.id" @submit.prevent="saveStock(item.id)">
            <label :for="`stock-qty-${item.id}`">Nuevo stock</label>
            <input
              :id="`stock-qty-${item.id}`"
              v-model="stockQty"
              type="number"
              min="0"
              inputmode="numeric"
            />
            <button type="submit">Guardar stock</button>
          </form>
        </li>
      </ul>
    </template>
  </main>
</template>
