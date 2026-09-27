import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  fetchAllOrders,
  fetchUserDetail,
  fetchUsers,
  updateOrderPayment,
  updateOrderStatus,
} from '../api/admin'
import { useAdminStore } from '../stores/admin'
import { useSessionStore } from '../stores/session'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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

const ORDER = {
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
  items: [],
}

const ADMIN = {
  id: 1,
  email: 'admin@example.es',
  username: 'admin',
  first_name: 'Admin',
  last_name: 'Tienda',
  is_active: true,
  is_superuser: true,
  created_at: '2026-09-26T00:00:00Z',
}

const CUSTOMER = {
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

async function loginAsAdmin(): Promise<void> {
  stubFetch((url) => {
    if (url.endsWith('/api/v1/auth/login')) {
      return jsonResponse({ access_token: 'admin-tok', refresh_token: 'r1' })
    }
    return jsonResponse(ADMIN)
  })
  await useSessionStore().login('admin', 's3cret')
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

describe('admin orders contracts (T012)', () => {
  it('lists all orders through the admin endpoint', async () => {
    const seen: string[] = []
    stubFetch((url, init) => {
      seen.push(`${init?.method ?? 'GET'} ${url}`)
      return jsonResponse([SUMMARY])
    })
    const orders = await fetchAllOrders()
    expect(orders.map((entry) => entry.order_number)).toEqual(['ORD-0009'])
    expect(seen).toContain('GET http://test/api/v1/orders/all')
  })

  it('filters the admin list by order status', async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      return jsonResponse([])
    })
    await fetchAllOrders({ status: 'shipped' })
    expect(seen.some((url) => url.includes('/api/v1/orders/all?status=shipped'))).toBe(true)
  })

  it('transitions status via required query params without a JSON body', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = []
    stubFetch((url, init) => {
      seen.push({ url, init })
      return jsonResponse({ ...ORDER, status: 'shipped' })
    })
    const updated = await updateOrderStatus(9, 'shipped')
    expect(updated.status).toBe('shipped')
    const call = seen[0]
    expect(call?.url).toBe('http://test/api/v1/orders/9/status?new_status=shipped')
    expect(call?.init?.method).toBe('PUT')
    expect(call?.init?.body).toBeUndefined()
  })

  it('transitions payment status via required query params', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = []
    stubFetch((url, init) => {
      seen.push({ url, init })
      return jsonResponse({ ...ORDER, payment_status: 'paid' })
    })
    const updated = await updateOrderPayment(9, 'paid')
    expect(updated.payment_status).toBe('paid')
    const call = seen[0]
    expect(call?.url).toBe('http://test/api/v1/orders/9/payment-status?payment_status=paid')
    expect(call?.init?.method).toBe('PUT')
  })
})

describe('admin users contracts (T012)', () => {
  it('lists and reads users by id', async () => {
    stubFetch((url) => {
      if (url.endsWith('/api/v1/users/5')) {
        return jsonResponse(CUSTOMER)
      }
      return jsonResponse([ADMIN, CUSTOMER])
    })
    const users = await fetchUsers()
    expect(users.map((user) => user.username)).toEqual(['admin', 'ana'])
    const one = await fetchUserDetail(5)
    expect(one.email).toBe('ana@example.es')
  })
})

describe('admin orders/users store (T012)', () => {
  it('loads orders, filters by status and propagates transitions', async () => {
    await loginAsAdmin()
    stubFetch((url, init) => {
      const method = init?.method ?? 'GET'
      if (method === 'PUT' && url.includes('/status?new_status=')) {
        return jsonResponse({ ...ORDER, status: 'shipped' })
      }
      if (method === 'PUT' && url.includes('/payment-status?payment_status=')) {
        return jsonResponse({ ...ORDER, status: 'shipped', payment_status: 'paid' })
      }
      if (url.includes('/api/v1/orders/all')) {
        return jsonResponse([{ ...SUMMARY }])
      }
      if (url.includes('/api/v1/users/')) {
        return jsonResponse([ADMIN, CUSTOMER])
      }
      return jsonResponse([])
    })
    const admin = useAdminStore()
    await admin.loadOrders()
    expect(admin.orders.map((entry) => entry.order_number)).toEqual(['ORD-0009'])
    await admin.loadOrders('shipped')
    expect(admin.orderFilter).toBe('shipped')
    await admin.loadOrders()
    await admin.setOrderStatus(9, 'shipped')
    expect(admin.orders[0]?.status).toBe('shipped')
    await admin.setOrderPayment(9, 'paid')
    expect(admin.orders[0]?.payment_status).toBe('paid')
    expect(admin.error).toBeNull()
  })

  it('loads users and selects detail', async () => {
    await loginAsAdmin()
    stubFetch((url) => {
      if (url.endsWith('/api/v1/users/5')) {
        return jsonResponse(CUSTOMER)
      }
      return jsonResponse([ADMIN, CUSTOMER])
    })
    const admin = useAdminStore()
    await admin.loadUsers()
    expect(admin.users.map((user) => user.username)).toEqual(['admin', 'ana'])
    await admin.loadUserDetail(5)
    expect(admin.selectedUser?.email).toBe('ana@example.es')
    expect(admin.error).toBeNull()
  })

  it('normalizes admin order failures without leaking', async () => {
    await loginAsAdmin()
    stubFetch(() => jsonResponse({ detail: 'boom' }, 500))
    const admin = useAdminStore()
    await admin.loadOrders()
    expect(admin.error?.code).toBe('REQUEST')
  })
})
