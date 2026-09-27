import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  buildOrderCreate,
  cancelOwnOrder,
  createOrder,
  fetchOrder,
  fetchOrderTracking,
  fetchOwnOrders,
  validateShipping,
  type OrderSummary,
  type OrderTracking,
  type ShippingForm,
} from '../api/orders'
import { normalizeError } from '../api/errors'
import type { ApiError, Order } from '../api/types'

import { useCartStore } from './cart'

/**
 * Orders store (T008) — create-from-cart only. The pipeline is a gate chain:
 * form → non-empty cart → served availability → POST. A block anywhere below
 * stops the chain before any order exists (all-or-nothing lives server-side;
 * the client simply never posts a doomed request).
 */
export const useOrdersStore = defineStore('orders', () => {
  const order = ref<Order | null>(null)
  const fieldErrors = ref<Record<string, string>>({})
  const placing = ref(false)
  const error = ref<ApiError | null>(null)
  const history = ref<OrderSummary[]>([])
  const detail = ref<Order | null>(null)
  const tracking = ref<OrderTracking | null>(null)
  const historyLoading = ref(false)
  const detailLoading = ref(false)

  function fail(unknown: unknown): void {
    error.value = normalizeError(unknown)
  }

  async function placeOrder(form: ShippingForm): Promise<Order | null> {
    order.value = null
    error.value = null
    const invalid = validateShipping(form)
    fieldErrors.value = invalid
    if (Object.keys(invalid).length > 0) {
      return null
    }

    const cart = useCartStore()
    const current = cart.cart
    if (current === null || current.items.length === 0) {
      error.value = { code: 'VALIDATION', message: 'Tu cesta está vacía.' }
      return null
    }

    placing.value = true
    try {
      const availability = await cart.validateStock()
      if (availability !== null && !availability.valid) {
        error.value = {
          code: 'BLOCKED',
          message: 'Hay artículos sin disponibilidad. Ajusta tu cesta para continuar.',
        }
        return null
      }
      if (availability === null) {
        error.value = cart.error ?? { code: 'REQUEST', message: 'Unexpected error' }
        return null
      }
      const placed = await createOrder(buildOrderCreate(current, form))
      order.value = placed
      // The cart is spent: reset it for the next purchase. Failures here
      // surface on the cart page later; the placed order stays authoritative.
      await cart.clearCart()
      return placed
    } catch (unknown) {
      const normalized = normalizeError(unknown)
      if (normalized.code === 'CONFLICT') {
        error.value = {
          code: 'CONFLICT',
          message: 'Sin stock suficiente para algún artículo. Revisa tu cesta.',
        }
      } else {
        error.value = normalized
      }
      return null
    } finally {
      placing.value = false
    }
  }

  async function loadHistory(): Promise<void> {
    historyLoading.value = true
    error.value = null
    try {
      history.value = await fetchOwnOrders()
    } catch (unknown) {
      fail(unknown)
    } finally {
      historyLoading.value = false
    }
  }

  async function loadOrder(id: number): Promise<void> {
    detailLoading.value = true
    error.value = null
    detail.value = null
    tracking.value = null
    try {
      const [served, servedTracking] = await Promise.all([
        fetchOrder(id),
        fetchOrderTracking(id),
      ])
      detail.value = served
      tracking.value = servedTracking
    } catch (unknown) {
      fail(unknown)
    } finally {
      detailLoading.value = false
    }
  }

  /**
   * Adopts the cancelled order locally (detail + history entry) instead of
   * refetching: the transport stub is stateless for cancel, and the response
   * is authoritative anyway. Late rejects map to guidance, never leak.
   */
  async function cancelOrder(id: number): Promise<Order | null> {
    error.value = null
    try {
      const cancelled = await cancelOwnOrder(id)
      detail.value = cancelled
      history.value = history.value.map((entry) =>
        entry.id === cancelled.id
          ? { ...entry, status: cancelled.status, payment_status: cancelled.payment_status }
          : entry,
      )
      return cancelled
    } catch (unknown) {
      const normalized = normalizeError(unknown)
      if (normalized.code === 'CONFLICT' || normalized.code === 'VALIDATION') {
        error.value = { code: normalized.code, message: 'Ya no se puede cancelar este pedido.' }
      } else {
        error.value = normalized
      }
      return null
    }
  }

  function reset(): void {
    order.value = null
    fieldErrors.value = {}
    error.value = null
  }

  return {
    order,
    fieldErrors,
    placing,
    error,
    history,
    detail,
    tracking,
    historyLoading,
    detailLoading,
    placeOrder,
    loadHistory,
    loadOrder,
    cancelOrder,
    reset,
  }
})
