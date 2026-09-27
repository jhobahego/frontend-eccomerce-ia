import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import ProductCard from '../components/ProductCard.vue'
import AdminView from '../views/AdminView.vue'
import HomeView from '../views/HomeView.vue'
import NotFoundView from '../views/NotFoundView.vue'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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

const CART_ITEM = {
  id: 7,
  cart_id: 3,
  product_id: 1,
  quantity: 1,
  unit_price: '19.99',
  subtotal: '19.99',
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
  product: { name: 'Tetera', sku: 'TET-001', price: '19.99', category_id: 2 },
}

const CART = {
  id: 3,
  user_id: null,
  session_id: 'sess-1',
  is_active: true,
  items: [CART_ITEM],
  total_items: 1,
  total_amount: '19.99',
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) =>
      handler(url, init),
    ),
  )
}

function mountWithShell(component: unknown, props?: Record<string, unknown>): ReturnType<typeof mount> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
  })
  return mount(component as never, {
    props,
    global: {
      plugins: [pinia, router],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
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

describe('storefront views coverage (T014)', () => {
  it('renders the product card with price, availability and add-to-cart', async () => {
    const seen: string[] = []
    stubFetch((url, init) => {
      seen.push(`${init?.method ?? 'GET'} ${url}`)
      if ((init?.method ?? 'GET') === 'POST') {
        return jsonResponse(CART_ITEM)
      }
      return jsonResponse(CART)
    })
    const wrapper = mountWithShell(ProductCard, { product: PRODUCT })
    expect(wrapper.text()).toContain('Tetera')
    expect(wrapper.text()).toContain('Disponible')
    expect(wrapper.text()).toContain('Sin imagen')

    await wrapper.find('button').trigger('click')
    await vi.waitFor(
      () => {
        // As a guest the line posts to the session cart, then refetches.
        expect(
          seen.some(
            (call) => call.startsWith('POST') && call.includes('/api/v1/cart/session/'),
          ),
        ).toBe(true)
      },
      { timeout: 3000 },
    )
  })

  it('renders the home storefront with featured products and categories', async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      if (url.includes('/products/featured')) {
        return jsonResponse([PRODUCT])
      }
      if (url.includes('/categories/hierarchy')) {
        return jsonResponse([])
      }
      return jsonResponse([])
    })
    const wrapper = mountWithShell(HomeView)
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Tetera')
      },
      { timeout: 3000 },
    )
    expect(wrapper.text()).toContain('Destacados')
    expect(wrapper.text()).toContain('Categorías')
  })

  it('renders the static admin dashboard and not-found views', () => {
    const admin = mountWithShell(AdminView)
    expect(admin.text()).toContain('Administración')
    expect(admin.text()).toContain('Pedidos')

    const missing = mountWithShell(NotFoundView)
    expect(missing.text()).toContain('Página no encontrada')
  })
})
