import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  addOwnItem,
  addSessionItem,
  clearGuestSessionId,
  clearOwnCart,
  ensureGuestSessionId,
  fetchOwnCart,
  fetchSessionCart,
  loadGuestSessionId,
  mergeGuestCart,
  removeOwnLine,
  updateOwnLine,
  validateCart,
  type CartValidation,
} from '../api/cart'
import { normalizeError } from '../api/errors'
import type { ApiError, Cart, CartSummary } from '../api/types'

import { useSessionStore } from './session'

/**
 * Cart store (T007) — guest lines under a versioned browser session id, owned
 * lines under the login, one cart after `mergeOnLogin`. Mutations refetch the
 * cart so totals stay server-issued (never summed locally); quantity edits
 * apply optimistically and roll back to the snapshot on failure.
 */
export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart | null>(null)
  const validation = ref<CartValidation | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  /** Served summary view (plan §3 `CartSummary`): verbatim server fields. */
  const summary = computed<CartSummary | null>(() => {
    const current = cart.value
    if (current === null) {
      return null
    }
    return {
      items: current.items,
      total_items: current.total_items,
      total_amount: current.total_amount,
    }
  })

  function fail(unknown: unknown): void {
    error.value = normalizeError(unknown)
  }

  async function loadCart(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (useSessionStore().isAuthenticated) {
        cart.value = await fetchOwnCart()
      } else {
        const guestId = loadGuestSessionId()
        cart.value = guestId === null ? null : await fetchSessionCart(guestId)
      }
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function addItem(productId: number, quantity: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      if (useSessionStore().isAuthenticated) {
        await addOwnItem(productId, quantity)
      } else {
        await addSessionItem(ensureGuestSessionId(), productId, quantity)
      }
      await loadCart()
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function updateLine(itemId: number, quantity: number): Promise<void> {
    const current = cart.value
    if (current === null) {
      return
    }
    if (quantity < 1) {
      await removeLine(itemId)
      return
    }
    const snapshot = current.items.map((line) => ({ ...line }))
    cart.value = {
      ...current,
      items: current.items.map((line) => (line.id === itemId ? { ...line, quantity } : line)),
    }
    loading.value = true
    error.value = null
    try {
      await updateOwnLine(itemId, quantity)
      await loadCart()
    } catch (unknown) {
      const rolled = cart.value
      if (rolled !== null) {
        cart.value = { ...rolled, items: snapshot }
      }
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function removeLine(itemId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      cart.value = await removeOwnLine(itemId)
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function clearCart(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      cart.value = await clearOwnCart()
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  /**
   * Single merge after login/register (called by the auth views, never by the
   * session store — that direction would couple the domains). Without a guest
   * id it is a plain reload of the owned cart; afterwards the guest id is
   * dropped so a later login never re-merges. Never throws: failures land in
   * `error` and must not block the post-login navigation.
   */
  async function mergeOnLogin(): Promise<void> {
    const guestId = loadGuestSessionId()
    if (guestId === null) {
      await loadCart()
      return
    }
    loading.value = true
    error.value = null
    try {
      cart.value = await mergeGuestCart(guestId)
      clearGuestSessionId()
      await loadCart()
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  /**
   * Served availability check (T008 enforces the block at checkout; this only
   * reports). Kept in the store so the shape is pinned once.
   */
  async function validateStock(): Promise<CartValidation | null> {
    error.value = null
    try {
      const result = await validateCart()
      validation.value = result
      return result
    } catch (unknown) {
      fail(unknown)
      return null
    }
  }

  return {
    cart,
    validation,
    loading,
    error,
    summary,
    loadCart,
    addItem,
    updateLine,
    removeLine,
    clearCart,
    mergeOnLogin,
    validateStock,
  }
})
