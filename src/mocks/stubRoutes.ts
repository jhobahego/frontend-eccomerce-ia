/**
 * Route manifest for the deterministic transport stub (T004).
 *
 * This module is deliberately Playwright-free so the contract suite
 * (`src/__tests__/stub-contract.spec.ts`) can pin coverage without pulling
 * `@playwright/test` into vitest: every plan §3 contract the later tasks
 * need appears here, and `e2e/stub.ts` is the single installer that serves
 * them. Add a route in exactly one place — here — and serve it there.
 */
export interface StubRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
}

export const STUB_ROUTES: StubRoute[] = [
  { method: 'POST', path: '/api/v1/auth/login' },
  { method: 'POST', path: '/api/v1/auth/register' },
  { method: 'POST', path: '/api/v1/auth/refresh' },
  { method: 'GET', path: '/api/v1/auth/me' },
  { method: 'GET', path: '/api/v1/users/me' },
  { method: 'PUT', path: '/api/v1/users/me' },
  { method: 'GET', path: '/api/v1/users/' },
  { method: 'GET', path: '/api/v1/users/{user_id}' },
  { method: 'POST', path: '/api/v1/categories/' },
  { method: 'PUT', path: '/api/v1/categories/{category_id}' },
  { method: 'DELETE', path: '/api/v1/categories/{category_id}' },
  { method: 'GET', path: '/api/v1/categories/' },
  { method: 'GET', path: '/api/v1/categories/roots' },
  { method: 'GET', path: '/api/v1/categories/hierarchy' },
  { method: 'GET', path: '/api/v1/categories/{category_id}' },
  { method: 'GET', path: '/api/v1/categories/{category_id}/subcategories' },
  { method: 'GET', path: '/api/v1/categories/{category_id}/with-products' },
  // Literal single-segment product routes come before `{product_id}`: the
  // generic pattern would otherwise shadow them (review I13 is the proof).
  { method: 'GET', path: '/api/v1/products/' },
  { method: 'GET', path: '/api/v1/products/search' },
  { method: 'POST', path: '/api/v1/products/search' },
  { method: 'GET', path: '/api/v1/products/featured' },
  { method: 'GET', path: '/api/v1/products/low-stock' },
  { method: 'GET', path: '/api/v1/products/category/{category_id}' },
  { method: 'POST', path: '/api/v1/products/' },
  { method: 'PUT', path: '/api/v1/products/{product_id}' },
  { method: 'DELETE', path: '/api/v1/products/{product_id}' },
  { method: 'PUT', path: '/api/v1/products/{product_id}/stock' },
  { method: 'GET', path: '/api/v1/products/slug/{slug}' },
  { method: 'GET', path: '/api/v1/products/sku/{sku}' },
  { method: 'GET', path: '/api/v1/products/{product_id}' },
  { method: 'GET', path: '/api/v1/products/{product_id}/similar' },
  { method: 'GET', path: '/api/v1/cart/' },
  { method: 'GET', path: '/api/v1/cart/summary' },
  { method: 'GET', path: '/api/v1/cart/validate' },
  { method: 'POST', path: '/api/v1/cart/items' },
  { method: 'PUT', path: '/api/v1/cart/items/{item_id}' },
  { method: 'DELETE', path: '/api/v1/cart/items/{item_id}' },
  { method: 'DELETE', path: '/api/v1/cart/clear' },
  { method: 'GET', path: '/api/v1/cart/session/{session_id}' },
  { method: 'POST', path: '/api/v1/cart/session/{session_id}/items' },
  { method: 'POST', path: '/api/v1/cart/merge/{session_cart_id}' },
  { method: 'POST', path: '/api/v1/orders/' },
  { method: 'GET', path: '/api/v1/orders/' },
  // `/all` precedes `{order_id}` for the same shadowing reason as above.
  { method: 'GET', path: '/api/v1/orders/all' },
  { method: 'GET', path: '/api/v1/orders/{order_id}' },
  { method: 'GET', path: '/api/v1/orders/{order_id}/track' },
  { method: 'POST', path: '/api/v1/orders/{order_id}/cancel' },
  { method: 'PUT', path: '/api/v1/orders/{order_id}/status' },
  { method: 'PUT', path: '/api/v1/orders/{order_id}/payment-status' },
  { method: 'GET', path: '/api/v1/health/' },
  { method: 'GET', path: '/api/v1/health/db' },
]
// Order writes beyond status/payment belong to T012 — they register here
// when that task lands, never earlier.

interface RoutePattern {
  method: string
  pattern: RegExp
  path: string
}

const PATTERNS: RoutePattern[] = STUB_ROUTES.map((route) => {
  const core = route.path
    .replace(/\/$/, '')
    .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
    .replace(/\{[^}]+\}/g, '[^/]+')
  return { method: route.method, pattern: new RegExp(`^${core}/?$`), path: route.path }
})

/**
 * Maps a concrete `METHOD + pathname` to its manifest key (`"METHOD path"`
 * template), or `null` when the stub serves nothing there. The Playwright
 * installer dispatches through this exact function, so the contract suite
 * below proves the wiring instead of trusting it: every manifest entry
 * must self-resolve.
 */
export function resolveStubRoute(method: string, pathname: string): string | null {
  for (const candidate of PATTERNS) {
    if (candidate.method === method && candidate.pattern.test(pathname)) {
      return `${candidate.method} ${candidate.path}`
    }
  }
  return null
}
