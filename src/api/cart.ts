import { apiRequest } from './client'
import type { Cart, CartItem } from './types'

/**
 * Guest + owned cart layer (T007). Line ownership beyond the merge point is
 * resolved server-side: the generic line endpoints serve whichever cart the
 * line belongs to, so guest updates use them too (only session GET/POST have
 * dedicated paths). Totals always arrive served, never computed here.
 */

export interface CartValidationIssue {
  product_id: number
  available: number
  requested: number
}

export interface CartValidation {
  valid: boolean
  issues: CartValidationIssue[]
}

const GUEST_STORAGE_KEY = 'eia.guest_cart.v1'

/** Versioned guest session id. A corrupt value is ignored, never thrown. */
export function loadGuestSessionId(): string | null {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(GUEST_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && 'sessionId' in parsed) {
      const id = (parsed as { sessionId: unknown }).sessionId
      return typeof id === 'string' && id !== '' ? id : null
    }
    return null
  } catch {
    return null
  }
}

export function saveGuestSessionId(id: string): void {
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ sessionId: id }))
  } catch {
    // Storage unavailable: the guest cart simply lasts until reload.
  }
}

export function clearGuestSessionId(): void {
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY)
  } catch {
    // Nothing persisted, nothing to clear.
  }
}

/** Lazily mints the guest session id on first need, never at boot. */
export function ensureGuestSessionId(): string {
  const existing = loadGuestSessionId()
  if (existing !== null) {
    return existing
  }
  const fresh =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
  saveGuestSessionId(fresh)
  return fresh
}

export function fetchOwnCart(): Promise<Cart> {
  return apiRequest<Cart>('/api/v1/cart/')
}

export function fetchSessionCart(sessionId: string): Promise<Cart> {
  return apiRequest<Cart>(`/api/v1/cart/session/${encodeURIComponent(sessionId)}`)
}

export function addOwnItem(productId: number, quantity: number): Promise<CartItem> {
  return apiRequest<CartItem>('/api/v1/cart/items', {
    method: 'POST',
    body: { product_id: productId, quantity },
  })
}

export function addSessionItem(
  sessionId: string,
  productId: number,
  quantity: number,
): Promise<CartItem> {
  return apiRequest<CartItem>(`/api/v1/cart/session/${encodeURIComponent(sessionId)}/items`, {
    method: 'POST',
    body: { product_id: productId, quantity },
  })
}

export function updateOwnLine(itemId: number, quantity: number): Promise<CartItem> {
  return apiRequest<CartItem>(`/api/v1/cart/items/${itemId}`, {
    method: 'PUT',
    body: { quantity },
  })
}

export function removeOwnLine(itemId: number): Promise<Cart> {
  return apiRequest<Cart>(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' })
}

export function clearOwnCart(): Promise<Cart> {
  return apiRequest<Cart>('/api/v1/cart/clear', { method: 'DELETE' })
}

export function mergeGuestCart(sessionId: string): Promise<Cart> {
  return apiRequest<Cart>(`/api/v1/cart/merge/${encodeURIComponent(sessionId)}`, {
    method: 'POST',
  })
}

export function validateCart(): Promise<CartValidation> {
  return apiRequest<CartValidation>('/api/v1/cart/validate')
}
