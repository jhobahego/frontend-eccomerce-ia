import type { Page, Route } from '@playwright/test'

import {
  createStubBackend,
  STUB_ADMIN_LOGIN,
  STUB_LOGIN,
  type StubBackendOptions,
} from '../src/mocks/stubBackend'

export { STUB_ADMIN_LOGIN, STUB_LOGIN }
export type { StubBackendOptions as StubOptions }

/**
 * Deterministic transport stub (T004) — the e2e seam from plan §5.
 *
 * installApiStub registers one catch-all interceptor for the versioned API
 * path. All decisions (shapes, codes, query contracts) live in the pure
 * `createStubBackend`, which the contract suite drives directly — this file
 * only forwards routes and fulfills answers, so the browser pipeline stays
 * thin and the logic cannot hide behind mocks.
 *
 * Installed at context level on purpose: it intercepts page navigations AND
 * in-page fetch, the exact pipeline the typed client uses. Per-page
 * `page.route` calls registered later still win over it (narrower scope
 * takes precedence) — that is the documented override seam for later tasks.
 *
 * Scenario switches (happy path by default):
 * - `user: 'admin'` serves the admin identity to the default customer token.
 * - `cart: 'empty'` serves an empty cart + zeroed summary.
 * - `stock: 'blocked'` makes validate report out-of-stock lines and order
 *   creation answer 409.
 * - `auth: 'expired'` forces refresh + identity reads to 401 (T005 resume).
 */
export async function installApiStub(
  page: Page,
  options: StubBackendOptions = {},
): Promise<void> {
  const backend = createStubBackend(options)
  const dispatch = (route: Route): Promise<void> => {
    const request = route.request()
    const answer = backend.handle({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      bodyText: request.postData() ?? undefined,
    })
    return route.fulfill({
      status: answer.status,
      contentType: 'application/json',
      body: JSON.stringify(answer.body),
    })
  }
  await page.context().route('**/api/v1/**', dispatch)
}
