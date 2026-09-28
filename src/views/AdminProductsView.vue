<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import {
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  StarOff,
  Trash2,
  TriangleAlert,
} from 'lucide-vue-next'

import { formatAmount } from '../api/money'
import { useAdminStore } from '../stores/admin'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

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
/** Product awaiting explicit retire confirmation (T013: only with order movements). */
const confirmingProductId = ref<number | null>(null)
let lastTriggerId: string | null = null

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

function movementCount(id: number): number {
  return admin.orderProductIds.filter((entry) => entry === id).length
}

function retireDescription(id: number): string {
  if (!admin.movementsLoaded) {
    return 'Todavía no se ha comprobado si aparece en pedidos. '
  }
  const count = movementCount(id)
  return count === 1 ? 'Aparece en 1 pedido. ' : `Aparece en ${count} pedidos. `
}

function focusDialog(): void {
  void nextTick(() => {
    document.getElementById('retire-product-dialog')?.focus()
  })
}

function focusTrigger(): void {
  if (lastTriggerId !== null) {
    document.getElementById(lastTriggerId)?.focus()
  }
}

/**
 * Retire gate (T013, branch review fail-closed): products with order movements
 * ask explicitly, and so do products whose movements have not loaded yet — a
 * fast click before the check resolves must never delete silently. The rest
 * keep the direct removal from T010. No business logic here — just the gate.
 */
function askRemove(id: number): void {
  if (admin.movementsLoaded && !admin.hasMovements(id)) {
    remove(id)
    return
  }
  confirmingProductId.value = id
  lastTriggerId = `remove-product-${id}`
  focusDialog()
}

function cancelRemove(): void {
  confirmingProductId.value = null
  focusTrigger()
}

function confirmRemove(): void {
  const id = confirmingProductId.value
  confirmingProductId.value = null
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
  void loadData()
}

async function loadData(): Promise<void> {
  await admin.loadAll()
  if (admin.error === null) {
    await admin.loadOrderMovements()
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <main class="mx-auto w-full max-w-3xl space-y-6 py-4">
    <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Productos</h1>
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
      <section v-if="admin.lowStock.length > 0" aria-label="Stock bajo">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 class="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <TriangleAlert class="size-5" aria-hidden="true" />
                Stock bajo
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul class="grid gap-1.5 text-sm">
              <li v-for="item in admin.lowStock" :key="item.id">
                {{ item.name }}: quedan {{ item.stock_quantity }}
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
      <section aria-label="Crear producto">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 class="text-lg font-semibold tracking-tight">Crear producto</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form class="grid gap-4" @submit.prevent="create">
              <div class="grid gap-1.5">
                <Label for="admin-product-name">Nombre del producto</Label>
                <Input
                  id="admin-product-name"
                  v-model="name"
                  type="text"
                  required
                  :aria-invalid="createErrors['name'] !== undefined"
                  :aria-describedby="
                    createErrors['name'] !== undefined ? 'admin-product-name-error' : undefined
                  "
                />
                <Alert
                  v-if="createErrors['name'] !== undefined"
                  id="admin-product-name-error"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ createErrors['name'] }}</AlertDescription>
                </Alert>
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-product-slug">Slug del producto</Label>
                <Input
                  id="admin-product-slug"
                  v-model="slug"
                  type="text"
                  required
                  :aria-invalid="createErrors['slug'] !== undefined"
                  :aria-describedby="
                    createErrors['slug'] !== undefined ? 'admin-product-slug-error' : undefined
                  "
                />
                <Alert
                  v-if="createErrors['slug'] !== undefined"
                  id="admin-product-slug-error"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ createErrors['slug'] }}</AlertDescription>
                </Alert>
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-product-sku">Referencia</Label>
                <Input
                  id="admin-product-sku"
                  v-model="sku"
                  type="text"
                  required
                  :aria-invalid="createErrors['sku'] !== undefined"
                  :aria-describedby="
                    createErrors['sku'] !== undefined ? 'admin-product-sku-error' : undefined
                  "
                />
                <Alert
                  v-if="createErrors['sku'] !== undefined"
                  id="admin-product-sku-error"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ createErrors['sku'] }}</AlertDescription>
                </Alert>
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-product-price">Precio</Label>
                <Input
                  id="admin-product-price"
                  v-model="price"
                  type="text"
                  inputmode="decimal"
                  required
                  :aria-invalid="createErrors['price'] !== undefined"
                  :aria-describedby="
                    createErrors['price'] !== undefined ? 'admin-product-price-error' : undefined
                  "
                />
                <Alert
                  v-if="createErrors['price'] !== undefined"
                  id="admin-product-price-error"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ createErrors['price'] }}</AlertDescription>
                </Alert>
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-product-category">Categoría</Label>
                <select
                  id="admin-product-category"
                  v-model="categoryId"
                  required
                  :aria-invalid="createErrors['category'] !== undefined"
                  :aria-describedby="
                    createErrors['category'] !== undefined
                      ? 'admin-product-category-error'
                      : undefined
                  "
                  class="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm transition-colors outline-none focus-visible:ring-3"
                >
                  <option value="">Elige</option>
                  <option v-for="node in admin.categories" :key="node.id" :value="String(node.id)">
                    {{ node.name }}
                  </option>
                </select>
                <Alert
                  v-if="createErrors['category'] !== undefined"
                  id="admin-product-category-error"
                  variant="destructive"
                  class="py-2"
                >
                  <AlertDescription>{{ createErrors['category'] }}</AlertDescription>
                </Alert>
              </div>
              <div class="grid gap-1.5">
                <Label for="admin-product-stock">Stock inicial</Label>
                <Input
                  id="admin-product-stock"
                  v-model="stock"
                  type="number"
                  min="0"
                  inputmode="numeric"
                />
              </div>
              <div class="flex items-center gap-2">
                <input
                  id="admin-product-featured"
                  v-model="featured"
                  type="checkbox"
                  class="border-input accent-primary size-4 shrink-0 rounded"
                />
                <Label for="admin-product-featured">Destacado</Label>
              </div>
              <div>
                <Button type="submit">
                  <Plus class="size-4" aria-hidden="true" />
                  Crear producto
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
              v-for="item in admin.products"
              :key="item.id"
              class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div class="space-y-1">
                <h3 class="font-semibold">{{ item.name }}</h3>
                <p class="text-muted-foreground text-sm">
                  {{ formatAmount(item.current_price) }} — stock: {{ item.stock_quantity }}
                </p>
                <div>
                  <Badge :variant="item.is_featured ? 'default' : 'secondary'">
                    {{ item.is_featured ? 'Destacado' : 'No destacado' }}
                  </Badge>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="startEdit(item.id, item.name)"
                >
                  <Pencil class="size-4" aria-hidden="true" />
                  Editar {{ item.name }}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="toggleFeatured(item.id, item.is_featured)"
                >
                  <StarOff v-if="item.is_featured" class="size-4" aria-hidden="true" />
                  <Star v-else class="size-4" aria-hidden="true" />
                  {{
                    item.is_featured ? `Quitar destacado de ${item.name}` : `Destacar ${item.name}`
                  }}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="startStock(item.id, item.stock_quantity)"
                >
                  <PackagePlus class="size-4" aria-hidden="true" />
                  Ajustar stock de {{ item.name }}
                </Button>
                <Button
                  :id="`remove-product-${item.id}`"
                  type="button"
                  variant="destructive"
                  size="sm"
                  @click="askRemove(item.id)"
                >
                  <Trash2 class="size-4" aria-hidden="true" />
                  Eliminar {{ item.name }}
                </Button>
              </div>
              <div
                v-if="confirmingProductId === item.id"
                id="retire-product-dialog"
                role="alertdialog"
                :aria-labelledby="`retire-product-heading-${item.id}`"
                :aria-describedby="`retire-product-desc-${item.id}`"
                tabindex="-1"
                class="border-destructive/40 bg-destructive/5 focus-visible:ring-ring space-y-3 rounded-xl border p-4 outline-none focus-visible:ring-3"
                @keydown="onDialogKeydown"
              >
                <h3 :id="`retire-product-heading-${item.id}`" class="font-semibold">
                  Eliminar {{ item.name }}
                </h3>
                <p :id="`retire-product-desc-${item.id}`" class="text-muted-foreground text-sm">
                  <TriangleAlert class="mr-1 inline size-4" aria-hidden="true" />
                  {{ retireDescription(item.id) }}Esta acción no se puede deshacer.
                </p>
                <div class="flex flex-wrap gap-2">
                  <Button type="button" variant="destructive" size="sm" @click="confirmRemove()">
                    <Trash2 class="size-4" aria-hidden="true" />
                    Confirmar eliminación de {{ item.name }}
                  </Button>
                  <Button type="button" variant="outline" size="sm" @click="cancelRemove()">
                    Cancelar
                  </Button>
                </div>
              </div>
              <form
                v-if="editingId === item.id"
                class="bg-muted/40 grid gap-2 rounded-xl border p-3"
                @submit.prevent="saveEdit(item.id)"
              >
                <Label :for="`edit-product-name-${item.id}`">Nombre</Label>
                <Input :id="`edit-product-name-${item.id}`" v-model="editName" type="text" />
                <div>
                  <Button type="submit" size="sm">Guardar</Button>
                </div>
              </form>
              <form
                v-if="stockingId === item.id"
                class="bg-muted/40 grid gap-2 rounded-xl border p-3"
                @submit.prevent="saveStock(item.id)"
              >
                <Label :for="`stock-qty-${item.id}`">Nuevo stock</Label>
                <Input
                  :id="`stock-qty-${item.id}`"
                  v-model="stockQty"
                  type="number"
                  min="0"
                  inputmode="numeric"
                />
                <div>
                  <Button type="submit" size="sm">Guardar stock</Button>
                </div>
              </form>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>
  </main>
</template>
