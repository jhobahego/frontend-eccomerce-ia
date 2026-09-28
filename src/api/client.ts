import { getApiBaseUrl } from './env'
import { ApiHttpError, codeFor, isApiError, normalizeError } from './errors'

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired. Sign in again to continue.')
    this.name = 'SessionExpiredError'
  }
}

export interface AuthHooks {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<string>
  onSessionExpired: () => void
}

let hooks: AuthHooks | null = null

export function setAuthHooks(next: AuthHooks | null): void {
  hooks = next
}

function refreshOnce(): Promise<string> {
  const active = hooks
  if (active === null) {
    return Promise.reject(new SessionExpiredError())
  }
  // No flight here on purpose: the store single-flights refreshSession
  // itself, so every path (direct calls, 401 retries) funnels into one.
  return active.refreshAccessToken().catch((error: unknown) => {
    if (error instanceof SessionExpiredError) {
      throw error
    }
    if (isApiError(error) && error.code === 'UNAUTHORIZED') {
      throw new SessionExpiredError()
    }
    throw error
  })
}

export interface RequestOptions {
  method?: string
  body?: unknown
  form?: Record<string, string>
  auth?: boolean
}

function statusCode(status: number): string {
  if (status === 401) {
    return 'UNAUTHORIZED'
  }
  if (status === 403) {
    return 'FORBIDDEN'
  }
  if (status === 404) {
    return 'NOT_FOUND'
  }
  if (status === 409) {
    return 'CONFLICT'
  }
  if (status === 422) {
    return 'VALIDATION'
  }
  return 'REQUEST'
}

function errorFromStatus(status: number, parsed: unknown): ApiHttpError {
  if (parsed !== null && typeof parsed === 'object' && 'detail' in parsed) {
    const detail = (parsed as { detail: unknown }).detail
    if (Array.isArray(detail)) {
      const normalized = normalizeError({ detail })
      return new ApiHttpError(normalized.code, normalized.message, normalized.field)
    }
    if (typeof detail === 'string' && detail !== '') {
      const code = codeFor(detail)
      return new ApiHttpError(code === 'REQUEST' ? statusCode(status) : code, detail)
    }
  }
  return new ApiHttpError(statusCode(status), `Request failed with status ${status}`)
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') {
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { detail: text }
  }
}

export async function apiRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const base = getApiBaseUrl()
  const useAuth = options?.auth !== false
  const method = options?.method ?? 'GET'
  const headers: Record<string, string> = {}
  let body: string | undefined
  if (options?.form !== undefined) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(options.form).toString()
  } else if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const send = async (token: string | null, allowRefresh: boolean): Promise<T> => {
    const requestHeaders = { ...headers }
    if (useAuth && token !== null) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
    let response: Response | undefined
    let transportError: unknown
    for (let attemptIndex = 0; attemptIndex < 2; attemptIndex += 1) {
      try {
        response = await fetch(base + path, { method, headers: requestHeaders, body })
        break
      } catch (error) {
        transportError = error
        if (!(error instanceof TypeError)) {
          throw normalizeError(error)
        }
      }
    }
    if (response === undefined) {
      throw normalizeError(transportError)
    }
    if (response.ok) {
      if (response.status === 204) {
        return undefined as T
      }
      return (await readBody(response)) as T
    }
    if (response.status === 401 && useAuth && token !== null && allowRefresh) {
      try {
        const fresh = await refreshOnce()
        return await send(fresh, false)
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          hooks?.onSessionExpired()
          throw error
        }
        if (isApiError(error) && error.code === 'UNAUTHORIZED') {
          hooks?.onSessionExpired()
          throw new SessionExpiredError()
        }
        throw error
      }
    }
    throw errorFromStatus(response.status, await readBody(response))
  }

  return send(useAuth ? (hooks?.getAccessToken() ?? null) : null, true)
}
