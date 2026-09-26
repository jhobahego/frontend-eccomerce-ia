import { test, expect, type Page } from '@playwright/test'

import { installApiStub, STUB_LOGIN } from './stub'

/**
 * Stub self-test (T004): proves the transport stub answers through a real
 * browser context before any domain task builds on it. Requests run as
 * in-page `fetch` — the exact pipeline the app's typed client (T003) uses —
 * so this exercises the same interception later UI flows rely on. No live
 * backend exists; every answer below comes from the stub.
 */
test.describe('transport stub (T004)', () => {
  test.beforeEach(async ({ page }) => {
    await installApiStub(page)
    await page.goto('/')
  })

  async function api(page: Page, path: string, init?: RequestInit): Promise<{
    status: number
    body: unknown
  }> {
    return page.evaluate(
      async ([url, options]) => {
        const response = await fetch(url, options)
        const text = await response.text()
        return { status: response.status, body: text === '' ? null : JSON.parse(text) }
      },
      [path, init] as const,
    )
  }

  test('health answers ok without a live backend', async ({ page }) => {
    const { status, body } = await api(page, '/api/v1/health/')
    expect(status).toBe(200)
    expect(body).toMatchObject({ status: 'ok' })
  })

  test('login happy path mints the stub token, bad password stays 401', async ({ page }) => {
    const form = (password: string): RequestInit => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: STUB_LOGIN.username, password }).toString(),
    })
    const ok = await api(page, '/api/v1/auth/login', form(STUB_LOGIN.password))
    expect(ok.status).toBe(200)
    expect(ok.body).toMatchObject({ access_token: expect.any(String) })

    const bad = await api(page, '/api/v1/auth/login', form('incorrecta'))
    expect(bad.status).toBe(401)
    expect(bad.body).toMatchObject({ detail: 'Incorrect email or password' })
  })

  test('un-stubbed contracts fail loud, never silent', async ({ page }) => {
    const { status } = await api(page, '/api/v1/nope/')
    expect(status).toBe(404)
  })
})
