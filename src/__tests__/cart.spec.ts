import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { loadGuestSessionId, saveGuestSessionId } from '../api/cart'
import { useCartStore } from '../stores/cart'
import { useSessionStore } from '../stores/session'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const LINE = {
  id: 7,
  cart_id: 3,
  product_id: 1,
  quantity: 2,
  unit_price: '19.99',
  subtotal: '39.98',
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
  product: { name: 'Tetera', sku: 'TET-001', price: '19.99', category_id: 2 },
}

const CART = {
  id: 3,
  user_id: null,
  session_id: 'sess-1',
  is_active: true,
  items: [LINE],
  total_items: 2,
  total_amount: '39.98',
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
}

const ME = {
  id: 5,
  email: 'ana@example.es',
  username: 'ana',
  first_name: 'Ana',
  last_name: 'Luz',
  is_active: true,
  is_superuser: false,
  created_at: '2026-09-26T00:00:00Z',
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) =>
      handler(url, init),
    ),
  )
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('guest cart persistence (T007)', () => {
  it('creates and persists a versioned guest id on first add', async () => {
    stubFetch((url) => {
      if (url.includes('/cart/session/') && url.endsWith('/items')) {
        return jsonResponse(LINE)
      }
      return jsonResponse(CART)
    })
    const cart = useCartStore()
    await cart.addItem(1, 1)
    const stored = loadGuestSessionId()
    expect(stored).not.toBeNull()
    expect(typeof stored).toBe('string')
  })

  it('ignores a corrupt stored guest id instead of throwing', async () => {
    window.localStorage.setItem('eia.guest_cart.v1', 'not-json{{{')
    stubFetch(() => jsonResponse(CART))
    const cart = useCartStore()
    await cart.addItem(1, 1)
    expect(loadGuestSessionId()).not.toBe('not-json{{{')
    expect(cart.error).toBeNull()
  })

  it('loads the session cart for returning guests, nothing without id', async () => {
    let cartCalls = 0
    stubFetch((url) => {
      if (url.includes('/api/v1/cart')) {
        cartCalls += 1
      }
      return jsonResponse(CART)
    })
    saveGuestSessionId('sess-abc')
    const cart = useCartStore()
    await cart.loadCart()
    expect(cartCalls).toBe(1)
    expect(cart.cart?.items).toHaveLength(1)

    window.localStorage.clear()
    setActivePinia(createPinia())
    const fresh = useCartStore()
    await fresh.loadCart()
    expect(fresh.cart).toBeNull()
  })
})

describe('cart mutations (T007)', () => {
  it('adds through the session endpoint as guest, own endpoint when authenticated', async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      if (url.endsWith('/api/v1/auth/login')) {
        return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
      }
      if (url.endsWith('/api/v1/auth/me')) {
        return jsonResponse(ME)
      }
      if (url.endsWith('/items')) {
        return jsonResponse(LINE)
      }
      return jsonResponse(CART)
    })
    saveGuestSessionId('sess-1')
    const guest = useCartStore()
    await guest.addItem(1, 1)
    expect(seen.some((url) => url.includes('/cart/session/sess-1/items'))).toBe(true)

    await useSessionStore().login('ana', 's3cret')
    seen.length = 0
    const owned = useCartStore()
    await owned.addItem(1, 1)
    expect(seen.some((url) => url.endsWith('/api/v1/cart/items'))).toBe(true)
  })

  it('adopts served totals verbatim, never recomputed', async () => {
    stubFetch(() => jsonResponse({ ...CART, total_amount: '39.98' }))
    saveGuestSessionId('sess-1')
    const cart = useCartStore()
    await cart.loadCart()
    expect(cart.summary?.total_amount).toBe('39.98')
    expect(cart.summary?.total_items).toBe(2)
  })

  it('rolls back the quantity when the update fails', async () => {
    stubFetch((url) => {
      if (url.includes('/cart/items/7')) {
        return jsonResponse({ detail: 'boom' }, 500)
      }
      return jsonResponse(CART)
    })
    saveGuestSessionId('sess-1')
    const cart = useCartStore()
    await cart.loadCart()
    expect(cart.cart?.items[0]?.quantity).toBe(2)
    await cart.updateLine(7, 5)
    expect(cart.cart?.items[0]?.quantity).toBe(2)
    expect(cart.error?.code).toBe('REQUEST')
  })

  it('removes lines and clears through refetch', async () => {
    stubFetch((url) => {
      if (url.includes('/cart/items/7') || url.includes('/cart/clear')) {
        return jsonResponse({ ...CART, items: [], total_items: 0, total_amount: '0.00' })
      }
      return jsonResponse(CART)
    })
    saveGuestSessionId('sess-1')
    const cart = useCartStore()
    await cart.loadCart()
    await cart.removeLine(7)
    expect(cart.cart?.items).toEqual([])
    await cart.clearCart()
    expect(cart.cart?.total_amount).toBe('0.00')
  })
})

describe('merge on login (T007)', () => {
  it('merges the guest cart once and drops the guest id', async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      if (url.endsWith('/api/v1/auth/login')) {
        return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
      }
      if (url.includes('/cart/merge/')) {
        return jsonResponse(CART)
      }
      if (url.endsWith('/api/v1/auth/me')) {
        return jsonResponse(ME)
      }
      return jsonResponse({ ...CART, user_id: 5, session_id: null })
    })
    saveGuestSessionId('sess-1')
    await useSessionStore().login('ana', 's3cret')
    const cart = useCartStore()
    await cart.mergeOnLogin()
    expect(seen.filter((url) => url.includes('/cart/merge/'))).toHaveLength(1)
    expect(loadGuestSessionId()).toBeNull()
    expect(cart.cart?.items).toHaveLength(1)
    expect(cart.cart?.user_id).toBe(5)
  })

  it('skips the merge call without a guest id', async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      if (url.endsWith('/api/v1/auth/login')) {
        return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
      }
      if (url.endsWith('/api/v1/auth/me')) {
        return jsonResponse(ME)
      }
      return jsonResponse({ ...CART, user_id: 5, session_id: null })
    })
    await useSessionStore().login('ana', 's3cret')
    const cart = useCartStore()
    await cart.mergeOnLogin()
    expect(seen.some((url) => url.includes('/cart/merge/'))).toBe(false)
  })

  it('validates stock as served valid or blocked lines', async () => {
    stubFetch(() => jsonResponse({ valid: true, issues: [] }))
    const cart = useCartStore()
    await expect(cart.validateStock()).resolves.toEqual({ valid: true, issues: [] })

    stubFetch(() =>
      jsonResponse({
        valid: false,
        issues: [{ product_id: 1, available: 0, requested: 2 }],
      }),
    )
    await expect(cart.validateStock()).resolves.toMatchObject({ valid: false })
    expect(cart.validation?.issues).toHaveLength(1)
  })
})
