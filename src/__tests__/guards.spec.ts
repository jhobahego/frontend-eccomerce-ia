import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import { decideAccess, installSessionGuards } from '../router/guards'
import { baseRoutes } from '../router/routes/base'
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

const ADMIN = {
  ...CUSTOMER,
  id: 1,
  email: 'admin@example.es',
  username: 'admin',
  first_name: 'Admin',
  last_name: 'Tienda',
  is_superuser: true,
}

function loginMock(me: typeof CUSTOMER): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string) => Promise<Response>>(async (url) => {
      if (url.endsWith('/api/v1/auth/login')) {
        return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
      }
      return jsonResponse(me)
    }),
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

describe('route guards (T005)', () => {
  it('lets anonymous visitors through public routes', () => {
    expect(decideAccess({ isAuthenticated: false, isAdmin: false }, { public: true })).toBe(
      'allow',
    )
  })

  it('lets anonymous visitors through routes without requirements (storefront default)', () => {
    expect(decideAccess({ isAuthenticated: false, isAdmin: false }, {})).toBe('allow')
  })

  it('sends anonymous visitors on auth-only routes to login', () => {
    expect(decideAccess({ isAuthenticated: false, isAdmin: false }, { requiresAuth: true })).toBe(
      'to-login',
    )
  })

  it('lets authenticated customers into auth-only routes', () => {
    expect(decideAccess({ isAuthenticated: true, isAdmin: false }, { requiresAuth: true })).toBe(
      'allow',
    )
  })

  it('sends anonymous visitors on admin routes to login so they can resume as admin', () => {
    expect(decideAccess({ isAuthenticated: false, isAdmin: false }, { requiresAdmin: true })).toBe(
      'to-login',
    )
  })

  it('sends authenticated non-admin users on admin routes to not-found (DenySilent)', () => {
    const decision = decideAccess(
      { isAuthenticated: true, isAdmin: false },
      { requiresAdmin: true },
    )
    expect(decision).toBe('to-not-found')
  })

  it('lets admins into admin routes', () => {
    expect(decideAccess({ isAuthenticated: true, isAdmin: true }, { requiresAdmin: true })).toBe(
      'allow',
    )
  })

  it('exposes base routes: home and not-found are public, admin requires admin', () => {
    const byName = new Map(baseRoutes.map((route) => [route.name, route]))
    const home = byName.get('home')
    const notFound = byName.get('not-found')
    const admin = byName.get('admin')
    expect(home?.path).toBe('/')
    expect(home?.meta?.public).toBe(true)
    expect(notFound?.path).toBe('/not-found')
    expect(notFound?.meta?.public).toBe(true)
    expect(admin?.path).toBe('/admin')
    expect(admin?.meta?.requiresAdmin).toBe(true)
    const catchAll = baseRoutes.find((route) => route.name === 'catch-all')
    expect(catchAll?.path).toContain('pathMatch')
  })
})

describe('guard wiring (T005)', () => {
  it('redirects anonymous visitors on /admin to login and remembers where they were', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: { template: '<div />' } },
        ...baseRoutes,
      ],
    })
    installSessionGuards(router)
    const session = useSessionStore()
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('login')
    expect(session.returnTo).toBe('/admin')
  })

  it('sends authenticated customers on /admin to not-found without remembering it', async () => {
    loginMock(CUSTOMER)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: { template: '<div />' } },
        ...baseRoutes,
      ],
    })
    installSessionGuards(router)
    const session = useSessionStore()
    await session.login('ana', 's3cret')
    session.setReturnTo(null)
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('not-found')
    expect(session.returnTo).toBeNull()
  })

  it('lets admins into /admin', async () => {
    loginMock(ADMIN)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: { template: '<div />' } },
        ...baseRoutes,
      ],
    })
    installSessionGuards(router)
    const session = useSessionStore()
    await session.login('admin', 's3cret')
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin')
  })

  it('resumes to the remembered route after login', async () => {
    loginMock(ADMIN)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: { template: '<div />' } },
        ...baseRoutes,
      ],
    })
    installSessionGuards(router)
    const session = useSessionStore()
    await router.push('/admin')
    expect(session.returnTo).toBe('/admin')
    await session.login('admin', 's3cret')
    const destination = session.returnTo ?? '/'
    session.setReturnTo(null)
    await router.push(destination)
    expect(router.currentRoute.value.name).toBe('admin')
    expect(session.returnTo).toBeNull()
  })
})
