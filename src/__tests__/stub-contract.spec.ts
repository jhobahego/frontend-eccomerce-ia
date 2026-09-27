import { describe, it, expect } from 'vitest'

import snapshot from './fixtures/openapi.snapshot.json'
import {
  STUB_ADMIN_ACCESS_TOKEN,
  STUB_ERROR_DETAILS,
  STUB_ROTATED_ACCESS_TOKEN,
  stubAdmin,
  stubBackendCartSummary,
  stubCart,
  stubCategoryList,
  stubCategoryRoots,
  stubCategoryTree,
  stubOrder,
  stubOrderSummary,
  stubProduct,
  stubProductList,
  stubToken,
  stubUser,
} from '../mocks/apiFixtures'
import {
  applyProductFilters,
  createStubBackend,
  STUB_ADMIN_LOGIN,
  STUB_LOGIN,
  type StubRequest,
} from '../mocks/stubBackend'
import { STUB_ROUTES, resolveStubRoute } from '../mocks/stubRoutes'

const schemas = snapshot.components.schemas as Record<string, { required?: string[] }>

function requiredOf(name: string): string[] {
  return schemas[name]?.required ?? []
}

function expectRequiredPresent(schema: string, payload: Record<string, unknown>): void {
  for (const key of requiredOf(schema)) {
    expect(payload, `stub misses required ${schema}.${key}`).toHaveProperty(key)
  }
}

const MONEY = /^\d+\.\d{2}$/

function call(
  method: string,
  url: string,
  init?: Partial<Pick<StubRequest, 'headers' | 'bodyText'>>,
): { status: number; body: Record<string, unknown> } {
  const { status, body } = createStubBackend().handle({ method, url, ...init })
  return { status, body: body as Record<string, unknown> }
}

function authed(token: string): { headers: Record<string, string> } {
  return { headers: { authorization: `Bearer ${token}` } }
}

describe('stub transport contract vs snapshot (T004)', () => {
  it('auth fixtures carry the exact backend shapes', () => {
    expectRequiredPresent('User', stubUser as unknown as Record<string, unknown>)
    expectRequiredPresent('User', stubAdmin as unknown as Record<string, unknown>)
    expectRequiredPresent('Token', stubToken as unknown as Record<string, unknown>)
    expect(stubAdmin.is_superuser).toBe(true)
    expect(stubUser.is_superuser).toBe(false)
  })

  it('catalog fixtures carry the exact backend shapes', () => {
    expect(stubCategoryList).toHaveLength(3)
    for (const category of stubCategoryList) {
      expectRequiredPresent('Category', category as unknown as Record<string, unknown>)
    }
    for (const root of stubCategoryRoots) {
      expect(root.parent_id).toBeNull()
    }
    for (const node of stubCategoryTree) {
      expectRequiredPresent('CategoryHierarchy', node as unknown as Record<string, unknown>)
      expect(Array.isArray(node.children)).toBe(true)
      expect(typeof node.depth).toBe('number')
    }
    for (const product of stubProductList) {
      expectRequiredPresent('Product', product as unknown as Record<string, unknown>)
    }
    expectRequiredPresent('Product', stubProduct as unknown as Record<string, unknown>)
  })

  it('money travels as decimal strings, never floats', () => {
    const moneyFields = [
      stubProduct.price,
      stubProduct.current_price,
      stubCart.total_amount,
      stubBackendCartSummary.total_amount,
      stubOrder.subtotal,
      stubOrder.total_amount,
    ]
    for (const value of moneyFields) {
      expect(typeof value).toBe('string')
      expect(value).toMatch(MONEY)
    }
    const serialized = JSON.stringify({ cart: stubCart, order: stubOrder })
    expect(serialized).not.toMatch(/"(price|current_price|amount|subtotal|total_price)":\d/)
  })

  it('cart and order fixtures carry items with server-computed subtotals', () => {
    expectRequiredPresent('Cart', stubCart as unknown as Record<string, unknown>)
    expect(stubCart.items.length).toBeGreaterThan(0)
    for (const line of stubCart.items) {
      expectRequiredPresent('CartItem', line as unknown as Record<string, unknown>)
      expect(line.subtotal).toMatch(MONEY)
    }
    expectRequiredPresent(
      'CartSummary',
      stubBackendCartSummary as unknown as Record<string, unknown>,
    )
    expectRequiredPresent('Order', stubOrder as unknown as Record<string, unknown>)
    expect(stubOrder.items.length).toBeGreaterThan(0)
    for (const line of stubOrder.items) {
      expectRequiredPresent('OrderItem', line as unknown as Record<string, unknown>)
    }
    expectRequiredPresent('OrderSummary', stubOrderSummary as unknown as Record<string, unknown>)
  })

  it('lifecycle enums stay inside the snapshot vocabularies', () => {
    const orderStatus = schemas['OrderStatus'] as unknown as { enum: string[] }
    const paymentStatus = schemas['PaymentStatus'] as unknown as { enum: string[] }
    expect(orderStatus.enum).toContain(stubOrder.status)
    expect(paymentStatus.enum).toContain(stubOrder.payment_status)
    expect(orderStatus.enum).toContain(stubOrderSummary.status)
    expect(paymentStatus.enum).toContain(stubOrderSummary.payment_status)
  })

  it('stub error bodies reuse the backend verbatim strings', () => {
    expect(STUB_ERROR_DETAILS.badCredentials).toBe('Incorrect email or password')
    expect(STUB_ERROR_DETAILS.duplicateEmail).toBe(
      'The user with this email already exists in the system.',
    )
    expect(STUB_ERROR_DETAILS.invalidRefresh).toBe('Could not validate credentials')
    expect(STUB_ERROR_DETAILS.notAuthenticated).toBe('Not authenticated')
    expect(STUB_ERROR_DETAILS.notFound).toBe('Not found')
    expect(STUB_ERROR_DETAILS.forbidden).toBe('Not authorized')
  })

  it('route manifest covers every plan §3 contract the later tasks need', () => {
    const keys = new Set(STUB_ROUTES.map((route) => `${route.method} ${route.path}`))
    const required = [
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/refresh',
      'GET /api/v1/auth/me',
      'GET /api/v1/users/me',
      'PUT /api/v1/users/me',
      'GET /api/v1/users/',
      'GET /api/v1/users/{user_id}',
      'GET /api/v1/categories/',
      'GET /api/v1/categories/roots',
      'GET /api/v1/categories/hierarchy',
      'GET /api/v1/categories/{category_id}',
      'GET /api/v1/categories/{category_id}/subcategories',
      'GET /api/v1/categories/{category_id}/with-products',
      'GET /api/v1/products/',
      'GET /api/v1/products/search',
      'POST /api/v1/products/search',
      'GET /api/v1/products/featured',
      'GET /api/v1/products/low-stock',
      'GET /api/v1/products/category/{category_id}',
      'GET /api/v1/products/slug/{slug}',
      'GET /api/v1/products/sku/{sku}',
      'GET /api/v1/products/{product_id}',
      'GET /api/v1/products/{product_id}/similar',
      'GET /api/v1/cart/',
      'GET /api/v1/cart/summary',
      'GET /api/v1/cart/validate',
      'POST /api/v1/cart/items',
      'PUT /api/v1/cart/items/{item_id}',
      'DELETE /api/v1/cart/items/{item_id}',
      'DELETE /api/v1/cart/clear',
      'GET /api/v1/cart/session/{session_id}',
      'POST /api/v1/cart/session/{session_id}/items',
      'POST /api/v1/cart/merge/{session_cart_id}',
      'POST /api/v1/orders/',
      'GET /api/v1/orders/',
      'GET /api/v1/orders/all',
      'GET /api/v1/orders/{order_id}',
      'GET /api/v1/orders/{order_id}/track',
      'POST /api/v1/orders/{order_id}/cancel',
      'PUT /api/v1/orders/{order_id}/status',
      'PUT /api/v1/orders/{order_id}/payment-status',
      'GET /api/v1/health/',
      'GET /api/v1/health/db',
    ]
    expect(keys.size).toBe(required.length)
    for (const key of required) {
      expect(keys, `stub manifest misses ${key}`).toContain(key)
    }
  })

  it('every manifest entry self-resolves through the shared matcher (wiring pin)', () => {
    // The backend dispatches through `resolveStubRoute`, so a manifest entry
    // the matcher cannot reach would be dead wiring. Concrete ids stand in
    // for the `{param}` templates (`session_cart_id` is integer per snapshot).
    const concrete = STUB_ROUTES.map((route) => ({
      method: route.method,
      pathname: route.path
        .replace('{product_id}', '1')
        .replace('{item_id}', '7')
        .replace('{session_cart_id}', '3')
        .replace('{session_id}', 'sess-1')
        .replace('{order_id}', '9')
        .replace('{user_id}', '5')
        .replace('{category_id}', '2')
        .replace('{slug}', 'tetera')
        .replace('{sku}', 'TET-001'),
      expected: `${route.method} ${route.path}`,
    }))
    for (const { method, pathname, expected } of concrete) {
      expect(resolveStubRoute(method, pathname), `unreachable ${expected}`).toBe(expected)
    }
    expect(resolveStubRoute('GET', '/api/v1/nope/')).toBeNull()
    expect(resolveStubRoute('DELETE', '/api/v1/auth/login')).toBeNull()
  })

  it('single-segment product lookups never resolve to the generic id route', () => {
    // Regression pin for review I13: `low-stock` answered 200 as a product.
    const literals = ['low-stock', 'search', 'featured'].map((path) =>
      resolveStubRoute('GET', `/api/v1/products/${path}`),
    )
    expect(literals).toEqual([
      'GET /api/v1/products/low-stock',
      'GET /api/v1/products/search',
      'GET /api/v1/products/featured',
    ])
    // Bare `category`/`slug`/`sku` are NOT routes — they fall to the generic
    // pattern and the dispatcher 404s at lookup. That is the honest answer.
    for (const path of ['category', 'slug', 'sku']) {
      expect(resolveStubRoute('GET', `/api/v1/products/${path}`)).toBe(
        'GET /api/v1/products/{product_id}',
      )
      expect(call('GET', `/api/v1/products/${path}`).status).toBe(404)
    }
    expect(resolveStubRoute('GET', '/api/v1/orders/all')).not.toBe(
      'GET /api/v1/orders/{order_id}',
    )
  })
})

describe('stub backend decisions (T004 review fold)', () => {
  it('login mints per-role tokens, rejects unknown pairs without enumeration', () => {
    const customer = call(
      'POST',
      '/api/v1/auth/login',
      { bodyText: new URLSearchParams({ ...STUB_LOGIN }).toString() },
    )
    expect(customer).toMatchObject({ status: 200, body: stubToken })
    const adminLogin = call(
      'POST',
      '/api/v1/auth/login',
      { bodyText: new URLSearchParams({ ...STUB_ADMIN_LOGIN }).toString() },
    )
    expect(adminLogin.status).toBe(200)
    expect(adminLogin.body).toMatchObject({ access_token: STUB_ADMIN_ACCESS_TOKEN })
    const bad = call(
      'POST',
      '/api/v1/auth/login',
      { bodyText: new URLSearchParams({ username: 'ana', password: 'nope' }).toString() },
    )
    expect(bad).toEqual({
      status: 401,
      body: { detail: STUB_ERROR_DETAILS.badCredentials },
    })
  })

  it('register builds the user server-side: no password echo, no forged flags', () => {
    const created = call('POST', '/api/v1/auth/register', {
      bodyText: JSON.stringify({
        email: 'nueva@example.es',
        username: 'nueva',
        first_name: 'Nueva',
        last_name: 'Usuaria',
        password: 's3cret',
        is_superuser: true,
      }),
    })
    expect(created.status).toBe(200)
    expect(created.body).not.toHaveProperty('password')
    expect(created.body).toMatchObject({ email: 'nueva@example.es', is_superuser: false })
    expect(call('POST', '/api/v1/auth/register', {
      bodyText: JSON.stringify({ email: stubUser.email, username: 'otra' }),
    })).toEqual({ status: 400, body: { detail: STUB_ERROR_DETAILS.duplicateEmail } })
    expect(call('POST', '/api/v1/auth/register', {
      bodyText: JSON.stringify({ email: 'otra@example.es', username: 'ana' }),
    })).toEqual({ status: 400, body: { detail: STUB_ERROR_DETAILS.duplicateUsername } })
  })

  it('refresh rotates access, rejects unknown tokens verbatim', () => {
    const ok = call('POST', '/api/v1/auth/refresh', {
      bodyText: JSON.stringify({ refresh_token: stubToken.refresh_token }),
    })
    expect(ok.status).toBe(200)
    expect(ok.body).toMatchObject({ access_token: STUB_ROTATED_ACCESS_TOKEN })
    expect(call('POST', '/api/v1/auth/refresh', {
      bodyText: JSON.stringify({ refresh_token: 'forged' }),
    })).toEqual({ status: 401, body: { detail: STUB_ERROR_DETAILS.invalidRefresh } })
    const expired = createStubBackend({ auth: 'expired' })
    expect(
      expired.handle({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        bodyText: JSON.stringify({ refresh_token: stubToken.refresh_token }),
      }),
    ).toEqual({ status: 401, body: { detail: STUB_ERROR_DETAILS.invalidRefresh } })
  })

  it('identity reads need a known bearer; edits persist and ignore privileges', () => {
    expect(call('GET', '/api/v1/auth/me')).toEqual({
      status: 401,
      body: { detail: STUB_ERROR_DETAILS.notAuthenticated },
    })
    const lower = call('GET', '/api/v1/auth/me', {
      headers: { authorization: `bearer ${stubToken.access_token}` },
    })
    expect(lower.status).toBe(200)
    const backend = createStubBackend()
    const before = backend.handle({
      method: 'GET',
      url: '/api/v1/users/me',
      ...authed(stubToken.access_token),
    })
    expect(before.status).toBe(200)
    backend.handle({
      method: 'PUT',
      url: '/api/v1/users/me',
      ...authed(stubToken.access_token),
      bodyText: JSON.stringify({ first_name: 'AnaNueva', is_superuser: true }),
    })
    const after = backend.handle({
      method: 'GET',
      url: '/api/v1/users/me',
      ...authed(stubToken.access_token),
    })
    expect(after.body).toMatchObject({ first_name: 'AnaNueva', is_superuser: false })
  })

  it('admin-only reads 401 without token, 403 for customers, 200 for admins', () => {
    const paths = [
      '/api/v1/orders/all',
      '/api/v1/users/',
      '/api/v1/users/5',
      '/api/v1/products/low-stock',
    ]
    const matrix = paths.map((path) => [
      call('GET', path).status,
      call('GET', path, authed(stubToken.access_token)).status,
      call('GET', path, authed(STUB_ADMIN_ACCESS_TOKEN)).status,
    ])
    expect(matrix).toEqual([
      [401, 403, 200],
      [401, 403, 200],
      [401, 403, 200],
      [401, 403, 200],
    ])
    expect(call('GET', '/api/v1/orders/all', authed(stubToken.access_token))).toEqual({
      status: 403,
      body: { detail: STUB_ERROR_DETAILS.forbidden },
    })
    expect(
      call('GET', '/api/v1/users/999', authed(STUB_ADMIN_ACCESS_TOKEN)),
    ).toEqual({ status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } })
  })

  it('category reads serve list/roots/detail/children/with-products honestly', () => {
    const list = call('GET', '/api/v1/categories/')
    expect((list.body as unknown as unknown[])).toHaveLength(3)
    expect(call('GET', '/api/v1/categories/999')).toEqual({
      status: 404,
      body: { detail: STUB_ERROR_DETAILS.notFound },
    })
    const subs = call('GET', '/api/v1/categories/2/subcategories')
    expect(subs.body).toHaveLength(1)
    expect(call('GET', '/api/v1/categories/3/subcategories').body).toHaveLength(0)
    const withProducts = call('GET', '/api/v1/categories/2/with-products')
    expect(withProducts.body).toMatchObject({ id: 2, product_count: 1 })
    expect((withProducts.body as unknown as { products: unknown[] }).products).toHaveLength(1)
  })

  it('product reads filter, paginate, sort and 404 unknown slugs', () => {
    const byCategory = call('GET', '/api/v1/products/category/3')
    expect(byCategory.body).toHaveLength(1)
    const search = call('GET', '/api/v1/products/search?query=tet&is_featured=true&limit=1')
    expect(search.body).toHaveLength(1)
    const sorted = call('GET', '/api/v1/products/?sort_by=price&sort_order=desc')
    expect((sorted.body as unknown as { id: number }[]).map((product) => product.id)).toEqual([1, 6])
    expect(call('GET', '/api/v1/products/slug/tetera').status).toBe(200)
    expect(call('GET', '/api/v1/products/sku/NOPE')).toEqual({
      status: 404,
      body: { detail: STUB_ERROR_DETAILS.notFound },
    })
    expect(call('GET', '/api/v1/products/999')).toEqual({
      status: 404,
      body: { detail: STUB_ERROR_DETAILS.notFound },
    })
  })

  it('cart add/update recompute subtotals in integer cents, never floats', () => {
    const added = call('POST', '/api/v1/cart/items', {
      bodyText: JSON.stringify({ product_id: 6, quantity: 3 }),
    })
    expect(added.body).toMatchObject({
      product_id: 6,
      quantity: 3,
      unit_price: '9.99',
      subtotal: '29.97',
    })
    const updated = call('PUT', '/api/v1/cart/items/7', {
      bodyText: JSON.stringify({ quantity: 3 }),
    })
    expect(updated.body).toMatchObject({ quantity: 3, subtotal: '59.97' })
    expect(applyProductFilters([...stubProductList], { sort_by: 'price' }).map((p) => p.id)).toEqual([
      6, 1,
    ])
  })

  it('guest session cart has a seam; validate derives from the served cart', () => {
    const session = call('GET', '/api/v1/cart/session/sess-9')
    expect(session.body).toMatchObject({ user_id: null, session_id: 'sess-9' })
    const merged = call('POST', '/api/v1/cart/merge/3')
    expect(merged.body).toMatchObject({ id: stubCart.id })
    const blocked = createStubBackend({ stock: 'blocked' }).handle({
      method: 'GET',
      url: '/api/v1/cart/validate',
    })
    expect(blocked.body).toMatchObject({
      valid: false,
      issues: [{ product_id: 1, available: 0, requested: 2 }],
    })
    const emptyBlocked = createStubBackend({ stock: 'blocked', cart: 'empty' }).handle({
      method: 'GET',
      url: '/api/v1/cart/validate',
    })
    expect(emptyBlocked.body).toEqual({ valid: true, issues: [] })
  })

  it('order transitions speak query params; creation blocks on stock', () => {
    const shipped = call('PUT', '/api/v1/orders/9/status?new_status=shipped')
    expect(shipped.body).toMatchObject({ status: 'shipped' })
    // A JSON body is ignored: the contract is query-only (review C1).
    const ignored = call('PUT', '/api/v1/orders/9/status?new_status=shipped', {
      bodyText: JSON.stringify({ status: 'cancelled' }),
    })
    expect(ignored.body).toMatchObject({ status: 'shipped' })
    const bad = call('PUT', '/api/v1/orders/9/status?new_status=vaporware')
    expect(bad.status).toBe(422)
    expect(bad.body).toMatchObject({ detail: [{ loc: ['query', 'new_status'] }] })
    const paid = call('PUT', '/api/v1/orders/9/payment-status?payment_status=paid')
    expect(paid.body).toMatchObject({ payment_status: 'paid' })
    const cancelled = call('POST', '/api/v1/orders/9/cancel')
    expect(cancelled.body).toMatchObject({ status: 'cancelled' })
    expect(call('POST', '/api/v1/orders/999/cancel')).toEqual({
      status: 404,
      body: { detail: STUB_ERROR_DETAILS.notFound },
    })
    expect(call('GET', '/api/v1/orders/999')).toEqual({
      status: 404,
      body: { detail: STUB_ERROR_DETAILS.notFound },
    })
    expect(call('GET', '/api/v1/orders/?status=pending').body).toHaveLength(1)
    expect(call('GET', '/api/v1/orders/?status=shipped').body).toHaveLength(0)
    const blockedCreate = createStubBackend({ stock: 'blocked' }).handle({
      method: 'POST',
      url: '/api/v1/orders/',
    })
    expect(blockedCreate).toEqual({
      status: 409,
      body: { detail: STUB_ERROR_DETAILS.insufficientStock },
    })
  })

  it('placing an order consumes the cart (T008)', () => {
    const backend = createStubBackend()
    expect(
      backend.handle({ method: 'GET', url: '/api/v1/cart/' }).body,
    ).toMatchObject({ total_items: 2 })
    const placed = backend.handle({ method: 'POST', url: '/api/v1/orders/' })
    expect(placed.status).toBe(200)
    expect(backend.handle({ method: 'GET', url: '/api/v1/cart/' }).body).toMatchObject({
      items: [],
      total_items: 0,
      total_amount: '0.00',
    })
    expect(backend.handle({ method: 'GET', url: '/api/v1/cart/validate' }).body).toEqual({
      valid: true,
      issues: [],
    })
  })

  it('track serves a stub-defined timeline; unknown contracts fail loud', () => {
    const track = call('GET', '/api/v1/orders/9/track')
    expect(track.body).toMatchObject({
      order_id: 9,
      status: stubOrder.status,
      timeline: [{ status: 'pending', at: stubOrder.created_at }],
    })
    expect(call('GET', '/api/v1/orders/9/track/').body).toMatchObject({ order_id: 9 })
    expect(call('GET', '/api/v1/health/db').body).toEqual({ status: 'ok' })
    expect(call('DELETE', '/api/v1/auth/login')).toEqual({
      status: 404,
      body: { detail: STUB_ERROR_DETAILS.notFound },
    })
  })
})
