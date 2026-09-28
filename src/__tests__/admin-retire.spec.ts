import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import { countCategoryProducts, useAdminStore } from '../stores/admin'
import { useSessionStore } from '../stores/session'
import AdminCategoriesView from '../views/AdminCategoriesView.vue'
import AdminProductsView from '../views/AdminProductsView.vue'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const COCINA = {
  id: 2,
  name: 'Cocina',
  slug: 'cocina',
  description: 'Todo para la cocina',
  is_active: true,
  parent_id: null,
  image_url: null,
  sort_order: 0,
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
}

const HOGAR = {
  id: 3,
  name: 'Hogar',
  slug: 'hogar',
  description: null,
  is_active: true,
  parent_id: null,
  image_url: null,
  sort_order: 1,
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
}

const TETERA = {
  id: 1,
  name: 'Tetera',
  slug: 'tetera',
  sku: 'TET-001',
  price: '19.99',
  sale_price: null,
  description: 'Tetera de acero inoxidable',
  short_description: null,
  stock_quantity: 4,
  min_stock_level: 5,
  is_active: true,
  is_featured: true,
  images: null,
  category_id: 2,
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
  current_price: '19.99',
  is_in_stock: true,
  is_low_stock: true,
}

const TAZA = { ...TETERA, id: 6, name: 'Taza', slug: 'taza', sku: 'TAZ-006', category_id: 3 }

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

const ORDER_SUMMARY = {
  id: 9,
  order_number: 'ORD-0009',
  status: 'pending',
  payment_status: 'pending',
  total_amount: '39.98',
  total_items: 2,
  created_at: '2026-09-26T00:00:00Z',
}

const ORDER_DETAIL = {
  ...ORDER_SUMMARY,
  user_id: 5,
  subtotal: '39.98',
  tax_amount: '0.00',
  shipping_cost: '0.00',
  discount_amount: '0.00',
  shipping_address: 'Calle Falsa 123',
  shipping_city: 'Madrid',
  shipping_country: 'ES',
  shipping_postal_code: '28001',
  items: [{ product_id: 1, quantity: 2, unit_price: '19.99', total_price: '39.98' }],
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

/** Serves the admin catalog + order reads; records every write for assertions. */
function stubAdminReads(seen: string[]): void {
  stubFetch((url, init) => {
    const method = init?.method ?? 'GET'
    seen.push(`${method} ${url}`)
    if (method !== 'GET') {
      return jsonResponse({})
    }
    if (url.includes('/products/low-stock')) {
      return jsonResponse([TETERA])
    }
    if (url.includes('/api/v1/products')) {
      return jsonResponse([TETERA, TAZA])
    }
    if (url.endsWith('/api/v1/orders/9')) {
      return jsonResponse(ORDER_DETAIL)
    }
    if (url.includes('/api/v1/orders/all')) {
      return jsonResponse([ORDER_SUMMARY])
    }
    if (url.includes('/api/v1/categories')) {
      return jsonResponse([COCINA, HOGAR])
    }
    return jsonResponse({})
  })
}

function findButton(wrapper: ReturnType<typeof mount>, name: string) {
  const found = wrapper.findAll('button').find((button) => button.text().trim() === name)
  expect(found?.exists() ?? false, `button "${name}" missing`).toBe(true)
  return found
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

describe('retire dependencies (T013)', () => {
  it('counts products per category without touching the network', () => {
    expect(countCategoryProducts([TETERA, TAZA] as never, 2)).toBe(1)
    expect(countCategoryProducts([TETERA, TAZA] as never, 3)).toBe(1)
    expect(countCategoryProducts([TETERA, TAZA] as never, 99)).toBe(0)
  })

  it('derives product movements from served order details', async () => {
    await loginAsAdmin()
    const seen: string[] = []
    stubAdminReads(seen)
    const admin = useAdminStore()
    await admin.loadOrderMovements()
    expect(admin.orderProductIds).toContain(1)
    expect(admin.orderProductIds).not.toContain(6)
    expect(admin.hasMovements(1)).toBe(true)
    expect(admin.hasMovements(6)).toBe(false)
    expect(admin.error).toBeNull()
  })
})

describe('category retire confirmation (T013)', () => {
  it('asks explicitly before removing a category with products', async () => {
    await loginAsAdmin()
    const seen: string[] = []
    stubAdminReads(seen)
    const wrapper = mount(AdminCategoriesView)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Cocina')
    })

    await findButton(wrapper, 'Eliminar Cocina')?.trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/tiene 1 producto/i)
    expect(seen.some((call) => call.startsWith('DELETE'))).toBe(false)

    await findButton(wrapper, 'Cancelar')?.trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Cocina')

    await findButton(wrapper, 'Eliminar Cocina')?.trigger('click')
    await findButton(wrapper, 'Confirmar eliminación de Cocina')?.trigger('click')
    await vi.waitFor(() => {
      expect(seen.some((call) => call === 'DELETE http://test/api/v1/categories/2')).toBe(true)
    })
  })

  it('removes a category without products directly', async () => {
    await loginAsAdmin()
    const seen: string[] = []
    stubFetch((url, init) => {
      const method = init?.method ?? 'GET'
      seen.push(`${method} ${url}`)
      if (method !== 'GET') {
        return jsonResponse({})
      }
      if (url.includes('/api/v1/products')) {
        return jsonResponse([])
      }
      return jsonResponse([COCINA, HOGAR])
    })
    const wrapper = mount(AdminCategoriesView)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Hogar')
    })

    await findButton(wrapper, 'Eliminar Hogar')?.trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(seen).toContain('DELETE http://test/api/v1/categories/3')
  })
})

describe('product retire confirmation (T013)', () => {
  it('asks explicitly before removing a product with order movements', async () => {
    await loginAsAdmin()
    const seen: string[] = []
    stubAdminReads(seen)
    const wrapper = mount(AdminProductsView)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Tetera')
    })
    await vi.waitFor(() => {
      expect(useAdminStore().orderProductIds).toContain(1)
    })

    await findButton(wrapper, 'Eliminar Tetera')?.trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/aparece en 1 pedido/i)
    expect(seen.some((call) => call.startsWith('DELETE'))).toBe(false)

    await findButton(wrapper, 'Confirmar eliminación de Tetera')?.trigger('click')
    await vi.waitFor(() => {
      expect(seen.some((call) => call === 'DELETE http://test/api/v1/products/1')).toBe(true)
    })
  })

  it('removes a product without movements directly', async () => {
    await loginAsAdmin()
    const seen: string[] = []
    stubAdminReads(seen)
    const wrapper = mount(AdminProductsView)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Taza')
    })
    await vi.waitFor(() => {
      expect(useAdminStore().orderProductIds).toContain(1)
    })

    await findButton(wrapper, 'Eliminar Taza')?.trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(seen).toContain('DELETE http://test/api/v1/products/6')
  })
})
