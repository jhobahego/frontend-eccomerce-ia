import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  isCancellableStatus,
  orderStatusLabel,
  paymentStatusLabel,
} from '../api/orders'
import { updateMyProfile } from '../api/users'
import { useOrdersStore } from '../stores/orders'
import { useSessionStore } from '../stores/session'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ME = {
  id: 5,
  email: 'ana@example.es',
  username: 'ana',
  first_name: 'Ana',
  last_name: 'Luz',
  phone: null,
  address: null,
  city: null,
  country: null,
  postal_code: null,
  is_active: true,
  is_superuser: false,
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
}

const SUMMARY = {
  id: 9,
  order_number: 'ORD-0009',
  status: 'pending',
  payment_status: 'pending',
  total_amount: '39.98',
  total_items: 2,
  created_at: '2026-09-26T00:00:00Z',
}

const DETAIL = {
  ...SUMMARY,
  user_id: 5,
  subtotal: '39.98',
  tax_amount: '0.00',
  shipping_cost: '0.00',
  discount_amount: '0.00',
  shipping_address: 'Calle Falsa 123',
  shipping_city: 'Madrid',
  shipping_country: 'ES',
  shipping_postal_code: '28001',
  updated_at: null,
  items: [],
}

const TRACK = {
  order_id: 9,
  status: 'pending',
  timeline: [{ status: 'pending', at: '2026-09-26T00:00:00Z' }],
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

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('profile update contract (T009)', () => {
  it('sends only profile fields, never privilege flags', async () => {
    const seen: Array<{ url: string; body: unknown }> = []
    stubFetch((url, init) => {
      seen.push({ url, body: JSON.parse(String(init?.body ?? '{}')) })
      return jsonResponse({ ...ME, first_name: 'Anita' })
    })
    const updated = await updateMyProfile({ first_name: 'Anita', last_name: 'Luz' })
    expect(updated.first_name).toBe('Anita')
    const sent = seen[0]?.body as Record<string, unknown>
    expect(seen[0]?.url).toContain('/api/v1/users/me')
    expect(sent).toEqual({ first_name: 'Anita', last_name: 'Luz' })
    expect(sent).not.toHaveProperty('is_superuser')
    expect(sent).not.toHaveProperty('is_active')
  })
})

describe('order status vocabulary (T009)', () => {
  it('labels every status in Spanish', () => {
    expect(orderStatusLabel('pending')).toBe('Pendiente')
    expect(orderStatusLabel('confirmed')).toBe('Confirmado')
    expect(orderStatusLabel('processing')).toBe('En preparación')
    expect(orderStatusLabel('shipped')).toBe('Enviado')
    expect(orderStatusLabel('delivered')).toBe('Entregado')
    expect(orderStatusLabel('cancelled')).toBe('Cancelado')
    expect(orderStatusLabel('refunded')).toBe('Reembolsado')
    expect(paymentStatusLabel('paid')).toBe('Pagado')
  })

  it('allows cancel only in early states (client hint, server decides)', () => {
    expect(isCancellableStatus('pending')).toBe(true)
    expect(isCancellableStatus('confirmed')).toBe(true)
    expect(isCancellableStatus('processing')).toBe(false)
    expect(isCancellableStatus('shipped')).toBe(false)
    expect(isCancellableStatus('delivered')).toBe(false)
    expect(isCancellableStatus('cancelled')).toBe(false)
    expect(isCancellableStatus('refunded')).toBe(false)
  })
})

describe('order history and tracking (T009)', () => {
  it('loads the owned history', async () => {
    await loginAsCustomer()
    stubFetch((url) => {
      if (url.endsWith('/api/v1/auth/me')) {
        return jsonResponse(ME)
      }
      return jsonResponse([SUMMARY])
    })
    const orders = useOrdersStore()
    await orders.loadHistory()
    expect(orders.history.map((entry) => entry.order_number)).toEqual(['ORD-0009'])
    expect(orders.error).toBeNull()
  })

  it('loads detail with private tracking', async () => {
    await loginAsCustomer()
    stubFetch((url) => {
      if (url.endsWith('/track')) {
        return jsonResponse(TRACK)
      }
      if (url.endsWith('/api/v1/auth/me')) {
        return jsonResponse(ME)
      }
      return jsonResponse(DETAIL)
    })
    const orders = useOrdersStore()
    await orders.loadOrder(9)
    expect(orders.detail?.order_number).toBe('ORD-0009')
    expect(orders.tracking?.timeline).toHaveLength(1)
  })

  it('reports unknown orders without leaking', async () => {
    await loginAsCustomer()
    stubFetch(() => jsonResponse({ detail: 'Not found' }, 404))
    const orders = useOrdersStore()
    await orders.loadOrder(999)
    expect(orders.detail).toBeNull()
    expect(orders.error?.code).toBe('NOT_FOUND')
  })

  it('adopts the cancelled order into detail and history', async () => {
    await loginAsCustomer()
    stubFetch((url) => {
      if (url.endsWith('/track')) {
        return jsonResponse(TRACK)
      }
      if (url.includes('/cancel')) {
        return jsonResponse({ ...DETAIL, status: 'cancelled' })
      }
      if (url.endsWith('/api/v1/auth/me')) {
        return jsonResponse(ME)
      }
      if (url.endsWith('/api/v1/orders/')) {
        return jsonResponse([SUMMARY])
      }
      return jsonResponse(DETAIL)
    })
    const orders = useOrdersStore()
    await orders.loadHistory()
    await orders.loadOrder(9)
    const cancelled = await orders.cancelOrder(9)
    expect(cancelled?.status).toBe('cancelled')
    expect(orders.detail?.status).toBe('cancelled')
    expect(orders.history[0]?.status).toBe('cancelled')
  })

  it('explains late cancels without leaking', async () => {
    await loginAsCustomer()
    stubFetch((url) => {
      if (url.includes('/cancel')) {
        return jsonResponse({ detail: 'Order cannot be cancelled' }, 409)
      }
      return jsonResponse(DETAIL)
    })
    const orders = useOrdersStore()
    await expect(orders.cancelOrder(9)).resolves.toBeNull()
    expect(orders.error?.message).toContain('cancelar')
  })
})
