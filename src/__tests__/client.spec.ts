import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

import { apiRequest, setAuthHooks, SessionExpiredError, type AuthHooks } from '../api/client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  setAuthHooks(null)
})

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://test')
})

describe('api client (T003)', () => {
  it('sends bearer and unwraps json bodies', async () => {
    const hooks: AuthHooks = {
      getAccessToken: () => 'tok-1',
      refreshAccessToken: () => Promise.resolve('tok-1'),
      onSessionExpired: () => {},
    }
    setAuthHooks(hooks)
    const seen: Array<{ url: string; init?: RequestInit }> = []
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (url, init) => {
        seen.push({ url, init })
        return jsonResponse({ id: 1 })
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    const data = await apiRequest<{ id: number }>('/api/v1/auth/me')
    expect(data).toEqual({ id: 1 })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.url).toBe('http://test/api/v1/auth/me')
    const headers = seen[0]?.init?.headers as Record<string, string> | undefined
    expect(headers?.['Authorization']).toBe('Bearer tok-1')
  })

  it('normalizes error bodies without leaking', async () => {
    setAuthHooks(null)
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () => jsonResponse({ detail: 'Nope' }, 404)),
    )
    await expect(apiRequest('/api/v1/auth/me', { auth: false })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('retries once on transport failure, then surfaces NETWORK', async () => {
    setAuthHooks(null)
    const fetchMock = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiRequest('/x', { auth: false })).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const alwaysDown = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', alwaysDown)
    await expect(apiRequest('/x', { auth: false })).rejects.toMatchObject({ code: 'NETWORK' })
  })

  it('delegates 401 recovery to hooks and retries once with the fresh token', async () => {
    let refreshCalls = 0
    const hooks: AuthHooks = {
      getAccessToken: () => 'stale',
      refreshAccessToken: async () => {
        refreshCalls += 1
        return 'fresh'
      },
      onSessionExpired: () => {},
    }
    setAuthHooks(hooks)
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (_url, init) => {
        const headers = (init?.headers ?? {}) as Record<string, string>
        if (headers['Authorization'] === 'Bearer fresh') {
          return jsonResponse({ id: 1 })
        }
        return jsonResponse({ detail: 'Could not validate credentials' }, 401)
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiRequest('/a')).resolves.toEqual({ id: 1 })
    expect(refreshCalls).toBe(1)
  })

  it('expires (never loops) when the refreshed token is also rejected', async () => {
    let refreshCalls = 0
    let expired = false
    setAuthHooks({
      getAccessToken: () => 'stale',
      refreshAccessToken: async () => {
        refreshCalls += 1
        return 'still-stale'
      },
      onSessionExpired: () => {
        expired = true
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () =>
        jsonResponse({ detail: 'Could not validate credentials' }, 401),
      ),
    )
    // A fresh token that is still rejected means the session is dead:
    // expire and redirect to login instead of looping or leaking 401s.
    await expect(apiRequest('/a')).rejects.toBeInstanceOf(SessionExpiredError)
    expect(refreshCalls).toBe(1)
    expect(expired).toBe(true)
  })

  it('clears the session and throws SessionExpired when refresh dies', async () => {
    let expired = false
    const hooks: AuthHooks = {
      getAccessToken: () => 'stale',
      refreshAccessToken: () => Promise.reject(new SessionExpiredError()),
      onSessionExpired: () => {
        expired = true
      },
    }
    setAuthHooks(hooks)
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () =>
        jsonResponse({ detail: 'Could not validate credentials' }, 401),
      ),
    )
    await expect(apiRequest('/a')).rejects.toBeInstanceOf(SessionExpiredError)
    expect(expired).toBe(true)
  })

  it('keeps the session when refresh fails for network reasons', async () => {
    let expired = false
    const hooks: AuthHooks = {
      getAccessToken: () => 'stale',
      refreshAccessToken: () =>
        Promise.reject({ code: 'NETWORK', message: 'Sin conexión. Comprueba tu red y reintenta.' }),
      onSessionExpired: () => {
        expired = true
      },
    }
    setAuthHooks(hooks)
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () =>
        jsonResponse({ detail: 'Could not validate credentials' }, 401),
      ),
    )
    await expect(apiRequest('/a')).rejects.toMatchObject({ code: 'NETWORK' })
    expect(expired).toBe(false)
  })
})
