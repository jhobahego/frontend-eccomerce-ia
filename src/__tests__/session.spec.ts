import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

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
  is_active: true,
  is_superuser: false,
  created_at: '2026-09-26T00:00:00Z',
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

describe('session store (T003)', () => {
  it('logs in with form-encoded credentials and loads the user', async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) => {
        seen.push({ url, init })
        if (url.endsWith('/api/v1/auth/login')) {
          return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
        }
        return jsonResponse(ME)
      }),
    )
    const session = useSessionStore()
    await session.login('ana', 's3cret')
    expect(session.isAuthenticated).toBe(true)
    expect(session.user?.username).toBe('ana')
    expect(session.isAdmin).toBe(false)
    expect(window.localStorage.getItem('eia.refresh_token.v1')).toBe('r1')
    const loginCall = seen.find((call) => call.url.endsWith('/api/v1/auth/login'))
    expect(loginCall).toBeDefined()
    const loginInit = loginCall?.init
    expect(loginInit?.method).toBe('POST')
    const loginHeaders = loginInit?.headers as Record<string, string> | undefined
    expect(loginHeaders).toBeDefined()
    expect(loginHeaders?.['Content-Type']).toMatch(/x-www-form-urlencoded/)
    expect(String(loginInit?.body)).toContain('username=ana')
  })

  it('registers and signs in right away, keeping one identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<(url: string) => Promise<Response>>(async (url) => {
        if (url.endsWith('/api/v1/auth/register')) {
          return jsonResponse({ ...ME, id: 6 })
        }
        if (url.endsWith('/api/v1/auth/login')) {
          return jsonResponse({ access_token: 'a2', refresh_token: 'r2' })
        }
        return jsonResponse({ ...ME, id: 6 })
      }),
    )
    const session = useSessionStore()
    await session.register({
      email: 'ana@example.es',
      username: 'ana',
      first_name: 'Ana',
      last_name: 'Luz',
      password: 's3cret',
    })
    expect(session.isAuthenticated).toBe(true)
    expect(session.user?.id).toBe(6)
  })

  it('shares one refresh POST across concurrent refreshes (review C1)', async () => {
    window.localStorage.setItem('eia.refresh_token.v1', 'r-old')
    let refreshPosts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn<(url: string) => Promise<Response>>(async (url) => {
        if (url.endsWith('/api/v1/auth/refresh')) {
          refreshPosts += 1
          await new Promise((resolve) => setTimeout(resolve, 5))
          return jsonResponse({ access_token: 'a-new', refresh_token: 'r-new' })
        }
        return jsonResponse(ME)
      }),
    )
    const session = useSessionStore()
    await Promise.all([
      session.refreshSession(),
      session.refreshSession(),
      session.refreshSession(),
    ])
    expect(refreshPosts).toBe(1)
    expect(session.isAuthenticated).toBe(true)
  })

  it('stays anonymous quietly when offline at boot (review I1)', async () => {
    window.localStorage.setItem('eia.refresh_token.v1', 'r-old')
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    const session = useSessionStore()
    await expect(session.restore()).resolves.toBeUndefined()
    expect(session.isAuthenticated).toBe(false)
  })

  it('leaves no half-session when user load fails after login (review I2)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<(url: string) => Promise<Response>>(async (url) => {
        if (url.endsWith('/api/v1/auth/login')) {
          return jsonResponse({ access_token: 'a1', refresh_token: 'r1' })
        }
        return jsonResponse({ detail: 'boom' }, 500)
      }),
    )
    const session = useSessionStore()
    await expect(session.login('ana', 's3cret')).rejects.toBeDefined()
    expect(session.isAuthenticated).toBe(false)
    expect(session.user).toBeNull()
    expect(window.localStorage.getItem('eia.refresh_token.v1')).toBeNull()
  })
  it('restores the session from the stored refresh token', async () => {
    window.localStorage.setItem('eia.refresh_token.v1', 'r-old')
    vi.stubGlobal(
      'fetch',
      vi.fn<(url: string) => Promise<Response>>(async (url) => {
        if (url.endsWith('/api/v1/auth/refresh')) {
          return jsonResponse({ access_token: 'a-new', refresh_token: 'r-new' })
        }
        return jsonResponse(ME)
      }),
    )
    const session = useSessionStore()
    await session.restore()
    expect(session.isAuthenticated).toBe(true)
    expect(window.localStorage.getItem('eia.refresh_token.v1')).toBe('r-new')
  })

  it('logs out locally clearing memory and storage', async () => {
    window.localStorage.setItem('eia.refresh_token.v1', 'r-old')
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () => jsonResponse(ME)),
    )
    const session = useSessionStore()
    await session.login('ana', 's3cret')
    session.logout()
    expect(session.isAuthenticated).toBe(false)
    expect(session.user).toBeNull()
    expect(window.localStorage.getItem('eia.refresh_token.v1')).toBeNull()
  })
})
