import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Component } from 'vue'

import { saveGuestSessionId } from '../api/cart'
import AccountView from '../views/AccountView.vue'
import AdminCategoriesView from '../views/AdminCategoriesView.vue'
import AdminProductsView from '../views/AdminProductsView.vue'
import CatalogView from '../views/CatalogView.vue'
import CheckoutView from '../views/CheckoutView.vue'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CART = {
  id: 3,
  user_id: null,
  session_id: 'sess-1',
  is_active: true,
  items: [
    {
      id: 7,
      cart_id: 3,
      product_id: 1,
      quantity: 2,
      unit_price: '19.99',
      subtotal: '39.98',
      created_at: '2026-09-26T00:00:00Z',
      updated_at: null,
      product: { name: 'Tetera', sku: 'TET-001', price: '19.99', category_id: 2 },
    },
  ],
  total_items: 2,
  total_amount: '39.98',
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
}

const PRODUCT = {
  id: 6,
  name: 'Taza',
  slug: 'taza',
  sku: 'TAZ-006',
  price: '9.99',
  sale_price: null,
  description: null,
  short_description: null,
  stock_quantity: 40,
  min_stock_level: 5,
  is_active: true,
  is_featured: false,
  images: null,
  category_id: 3,
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
  current_price: '9.99',
  is_in_stock: true,
  is_low_stock: false,
}

const COCINA = {
  id: 2,
  name: 'Cocina',
  slug: 'cocina',
  description: null,
  is_active: true,
  parent_id: null,
  image_url: null,
  sort_order: 0,
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

function mountView(component: Component): ReturnType<typeof mount> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
  })
  return mount(component, {
    global: {
      plugins: [pinia, router],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

/**
 * Plain mount without the router plugin. Admin/account views use no routing,
 * and mounting them with an un-navigated router leaves their async lists
 * unflushed in jsdom (proven pattern from admin-retire.spec.ts) — a
 * test-harness-only quirk, unrelated to shipped code.
 */
function mountPlain(component: Component): ReturnType<typeof mount> {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(component, {
    global: {
      plugins: [pinia],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

function fieldAlerts(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper
    .findAll('[role="alert"]')
    .map((node) => node.text().trim())
    .filter((text) => text !== '')
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

describe('field errors are announced (branch review)', () => {
  it('checkout announces every missing shipping field next to its input', async () => {
    saveGuestSessionId('sess-1')
    stubFetch((url) => {
      if (url.includes('/api/v1/cart/session/')) {
        return jsonResponse(CART)
      }
      if (url.includes('/api/v1/cart/validate')) {
        return jsonResponse({ valid: true, issues: [] })
      }
      return jsonResponse(CART)
    })
    const wrapper = mountView(CheckoutView)
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Confirmar pedido')
      },
      { timeout: 3000 },
    )
    await vi.waitFor(
      () => {
        expect(wrapper.find('form').exists()).toBe(true)
      },
      { timeout: 3000 },
    )
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    const alerts = fieldAlerts(wrapper)
    expect(alerts).toHaveLength(4)
    for (const id of ['checkout-address', 'checkout-city', 'checkout-country', 'checkout-postal']) {
      const input = wrapper.find(`#${id}`)
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-describedby')).toBe(`${id}-error`)
    }
  })

  it('account announces missing profile names next to their inputs', async () => {
    const wrapper = mountPlain(AccountView)
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(fieldAlerts(wrapper)).toHaveLength(2)
    for (const id of ['account-first-name', 'account-last-name']) {
      const input = wrapper.find(`#${id}`)
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-describedby')).toBe(`${id}-error`)
    }
  })

  it('admin category creation announces missing name and slug', async () => {
    stubFetch((url, init) => {
      if ((init?.method ?? 'GET') !== 'GET') {
        return jsonResponse({})
      }
      if (url.includes('/api/v1/products')) {
        return jsonResponse([])
      }
      return jsonResponse([COCINA])
    })
    const wrapper = mountPlain(AdminCategoriesView)
    // Wait for post-load content: the create section renders even before the
    // first fetch settles (loading starts false), so waiting for its heading
    // would resolve on the initial render and race the list paint.
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Cocina')
      },
      { timeout: 3000 },
    )
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(fieldAlerts(wrapper)).toHaveLength(2)
    for (const id of ['admin-category-name', 'admin-category-slug']) {
      const input = wrapper.find(`#${id}`)
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-describedby')).toBe(`${id}-error`)
    }
  })

  it('admin product creation announces every missing required field', async () => {
    stubFetch((url, init) => {
      if ((init?.method ?? 'GET') !== 'GET') {
        return jsonResponse({})
      }
      if (url.includes('/products/low-stock')) {
        return jsonResponse([])
      }
      if (url.includes('/api/v1/products')) {
        return jsonResponse([PRODUCT])
      }
      if (url.includes('/api/v1/orders/all')) {
        return jsonResponse([])
      }
      return jsonResponse([COCINA])
    })
    const wrapper = mountPlain(AdminProductsView)
    // Same post-load rule as above: wait for served content, not chrome.
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Taza')
      },
      { timeout: 3000 },
    )
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(fieldAlerts(wrapper)).toHaveLength(5)
  })

  it('catalog blocks the search on malformed prices with field messages', async () => {
    const searches: string[] = []
    stubFetch((url) => {
      if (url.includes('/api/v1/products/search')) {
        searches.push(url)
        return jsonResponse([PRODUCT])
      }
      return jsonResponse([])
    })
    const wrapper = mountView(CatalogView)
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Taza')
      },
      { timeout: 3000 },
    )
    expect(searches).toHaveLength(1)
    await wrapper.find('#catalog-min').setValue('barato')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(fieldAlerts(wrapper)).toHaveLength(1)
    expect(wrapper.find('#catalog-min').attributes('aria-describedby')).toBe('catalog-min-error')
    // No second search fired while the field stays invalid.
    expect(searches).toHaveLength(1)
  })
})
