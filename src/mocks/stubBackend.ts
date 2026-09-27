import type { OrderStatus, PaymentStatus, Product, User } from '../api/types'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../api/types'

import {
  STUB_ADMIN_ACCESS_TOKEN,
  STUB_ERROR_DETAILS,
  STUB_ROTATED_ACCESS_TOKEN,
  stubAdmin,
  stubBackendCartSummary,
  stubCart,
  stubCartItem,
  stubCategoryList,
  stubCategoryRoots,
  stubCategoryTree,
  stubChildCategory,
  stubOrder,
  stubOrderSummary,
  stubProduct,
  stubProductList,
  stubToken,
  stubUser,
} from './apiFixtures'
import { resolveStubRoute } from './stubRoutes'

/**
 * Pure decision core of the transport stub (T004 review fold).
 *
 * `createStubBackend` answers `METHOD + url + headers + body` with
 * `{status, body}` and holds NO browser dependency, so the contract suite
 * exercises the dispatcher itself — status codes, query contracts, error
 * envelopes — instead of trusting fixtures alone. `e2e/stub.ts` is a thin
 * adapter that forwards Playwright routes here and fulfills the answer.
 *
 * Stub-defined contracts (the snapshot leaves these endpoints untyped):
 * validate/track/merge/health shapes, `duplicateUsername`,
 * `insufficientStock`, admin-gating of `/orders/all`, `/users/*` (beyond
 * `/me`) and `/products/low-stock`. Each is pinned in
 * `stub-contract.spec.ts` as a named decision.
 */

export const STUB_LOGIN = { username: 'ana', password: 's3cret' } as const

export const STUB_ADMIN_LOGIN = { username: 'admin', password: 's3cret' } as const

export interface StubBackendOptions {
  user?: 'customer' | 'admin'
  cart?: 'full' | 'empty'
  stock?: 'ok' | 'blocked'
  /** `expired` forces refresh + identity reads to 401 (T005 resume flow). */
  auth?: 'ok' | 'expired'
}

export interface StubRequest {
  method: string
  url: string
  headers?: Record<string, string>
  bodyText?: string
}

export interface StubResponse {
  status: number
  body: unknown
}

const PROFILE_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'address',
  'city',
  'country',
  'postal_code',
] as const

function pickProfile(body: Record<string, unknown>): Partial<User> {
  const picked: Record<string, unknown> = {}
  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      picked[field] = body[field]
    }
  }
  return picked as Partial<User>
}

function parseBody(text: string | undefined): Record<string, unknown> {
  if (text === undefined || text === '') {
    return {}
  }
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

function parseForm(text: string | undefined): Record<string, string> {
  try {
    return Object.fromEntries(new URLSearchParams(text ?? '').entries())
  } catch {
    return {}
  }
}

/** Integer-cents math: `"19.99" * 2` without ever touching a float. */
export function centsOf(amount: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(amount)
  if (match?.[1] === undefined || match?.[2] === undefined) {
    throw new Error(`Stub cannot price malformed amount ${amount}`)
  }
  return Number(match[1]) * 100 + Number(match[2])
}

export function moneyOf(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export interface ProductQuery {
  query?: string
  category_id?: number
  min_price?: string
  max_price?: string
  is_featured?: boolean
  in_stock?: boolean
  sort_by?: string
  sort_order?: string
  skip?: number
  limit?: number
}

/** Pure product filtering shared by base list, search and by-category. */
export function applyProductFilters(products: Product[], query: ProductQuery): Product[] {
  let result = [...products]
  if (query.query !== undefined && query.query !== '') {
    const needle = query.query.toLowerCase()
    result = result.filter((product) => product.name.toLowerCase().includes(needle))
  }
  if (query.category_id !== undefined) {
    result = result.filter((product) => product.category_id === query.category_id)
  }
  if (query.min_price !== undefined && query.min_price !== '') {
    const floor = centsOf(query.min_price)
    result = result.filter((product) => centsOf(product.current_price) >= floor)
  }
  if (query.max_price !== undefined && query.max_price !== '') {
    const ceiling = centsOf(query.max_price)
    result = result.filter((product) => centsOf(product.current_price) <= ceiling)
  }
  if (query.is_featured !== undefined) {
    result = result.filter((product) => product.is_featured === query.is_featured)
  }
  if (query.in_stock !== undefined) {
    result = result.filter((product) => product.is_in_stock === query.in_stock)
  }
  if (query.sort_by === 'price') {
    const direction = query.sort_order === 'desc' ? -1 : 1
    result.sort(
      (left, right) =>
        direction * (centsOf(left.current_price) - centsOf(right.current_price)),
    )
  }
  const skip = query.skip ?? 0
  const limit = query.limit ?? result.length
  return result.slice(skip, skip + limit)
}

function numberParam(params: URLSearchParams, name: string): number | undefined {
  const raw = params.get(name)
  if (raw === null || raw === '') {
    return undefined
  }
  const value = Number(raw)
  return Number.isInteger(value) ? value : undefined
}

function booleanParam(params: URLSearchParams, name: string): boolean | undefined {
  const raw = params.get(name)
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  return undefined
}

function productQueryOf(params: URLSearchParams): ProductQuery {
  return {
    query: params.get('query') ?? undefined,
    category_id: numberParam(params, 'category_id'),
    min_price: params.get('min_price') ?? undefined,
    max_price: params.get('max_price') ?? undefined,
    is_featured: booleanParam(params, 'is_featured'),
    in_stock: booleanParam(params, 'in_stock'),
    sort_by: params.get('sort_by') ?? undefined,
    sort_order: params.get('sort_order') ?? undefined,
    skip: numberParam(params, 'skip'),
    limit: numberParam(params, 'limit'),
  }
}

function lastSegment(pathname: string): string {
  const segments = pathname.split('/').filter((segment) => segment !== '')
  return segments[segments.length - 1] ?? ''
}

/** The id that follows a collection segment (`/orders/9/status` → `9`). */
function idAfter(pathname: string, collection: string): number {
  const segments = pathname.split('/').filter((segment) => segment !== '')
  return Number(segments[segments.indexOf(collection) + 1])
}

export function createStubBackend(options: StubBackendOptions = {}): {
  handle: (request: StubRequest) => StubResponse
} {
  const customer: User = { ...stubUser }
  const admin: User = { ...stubAdmin }
  const defaultIdentity = options.user === 'admin' ? admin : customer

  const fullCart = options.cart === 'empty' ? null : stubCart

  // Ordering consumes the cart (T008): once this instance mints an order,
  // every cart read serves empty — the real backend deactivates the cart the
  // same way, so refetch-after-order stays empty deterministically.
  let orderPlaced = false

  function bearerOf(headers: Record<string, string>): string | null {
    const header = headers['authorization'] ?? headers['Authorization'] ?? ''
    const match = /^Bearer (.+)$/i.exec(header)
    return match?.[1] ?? null
  }

  function identityOf(token: string | null): User | null {
    // Order matters: the admin and rotated tokens are distinct strings, so a
    // leaked customer token can never mint admin identity (review C2 class).
    if (token === STUB_ADMIN_ACCESS_TOKEN) {
      return admin
    }
    if (token === stubToken.access_token || token === STUB_ROTATED_ACCESS_TOKEN) {
      return defaultIdentity
    }
    return null
  }

  function requireIdentity(headers: Record<string, string>): User | StubResponse {
    if (options.auth === 'expired') {
      return { status: 401, body: { detail: STUB_ERROR_DETAILS.notAuthenticated } }
    }
    const identity = identityOf(bearerOf(headers))
    if (identity === null) {
      return { status: 401, body: { detail: STUB_ERROR_DETAILS.notAuthenticated } }
    }
    return identity
  }

  function requireAdmin(headers: Record<string, string>): User | StubResponse {
    const identity = requireIdentity(headers)
    if ('status' in identity) {
      return identity
    }
    if (!identity.is_superuser) {
      return { status: 403, body: { detail: STUB_ERROR_DETAILS.forbidden } }
    }
    return identity
  }

  function servedCart(): typeof stubCart {
    if (orderPlaced || fullCart === null) {
      return { ...stubCart, items: [], total_items: 0, total_amount: '0.00' }
    }
    return fullCart
  }

  function priceFor(productId: number): Product {
    return stubProductList.find((product) => product.id === productId) ?? stubProduct
  }

  function handle(request: StubRequest): StubResponse {
    const url = new URL(request.url, 'http://stub.local')
    const headers = request.headers ?? {}
    const key = resolveStubRoute(request.method, url.pathname)

    switch (key) {
      case 'POST /api/v1/auth/login': {
        const form = parseForm(request.bodyText)
        if (
          form['username'] === STUB_LOGIN.username &&
          form['password'] === STUB_LOGIN.password
        ) {
          return { status: 200, body: stubToken }
        }
        if (
          form['username'] === STUB_ADMIN_LOGIN.username &&
          form['password'] === STUB_ADMIN_LOGIN.password
        ) {
          return {
            status: 200,
            body: { ...stubToken, access_token: STUB_ADMIN_ACCESS_TOKEN },
          }
        }
        return { status: 401, body: { detail: STUB_ERROR_DETAILS.badCredentials } }
      }

      case 'POST /api/v1/auth/register': {
        // Never echo the request body: the response is a server-built User
        // with no password key and no privilege flags (review C2).
        const body = parseBody(request.bodyText)
        if (body['email'] === stubUser.email || body['email'] === stubAdmin.email) {
          return { status: 400, body: { detail: STUB_ERROR_DETAILS.duplicateEmail } }
        }
        if (body['username'] === stubUser.username || body['username'] === stubAdmin.username) {
          return { status: 400, body: { detail: STUB_ERROR_DETAILS.duplicateUsername } }
        }
        return {
          status: 200,
          body: {
            ...stubUser,
            ...pickProfile(body),
            email: typeof body['email'] === 'string' ? body['email'] : stubUser.email,
            username:
              typeof body['username'] === 'string' ? body['username'] : 'newuser',
            id: 6,
          },
        }
      }

      case 'POST /api/v1/auth/refresh': {
        const body = parseBody(request.bodyText)
        if (options.auth === 'expired' || body['refresh_token'] !== stubToken.refresh_token) {
          return { status: 401, body: { detail: STUB_ERROR_DETAILS.invalidRefresh } }
        }
        return {
          status: 200,
          body: { ...stubToken, access_token: STUB_ROTATED_ACCESS_TOKEN },
        }
      }

      case 'GET /api/v1/auth/me':
      case 'GET /api/v1/users/me': {
        const identity = requireIdentity(headers)
        return 'status' in identity ? identity : { status: 200, body: identity }
      }

      case 'PUT /api/v1/users/me': {
        const identity = requireIdentity(headers)
        if ('status' in identity) {
          return identity
        }
        Object.assign(identity, pickProfile(parseBody(request.bodyText)))
        return { status: 200, body: identity }
      }

      case 'GET /api/v1/users/': {
        const adminOnly = requireAdmin(headers)
        if ('status' in adminOnly) {
          return adminOnly
        }
        return { status: 200, body: [admin, customer] }
      }

      case 'GET /api/v1/users/{user_id}': {
        const adminOnly = requireAdmin(headers)
        if ('status' in adminOnly) {
          return adminOnly
        }
        const wanted = Number(lastSegment(url.pathname))
        const found = [admin, customer].find((user) => user.id === wanted)
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: found }
      }

      case 'GET /api/v1/categories/': {
        return { status: 200, body: stubCategoryList.slice(0) }
      }

      case 'GET /api/v1/categories/roots': {
        return { status: 200, body: stubCategoryRoots.slice(0) }
      }

      case 'GET /api/v1/categories/hierarchy': {
        return { status: 200, body: stubCategoryTree }
      }

      case 'GET /api/v1/categories/{category_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const found = stubCategoryList.find((category) => category.id === wanted)
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: found }
      }

      case 'GET /api/v1/categories/{category_id}/subcategories': {
        const wanted = idAfter(url.pathname, 'categories')
        const children =
          wanted === stubCategoryRoots[0].id ? [{ ...stubChildCategory }] : []
        return { status: 200, body: children }
      }

      case 'GET /api/v1/categories/{category_id}/with-products': {
        const wanted = idAfter(url.pathname, 'categories')
        const category = stubCategoryList.find((entry) => entry.id === wanted)
        if (category === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        const products = stubProductList.filter(
          (product) => product.category_id === wanted,
        )
        return {
          status: 200,
          body: { ...category, products, product_count: products.length },
        }
      }

      case 'GET /api/v1/products/':
      case 'GET /api/v1/products/search':
      case 'POST /api/v1/products/search': {
        return {
          status: 200,
          body: applyProductFilters([...stubProductList], productQueryOf(url.searchParams)),
        }
      }

      case 'GET /api/v1/products/featured': {
        return { status: 200, body: [stubProduct] }
      }

      case 'GET /api/v1/products/low-stock': {
        const adminOnly = requireAdmin(headers)
        if ('status' in adminOnly) {
          return adminOnly
        }
        return {
          status: 200,
          body: stubProductList.filter((product) => product.is_low_stock),
        }
      }

      case 'GET /api/v1/products/category/{category_id}': {
        const wanted = Number(lastSegment(url.pathname))
        return {
          status: 200,
          body: applyProductFilters([...stubProductList], {
            ...productQueryOf(url.searchParams),
            category_id: wanted,
          }),
        }
      }

      case 'GET /api/v1/products/slug/{slug}':
      case 'GET /api/v1/products/sku/{sku}': {
        const wanted = lastSegment(url.pathname).toLowerCase()
        const found = stubProductList.find(
          (product) =>
            product.slug.toLowerCase() === wanted || product.sku.toLowerCase() === wanted,
        )
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: { ...found, category: stubCategoryRoots[0] } }
      }

      case 'GET /api/v1/products/{product_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const found =
          stubProductList.find((product) => product.id === wanted) ?? null
        if (found === null) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: { ...found, category: stubCategoryRoots[0] } }
      }

      case 'GET /api/v1/products/{product_id}/similar': {
        return { status: 200, body: [stubProductList[1]] }
      }

      case 'GET /api/v1/cart/': {
        return { status: 200, body: servedCart() }
      }

      case 'GET /api/v1/cart/summary': {
        if (orderPlaced || fullCart === null) {
          return {
            status: 200,
            body: { ...stubBackendCartSummary, total_items: 0, total_amount: '0.00', items_count: 0 },
          }
        }
        return { status: 200, body: stubBackendCartSummary }
      }

      case 'GET /api/v1/cart/validate': {
        if (orderPlaced || fullCart === null) {
          return { status: 200, body: { valid: true, issues: [] } }
        }
        if (options.stock === 'blocked') {
          return {
            status: 200,
            body: {
              valid: false,
              issues: fullCart.items.map((line) => ({
                product_id: line.product_id,
                available: 0,
                requested: line.quantity,
              })),
            },
          }
        }
        return { status: 200, body: { valid: true, issues: [] } }
      }

      case 'POST /api/v1/cart/items': {
        const body = parseBody(request.bodyText)
        const productId =
          typeof body['product_id'] === 'number' ? body['product_id'] : stubCartItem.product_id
        const quantity = typeof body['quantity'] === 'number' ? body['quantity'] : 1
        const product = priceFor(productId)
        return {
          status: 200,
          body: {
            ...stubCartItem,
            product_id: productId,
            quantity,
            unit_price: product.current_price,
            subtotal: moneyOf(centsOf(product.current_price) * quantity),
            product: {
              name: product.name,
              sku: product.sku,
              price: product.price,
              category_id: product.category_id,
            },
          },
        }
      }

      case 'PUT /api/v1/cart/items/{item_id}': {
        const body = parseBody(request.bodyText)
        const quantity = typeof body['quantity'] === 'number' ? body['quantity'] : 1
        const product = priceFor(stubCartItem.product_id)
        return {
          status: 200,
          body: {
            ...stubCartItem,
            quantity,
            unit_price: product.current_price,
            subtotal: moneyOf(centsOf(product.current_price) * quantity),
          },
        }
      }

      case 'DELETE /api/v1/cart/items/{item_id}':
      case 'DELETE /api/v1/cart/clear': {
        return {
          status: 200,
          body: { ...stubCart, items: [], total_items: 0, total_amount: '0.00' },
        }
      }

      case 'GET /api/v1/cart/session/{session_id}': {
        return {
          status: 200,
          body: { ...servedCart(), user_id: null, session_id: lastSegment(url.pathname) },
        }
      }

      case 'POST /api/v1/cart/session/{session_id}/items': {
        const added = handle({
          method: 'POST',
          url: 'http://stub.local/api/v1/cart/items',
          headers,
          bodyText: request.bodyText,
        })
        if (added.status !== 200) {
          return added
        }
        return {
          status: 200,
          body: {
            ...(added.body as Record<string, unknown>),
            cart_id: stubCart.id,
          },
        }
      }

      case 'POST /api/v1/cart/merge/{session_cart_id}': {
        return { status: 200, body: servedCart() }
      }

      case 'POST /api/v1/orders/': {
        if (options.stock === 'blocked' && fullCart !== null) {
          return { status: 409, body: { detail: STUB_ERROR_DETAILS.insufficientStock } }
        }
        orderPlaced = true
        return { status: 200, body: stubOrder }
      }

      case 'GET /api/v1/orders/': {
        const wanted = url.searchParams.get('status')
        const summaries =
          wanted === null
            ? [stubOrderSummary]
            : [stubOrderSummary].filter((order) => order.status === wanted)
        return { status: 200, body: summaries }
      }

      case 'GET /api/v1/orders/all': {
        const adminOnly = requireAdmin(headers)
        if ('status' in adminOnly) {
          return adminOnly
        }
        const wanted = url.searchParams.get('status')
        const summaries =
          wanted === null
            ? [stubOrderSummary]
            : [stubOrderSummary].filter((order) => order.status === wanted)
        return { status: 200, body: summaries }
      }

      case 'GET /api/v1/orders/{order_id}': {
        const wanted = Number(lastSegment(url.pathname))
        if (wanted !== stubOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: stubOrder }
      }

      case 'GET /api/v1/orders/{order_id}/track': {
        const wanted = idAfter(url.pathname, 'orders')
        if (wanted !== stubOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return {
          status: 200,
          body: {
            order_id: wanted,
            status: stubOrder.status,
            timeline: [{ status: 'pending', at: stubOrder.created_at }],
          },
        }
      }

      case 'POST /api/v1/orders/{order_id}/cancel': {
        const wanted = idAfter(url.pathname, 'orders')
        if (wanted !== stubOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: { ...stubOrder, status: 'cancelled' as OrderStatus } }
      }

      case 'PUT /api/v1/orders/{order_id}/status':
      case 'PUT /api/v1/orders/{order_id}/payment-status': {
        // The snapshot defines both transitions as REQUIRED QUERY params
        // with no request body (review C1) — a spec-correct client sends
        // `?new_status=shipped`, never JSON.
        const wanted = idAfter(url.pathname, 'orders')
        if (wanted !== stubOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        if (key === 'PUT /api/v1/orders/{order_id}/status') {
          const next = url.searchParams.get('new_status')
          if (
            next === null ||
            !(ORDER_STATUSES as readonly string[]).includes(next)
          ) {
            return {
              status: 422,
              body: {
                detail: [
                  {
                    loc: ['query', 'new_status'],
                    msg: 'Invalid order status',
                    type: 'enum',
                  },
                ],
              },
            }
          }
          return { status: 200, body: { ...stubOrder, status: next as OrderStatus } }
        }
        const nextPayment = url.searchParams.get('payment_status')
        if (
          nextPayment === null ||
          !(PAYMENT_STATUSES as readonly string[]).includes(nextPayment)
        ) {
          return {
            status: 422,
            body: {
              detail: [
                {
                  loc: ['query', 'payment_status'],
                  msg: 'Invalid payment status',
                  type: 'enum',
                },
              ],
            },
          }
        }
        return {
          status: 200,
          body: { ...stubOrder, payment_status: nextPayment as PaymentStatus },
        }
      }

      case 'GET /api/v1/health/':
      case 'GET /api/v1/health/db': {
        return { status: 200, body: { status: 'ok' } }
      }

      default: {
        // Loud fallback: an un-stubbed contract is a hole, never a live call.
        return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
      }
    }
  }

  return { handle }
}
