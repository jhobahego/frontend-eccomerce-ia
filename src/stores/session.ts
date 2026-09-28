import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { apiRequest, SessionExpiredError, setAuthHooks } from '../api/client'
import { isApiError } from '../api/errors'
import { isAdmin as isAdminUser, type Token, type User, type UserCreate } from '../api/types'

const REFRESH_STORAGE_KEY = 'eia.refresh_token.v1'

function readStoredRefresh(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_STORAGE_KEY)
  } catch {
    return null
  }
}

// The single owner of the refresh flight: one module-level promise shared by
// direct calls and 401 retries alike. `clear` is attached at creation — before
// any `await` continuation — so per-caller work (e.g. `/me`) can never deadlock
// on its own flight.
let refreshFlight: Promise<Token> | null = null

function clearRefreshFlight(): void {
  refreshFlight = null
}

export const useSessionStore = defineStore('session', () => {
  // Access token lives in memory only (constitution §5, principle 13).
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const returnTo = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null && accessToken.value !== null)
  const isAdmin = computed(() => isAdminUser(user.value))

  function clearSession(): void {
    accessToken.value = null
    user.value = null
    try {
      window.localStorage.removeItem(REFRESH_STORAGE_KEY)
    } catch {
      // Storage unavailable (private mode): session simply does not persist.
    }
  }

  function persistRefresh(token: string): void {
    try {
      window.localStorage.setItem(REFRESH_STORAGE_KEY, token)
    } catch {
      // Storage unavailable: session lasts until reload.
    }
  }

  async function loadUser(): Promise<void> {
    try {
      user.value = await apiRequest<User>('/api/v1/auth/me')
    } catch (error) {
      // No half-sessions: tokens without an identity are discarded.
      clearSession()
      throw error
    }
  }

  async function doRefresh(): Promise<Token> {
    const stored = readStoredRefresh()
    if (stored === null || stored === '') {
      clearSession()
      throw new SessionExpiredError()
    }
    try {
      return await apiRequest<Token>('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refresh_token: stored },
        auth: false,
      })
    } catch (error) {
      // A rejected refresh token (401 expired/unknown, 422 malformed per the
      // snapshot) is unrecoverable client-side: clear and re-login. Anything
      // else (notably NETWORK) propagates to the caller, which decides.
      if (
        error instanceof SessionExpiredError ||
        (isApiError(error) && (error.code === 'UNAUTHORIZED' || error.code === 'VALIDATION'))
      ) {
        clearSession()
        throw new SessionExpiredError()
      }
      throw error
    }
  }

  async function refreshSession(): Promise<string> {
    let flight = refreshFlight
    if (flight === null) {
      flight = doRefresh()
      refreshFlight = flight
      flight.then(clearRefreshFlight, clearRefreshFlight)
    }
    const token = await flight
    accessToken.value = token.access_token
    persistRefresh(token.refresh_token)
    if (user.value === null) {
      await loadUser()
    }
    return token.access_token
  }

  async function login(username: string, password: string): Promise<void> {
    const token = await apiRequest<Token>('/api/v1/auth/login', {
      method: 'POST',
      form: { username, password },
      auth: false,
    })
    accessToken.value = token.access_token
    persistRefresh(token.refresh_token)
    await loadUser()
  }

  async function register(data: UserCreate): Promise<void> {
    await apiRequest<User>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
      auth: false,
    })
    await login(data.username, data.password)
  }

  function logout(): void {
    clearSession()
  }

  async function restore(): Promise<void> {
    const stored = readStoredRefresh()
    if (stored === null || stored === '') {
      return
    }
    try {
      await refreshSession()
    } catch (error) {
      // Boot stays quiet: an expired session or an offline first visit both
      // mean "anonymous". Anything else is unexpected — let it surface.
      if (error instanceof SessionExpiredError) {
        return
      }
      if (isApiError(error) && error.code === 'NETWORK') {
        return
      }
      throw error
    }
  }

  function setReturnTo(path: string | null): void {
    returnTo.value = path
  }

  setAuthHooks({
    getAccessToken: () => accessToken.value,
    refreshAccessToken: () => refreshSession(),
    onSessionExpired: () => clearSession(),
  })

  return {
    user,
    returnTo,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    refreshSession,
    restore,
    setReturnTo,
  }
})
