import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  createCategory as apiCreateCategory,
  createProduct as apiCreateProduct,
  deleteCategory as apiDeleteCategory,
  deleteProduct as apiDeleteProduct,
  fetchAllOrders,
  fetchLowStock,
  fetchUserDetail,
  fetchUsers,
  setProductStock,
  toggleProductFeatured,
  updateCategory as apiUpdateCategory,
  updateOrderPayment,
  updateOrderStatus,
  updateProduct as apiUpdateProduct,
  type CategoryCreateInput,
  type CategoryUpdateInput,
  type ProductCreateInput,
  type ProductUpdateInput,
} from '../api/admin'
import { fetchCategories, searchProducts } from '../api/catalog'
import { normalizeError } from '../api/errors'
import type { OrderSummary } from '../api/orders'
import type { ApiError, Category, OrderStatus, PaymentStatus, Product, User } from '../api/types'

/**
 * Admin catalog store (T010). Reads come from the public catalog layer (same
 * data customers see); writes refetch afterwards so the admin always sees
 * served truth. Deletions here are direct — T013 adds the explicit
 * confirmation for ones with dependencies.
 */
export const useAdminStore = defineStore('admin', () => {
  const categories = ref<Category[]>([])
  const products = ref<Product[]>([])
  const lowStock = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const orders = ref<OrderSummary[]>([])
  const orderFilter = ref('')
  const ordersLoading = ref(false)
  const users = ref<User[]>([])
  const selectedUser = ref<User | null>(null)
  const usersLoading = ref(false)

  function fail(unknown: unknown): void {
    error.value = normalizeError(unknown)
  }

  async function refreshLists(): Promise<void> {
    const [servedCategories, servedProducts, servedLow] = await Promise.all([
      fetchCategories(),
      searchProducts({ limit: 100 }),
      fetchLowStock().catch(() => [] as Product[]),
    ])
    categories.value = servedCategories
    products.value = servedProducts
    lowStock.value = servedLow
  }

  async function loadAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await refreshLists()
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function runWrite(write: () => Promise<unknown>): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await write()
      await refreshLists()
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function createCategory(input: CategoryCreateInput): Promise<void> {
    await runWrite(() => apiCreateCategory(input))
  }

  async function updateCategory(id: number, input: CategoryUpdateInput): Promise<void> {
    await runWrite(() => apiUpdateCategory(id, input))
  }

  async function removeCategory(id: number): Promise<void> {
    await runWrite(() => apiDeleteCategory(id))
  }

  async function createProduct(input: ProductCreateInput): Promise<void> {
    await runWrite(() => apiCreateProduct(input))
  }

  async function updateProduct(id: number, input: ProductUpdateInput): Promise<void> {
    await runWrite(() => apiUpdateProduct(id, input))
  }

  async function removeProduct(id: number): Promise<void> {
    await runWrite(() => apiDeleteProduct(id))
  }

  async function setStock(id: number, quantity: number): Promise<void> {
    await runWrite(() => setProductStock(id, quantity))
  }

  async function setFeatured(id: number, featured: boolean): Promise<void> {
    await runWrite(() => toggleProductFeatured(id, featured))
  }

  /**
   * Admin orders/users (T012). Transitions adopt the served `Order` into the
   * list entry (same class as T009 cancel): the response is authoritative,
   * no refetch needed. The filter stays as the user set it.
   */
  async function loadOrders(status?: string): Promise<void> {
    ordersLoading.value = true
    error.value = null
    try {
      orders.value = await fetchAllOrders(status ? { status } : undefined)
      orderFilter.value = status ?? ''
    } catch (unknown) {
      fail(unknown)
    } finally {
      ordersLoading.value = false
    }
  }

  async function setOrderStatus(id: number, status: OrderStatus): Promise<void> {
    error.value = null
    try {
      const updated = await updateOrderStatus(id, status)
      orders.value = orders.value.map((entry) =>
        entry.id === updated.id
          ? { ...entry, status: updated.status, payment_status: updated.payment_status }
          : entry,
      )
    } catch (unknown) {
      fail(unknown)
    }
  }

  async function setOrderPayment(id: number, payment: PaymentStatus): Promise<void> {
    error.value = null
    try {
      const updated = await updateOrderPayment(id, payment)
      orders.value = orders.value.map((entry) =>
        entry.id === updated.id
          ? { ...entry, status: updated.status, payment_status: updated.payment_status }
          : entry,
      )
    } catch (unknown) {
      fail(unknown)
    }
  }

  async function loadUsers(): Promise<void> {
    usersLoading.value = true
    error.value = null
    selectedUser.value = null
    try {
      users.value = await fetchUsers()
    } catch (unknown) {
      fail(unknown)
    } finally {
      usersLoading.value = false
    }
  }

  async function loadUserDetail(id: number): Promise<void> {
    usersLoading.value = true
    error.value = null
    try {
      selectedUser.value = await fetchUserDetail(id)
    } catch (unknown) {
      fail(unknown)
    } finally {
      usersLoading.value = false
    }
  }

  return {
    categories,
    products,
    lowStock,
    loading,
    error,
    loadAll,
    createCategory,
    updateCategory,
    removeCategory,
    createProduct,
    updateProduct,
    removeProduct,
    setStock,
    setFeatured,
    orders,
    orderFilter,
    ordersLoading,
    users,
    selectedUser,
    usersLoading,
    loadOrders,
    setOrderStatus,
    setOrderPayment,
    loadUsers,
    loadUserDetail,
  }
})
