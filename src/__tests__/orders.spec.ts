import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { buildOrderCreate, validateShipping, type ShippingForm } from '../api/orders'
import { useCartStore } from '../stores/cart'
import { useOrdersStore } from '../stores/orders'
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
  user_id: 5,
  session_id: null,
  is_active: true,
  items: [LINE],
  total_items: 2,
  total_amount: '39.98',
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
}

const ORDER = {
  id: 9,
  order_number: 'ORD-0009',
  user_id: 5,
  status: 'pending',
  payment_status: 'pending',
  subtotal: '39.98',
  tax_amount: '0.00',
  shipping_cost: '0.00',
  discount_amount: '0.00',
  total_amount: '39.98',
  total_items: 2,
  shipping_address: 'Calle Falsa 123',
  shipping_city: 'Madrid',
  shipping_country: 'ES',
  shipping_postal_code: '28001',
  items: [],
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

const FORM: ShippingForm = {
  shipping_address: 'Calle Falsa 123',
  shipping_city: 'Madrid',
  shipping_country: 'ES',
  shipping_postal_code: '28001',
  payment_method: 'tarjeta',
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) =>
      handler(url, init),
    ),
  )
}

async function loginAsCustomer(): Promise<void> {
  stubFetch((url) => {
    if (url.endsWith('/api/v1/auth/login')) {
      return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
    }
    return jsonResponse(ME)
  })
  await useSessionStore().login('ana', 's3cret')
}

function cartBackend(
  handler?: (url: string, init?: RequestInit) => Response,
  orderStatus?: { status: number; body: unknown },
): string[] {
  const seen: string[] = []
  stubFetch((url, init) => {
    seen.push(`${init?.method ?? 'GET'} ${url}`)
    if (url.endsWith('/api/v1/cart/validate')) {
      return jsonResponse({ valid: true, issues: [] })
    }
    if (url.endsWith('/api/v1/orders/')) {
      if (orderStatus !== undefined) {
        return jsonResponse(orderStatus.body, orderStatus.status)
      }
      return jsonResponse(ORDER)
    }
    if (url.endsWith('/api/v1/cart/clear')) {
      return jsonResponse({ ...CART, items: [], total_items: 0, total_amount: '0.00' })
    }
    if (handler !== undefined) {
      return handler(url, init)
    }
    return jsonResponse(CART)
  })
  return seen
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

describe('order create contract (T008)', () => {
  it('maps cart lines and trims addresses, omitting empty optionals', () => {
    const body = buildOrderCreate(CART, { ...FORM, notes: '  ', shipping_city: ' Madrid ' })
    expect(body.items).toEqual([{ product_id: 1, quantity: 2 }])
    expect(body.shipping_city).toBe('Madrid')
    expect(body).not.toHaveProperty('notes')
    expect(body.payment_method).toBe('tarjeta')
  })

  it('flags missing shipping fields before any request', () => {
    const errors = validateShipping({
      shipping_address: '',
      shipping_city: 'Madrid',
      shipping_country: '',
      shipping_postal_code: '   ',
    })
    expect(Object.keys(errors).sort()).toEqual([
      'shipping_address',
      'shipping_country',
      'shipping_postal_code',
    ])
  })

  it('accepts a complete form', () => {
    expect(validateShipping(FORM)).toEqual({})
  })
})

describe('place order (T008)', () => {
  it('creates the order from the served cart and resets it', async () => {
    await loginAsCustomer()
    const seen = cartBackend()
    const cart = useCartStore()
    await cart.loadCart()
    const orders = useOrdersStore()
    const placed = await orders.placeOrder(FORM)
    expect(placed?.order_number).toBe('ORD-0009')
    expect(orders.order?.order_number).toBe('ORD-0009')
    const post = seen.find((call) => call.startsWith('POST') && call.endsWith('/api/v1/orders/'))
    expect(post).toBeDefined()
    expect(cart.cart?.items).toEqual([])
  })

  it('never posts when the cart is blocked', async () => {
    await loginAsCustomer()
    const seen: string[] = []
    stubFetch((url, init) => {
      seen.push(`${init?.method ?? 'GET'} ${url}`)
      if (url.endsWith('/api/v1/cart/validate')) {
        return jsonResponse({
          valid: false,
          issues: [{ product_id: 1, available: 0, requested: 2 }],
        })
      }
      return jsonResponse(CART)
    })
    const cart = useCartStore()
    await cart.loadCart()
    const orders = useOrdersStore()
    await expect(orders.placeOrder(FORM)).resolves.toBeNull()
    expect(seen.some((call) => call.includes('/api/v1/orders/'))).toBe(false)
    expect(orders.error?.code).toBe('BLOCKED')
  })

  it('explains out-of-stock conflicts without leaking', async () => {
    await loginAsCustomer()
    cartBackend(undefined, {
      status: 409,
      body: { detail: 'Insufficient stock for one or more items' },
    })
    const cart = useCartStore()
    await cart.loadCart()
    const orders = useOrdersStore()
    await expect(orders.placeOrder(FORM)).resolves.toBeNull()
    expect(orders.error?.code).toBe('CONFLICT')
    expect(orders.error?.message).toContain('stock')
  })

  it('refuses invalid forms and empty carts without posting', async () => {
    await loginAsCustomer()
    const seen = cartBackend()
    const orders = useOrdersStore()
    await expect(orders.placeOrder({ ...FORM, shipping_address: '' })).resolves.toBeNull()
    expect(Object.keys(orders.fieldErrors)).toContain('shipping_address')
    expect(seen.filter((call) => call.includes('/api/v1/orders/'))).toEqual([])

    stubFetch((url) => {
      if (url.endsWith('/api/v1/cart/validate')) {
        return jsonResponse({ valid: true, issues: [] })
      }
      return jsonResponse({ ...CART, items: [], total_items: 0, total_amount: '0.00' })
    })
    const cart = useCartStore()
    await cart.loadCart()
    await expect(orders.placeOrder(FORM)).resolves.toBeNull()
    expect(orders.error?.message).toContain('vacía')
    expect(seen.filter((call) => call.includes('/api/v1/orders/'))).toEqual([])
  })
})
