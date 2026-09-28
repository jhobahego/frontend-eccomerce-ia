import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import OrderDetailView from '../views/OrderDetailView.vue'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function orderWith(status: string): Record<string, unknown> {
  return {
    id: 9,
    order_number: 'ORD-0009',
    user_id: 5,
    status,
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
}

function mountDetail(): ReturnType<typeof mount> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/pedidos/:id', name: 'order-detail', component: OrderDetailView }],
  })
  const wrapper = mount(OrderDetailView, {
    global: {
      plugins: [pinia, router],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
  return wrapper
}

async function goToOrder(wrapper: ReturnType<typeof mount>, status: string): Promise<void> {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string) => Promise<Response>>(async (url) => {
      if (url.includes('/track')) {
        return jsonResponse({ order_id: 9, status, timeline: [] })
      }
      return jsonResponse(orderWith(status))
    }),
  )
  const router = wrapper.vm.$router
  await router.push('/pedidos/9')
  await vi.waitFor(
    () => {
      expect(wrapper.text()).toContain('ORD-0009')
    },
    { timeout: 3000 },
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

describe('order cancel availability message (branch review)', () => {
  it('offers cancel with no explanation while cancellable', async () => {
    const wrapper = mountDetail()
    await goToOrder(wrapper, 'pending')
    const buttons = wrapper.findAll('button').map((button) => button.text().trim())
    expect(buttons).toContain('Cancelar pedido')
    expect(wrapper.text()).not.toContain('ya no se puede cancelar')
  })

  it('states explicitly when the order can no longer be cancelled', async () => {
    const wrapper = mountDetail()
    await goToOrder(wrapper, 'shipped')
    const buttons = wrapper.findAll('button').map((button) => button.text().trim())
    expect(buttons).not.toContain('Cancelar pedido')
    expect(wrapper.text()).toContain('ya no se puede cancelar')
  })
})
