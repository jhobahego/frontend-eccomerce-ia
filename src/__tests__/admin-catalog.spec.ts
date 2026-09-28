import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  fetchLowStock,
  setProductStock,
  toggleProductFeatured,
  updateCategory,
  updateProduct,
} from '../api/admin'
import { useAdminStore } from '../stores/admin'
import { useSessionStore } from '../stores/session'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CATEGORY = {
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

const PRODUCT = {
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

describe('admin catalog contracts (T010)', () => {
  it('creates categories with method, path and body', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = []
    stubFetch((url, init) => {
      seen.push({ url, init })
      return jsonResponse({ ...CATEGORY, id: 100 })
    })
    const created = await createCategory({ name: 'Bebidas', slug: 'bebidas' })
    expect(created.id).toBe(100)
    const call = seen[0]
    expect(call?.url).toBe('http://test/api/v1/categories/')
    expect(call?.init?.method).toBe('POST')
    expect(JSON.parse(String(call?.init?.body))).toMatchObject({
      name: 'Bebidas',
      slug: 'bebidas',
    })
  })

  it('updates and removes categories by id', async () => {
    const seen: string[] = []
    stubFetch((url, init) => {
      seen.push(`${init?.method ?? 'GET'} ${url}`)
      return jsonResponse({ ...CATEGORY, name: 'Cocina nueva' })
    })
    await updateCategory(2, { name: 'Cocina nueva' })
    await deleteCategory(2)
    expect(seen).toContain('PUT http://test/api/v1/categories/2')
    expect(seen).toContain('DELETE http://test/api/v1/categories/2')
  })

  it('creates products sending prices verbatim, never computed', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = []
    stubFetch((url, init) => {
      seen.push({ url, init })
      return jsonResponse({ ...PRODUCT, id: 101 })
    })
    await createProduct({
      name: 'Cafetera',
      slug: 'cafetera',
      sku: 'CAF-001',
      price: '49.99',
      category_id: 2,
    })
    const call = seen[0]
    expect(call?.url).toBe('http://test/api/v1/products/')
    expect(JSON.parse(String(call?.init?.body))).toMatchObject({
      price: '49.99',
      sku: 'CAF-001',
    })
  })

  it('updates products, toggles featured and adjusts stock by id', async () => {
    const seen: string[] = []
    stubFetch((url, init) => {
      seen.push(`${init?.method ?? 'GET'} ${url} ${String(init?.body ?? '')}`)
      return jsonResponse(PRODUCT)
    })
    await updateProduct(1, { name: 'Tetera grande' })
    await toggleProductFeatured(1, false)
    await setProductStock(1, 25)
    expect(
      seen.some((call) => call.startsWith('PUT') && call.includes('/api/v1/products/1 ')),
    ).toBe(true)
    expect(seen.some((call) => call.includes('"is_featured":false'))).toBe(true)
    expect(
      seen.some(
        (call) =>
          call.includes('/api/v1/products/1/stock') &&
          call.includes('"quantity":25') &&
          call.includes('"operation":"set"'),
      ),
    ).toBe(true)
    await deleteProduct(1)
    expect(seen.some((call) => call.startsWith('DELETE'))).toBe(true)
  })

  it('reads the admin-only low-stock list', async () => {
    stubFetch((url) => jsonResponse(url.includes('low-stock') ? [PRODUCT] : []))
    const low = await fetchLowStock()
    expect(low.map((product) => product.slug)).toEqual(['tetera'])
  })
})

describe('admin store (T010)', () => {
  it('loads categories, products and low stock together', async () => {
    await loginAsAdmin()
    stubFetch((url) => {
      if (url.includes('/products/low-stock')) {
        return jsonResponse([PRODUCT])
      }
      if (url.includes('/api/v1/products/')) {
        return jsonResponse([PRODUCT])
      }
      return jsonResponse([CATEGORY])
    })
    const admin = useAdminStore()
    await admin.loadAll()
    expect(admin.categories.map((node) => node.slug)).toEqual(['cocina'])
    expect(admin.products).toHaveLength(1)
    expect(admin.lowStock.map((product) => product.slug)).toEqual(['tetera'])
    expect(admin.error).toBeNull()
  })

  it('creates a category and refreshes the list', async () => {
    await loginAsAdmin()
    let posted = 0
    stubFetch((url, init) => {
      if ((init?.method ?? 'GET') === 'POST') {
        posted += 1
        return jsonResponse({ ...CATEGORY, id: 100, name: 'Bebidas', slug: 'bebidas' })
      }
      return jsonResponse([CATEGORY])
    })
    const admin = useAdminStore()
    await admin.createCategory({ name: 'Bebidas', slug: 'bebidas' })
    expect(posted).toBe(1)
    expect(admin.error).toBeNull()
  })

  it('removes a product and refreshes the list', async () => {
    await loginAsAdmin()
    stubFetch((url, init) => {
      if ((init?.method ?? 'GET') === 'DELETE') {
        return jsonResponse({ ...PRODUCT })
      }
      if (url.includes('/products/low-stock')) {
        return jsonResponse([])
      }
      if (url.includes('/api/v1/products/')) {
        return jsonResponse([])
      }
      return jsonResponse([CATEGORY])
    })
    const admin = useAdminStore()
    await admin.loadAll()
    await admin.removeProduct(1)
    expect(admin.products).toEqual([])
    expect(admin.error).toBeNull()
  })

  it('updates products, stock and featured through refetch', async () => {
    await loginAsAdmin()
    const seen: string[] = []
    stubFetch((url, init) => {
      seen.push(`${init?.method ?? 'GET'} ${url}`)
      if ((init?.method ?? 'GET') !== 'GET') {
        return jsonResponse({ ...PRODUCT })
      }
      if (url.includes('/products/low-stock')) {
        return jsonResponse([])
      }
      if (url.includes('/api/v1/products/')) {
        return jsonResponse([PRODUCT])
      }
      return jsonResponse([CATEGORY])
    })
    const admin = useAdminStore()
    await admin.updateProduct(1, { name: 'Tetera grande' })
    await admin.setStock(1, 25)
    await admin.setFeatured(1, false)
    expect(seen.filter((call) => call.startsWith('PUT'))).toHaveLength(3)
    expect(admin.error).toBeNull()
  })

  it('normalizes admin failures without leaking', async () => {
    await loginAsAdmin()
    stubFetch(() => jsonResponse({ detail: 'boom' }, 500))
    const admin = useAdminStore()
    await admin.loadAll()
    expect(admin.error?.code).toBe('REQUEST')
  })
})
