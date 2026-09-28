import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import App from '../App.vue'
import { useSessionStore } from '../stores/session'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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

function mountShell(): ReturnType<typeof mount> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
  })
  return mount(App, {
    global: {
      plugins: [pinia, router],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        RouterView: { template: '<div />' },
      },
    },
  })
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    vi.stubEnv('VITE_API_URL', 'http://test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('renders the shell with navigation and a router outlet', () => {
    const wrapper = mountShell()
    expect(wrapper.text()).toContain('Inicio')
    expect(wrapper.text()).toContain('Entrar')
    expect(wrapper.find('nav').exists()).toBe(true)
  })

  it('hides the admin entry for anonymous visitors (T005 DenySilent)', () => {
    const wrapper = mountShell()
    expect(wrapper.text()).not.toContain('Administración')
  })

  it('returns to the public home on logout (T005)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<(url: string) => Promise<Response>>(async (url) => {
        if (url.endsWith('/api/v1/auth/login')) {
          return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
        }
        return jsonResponse(CUSTOMER)
      }),
    )
    const wrapper = mountShell()
    const session = useSessionStore()
    await session.login('ana', 's3cret')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Salir')
    const logout = wrapper.findAll('button').find((button) => button.text() === 'Salir')
    expect(logout?.exists()).toBe(true)
    await logout?.trigger('click')
    await wrapper.vm.$nextTick()
    expect(session.isAuthenticated).toBe(false)
    expect(wrapper.text()).toContain('Entrar')
  })
})
