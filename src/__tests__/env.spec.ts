import { describe, it, expect, vi, afterEach } from 'vitest'

import { getApiBaseUrl } from '../api/env'

describe('api base url from environment only (T002)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the configured url without trailing slash', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/')
    expect(getApiBaseUrl()).toBe('http://localhost:8000')
  })

  it('refuses to guess when the variable is missing', () => {
    vi.stubEnv('VITE_API_URL', '')
    expect(() => getApiBaseUrl()).toThrow(/VITE_API_URL/)
  })

  it('rejects whitespace-only values and non-http schemes (review M-1)', () => {
    vi.stubEnv('VITE_API_URL', '   ')
    expect(() => getApiBaseUrl()).toThrow(/VITE_API_URL/)
    vi.stubEnv('VITE_API_URL', 'notaurl')
    expect(() => getApiBaseUrl()).toThrow(/http/)
    vi.stubEnv('VITE_API_URL', 'https://api.example.com///')
    expect(getApiBaseUrl()).toBe('https://api.example.com')
  })
})
