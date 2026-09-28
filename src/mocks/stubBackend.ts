import type { Category, Order, OrderStatus, PaymentStatus, Product, User } from '../api/types'
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
  stubCategoryTree,
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
      (left, right) => direction * (centsOf(left.current_price) - centsOf(right.current_price)),
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

/** Server-derived display fields, recomputed after every write. */
function deriveProduct(base: Product): Product {
  const current = base.sale_price ?? base.price
  return {
    ...base,
    current_price: current,
    is_in_stock: base.stock_quantity > 0,
    is_low_stock: base.stock_quantity <= base.min_stock_level,
  }
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function optionalCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}

function validationError(field: string, message: string): StubResponse {
  return {
    status: 422,
    body: { detail: [{ loc: ['body', field], msg: message, type: 'value_error' }] },
  }
}

export function createStubBackend(options: StubBackendOptions = {}): {
  handle: (request: StubRequest) => StubResponse
} {
  const customer: User = { ...stubUser }
  const admin: User = { ...stubAdmin }
  const defaultIdentity = options.user === 'admin' ? admin : customer

  // Mutable catalog (T010): reads serve these arrays, writes mutate them, so
  // admin CRUD is observable in later reads within one instance. Fresh
  // instances start from the fixtures, keeping the contract suite green.
  const categories: Category[] = stubCategoryList.map((entry) => ({ ...entry }))
  const products: Product[] = stubProductList.map((entry) => ({ ...entry }))
  let nextCategoryId = 100
  let nextProductId = 100

  const fullCart = options.cart === 'empty' ? null : stubCart

  // Ordering consumes the cart (T008): once this instance mints an order,
  // every cart read serves empty — the real backend deactivates the cart the
  // same way, so refetch-after-order stays empty deterministically.
  let orderPlaced = false

  // Mutable order (T012): status/payment transitions persist per instance so
  // the admin→customer propagation is observable in later reads within one
  // instance. Fresh instances start pending, keeping the contract suite green.
  let currentOrder: Order = { ...stubOrder, items: [...stubOrder.items] }

  function orderSummaryOf(order: Order): typeof stubOrderSummary {
    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      total_items: order.total_items,
      created_at: order.created_at,
    }
  }

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
    return products.find((product) => product.id === productId) ?? stubProduct
  }

  function handle(request: StubRequest): StubResponse {
    const url = new URL(request.url, 'http://stub.local')
    const headers = request.headers ?? {}
    const key = resolveStubRoute(request.method, url.pathname)

    switch (key) {
      case 'POST /api/v1/auth/login': {
        const form = parseForm(request.bodyText)
        if (form['username'] === STUB_LOGIN.username && form['password'] === STUB_LOGIN.password) {
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
            username: typeof body['username'] === 'string' ? body['username'] : 'newuser',
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

      case 'POST /api/v1/categories/': {
        const body = parseBody(request.bodyText)
        if (typeof body['name'] !== 'string' || body['name'].trim() === '') {
          return validationError('name', 'Field required')
        }
        if (typeof body['slug'] !== 'string' || body['slug'].trim() === '') {
          return validationError('slug', 'Field required')
        }
        const created: Category = {
          id: nextCategoryId++,
          name: (body['name'] as string).trim(),
          slug: (body['slug'] as string).trim(),
          description: optionalText(body['description']),
          is_active: typeof body['is_active'] === 'boolean' ? body['is_active'] : true,
          parent_id: optionalCount(body['parent_id']) ?? null,
          image_url: optionalText(body['image_url']),
          sort_order: optionalCount(body['sort_order']) ?? 0,
          created_at: new Date().toISOString(),
          updated_at: null,
        }
        categories.push(created)
        return { status: 200, body: created }
      }

      case 'PUT /api/v1/categories/{category_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const found = categories.find((category) => category.id === wanted)
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        const body = parseBody(request.bodyText)
        if (typeof body['name'] === 'string' && body['name'].trim() !== '') {
          found.name = body['name'].trim()
        }
        if (typeof body['description'] === 'string' || body['description'] === null) {
          found.description = optionalText(body['description'])
        }
        if (typeof body['is_active'] === 'boolean') {
          found.is_active = body['is_active']
        }
        if (typeof body['parent_id'] === 'number' || body['parent_id'] === null) {
          found.parent_id = optionalCount(body['parent_id']) ?? null
        }
        if (typeof body['image_url'] === 'string' || body['image_url'] === null) {
          found.image_url = optionalText(body['image_url'])
        }
        const order = optionalCount(body['sort_order'])
        if (order !== undefined) {
          found.sort_order = order
        }
        found.updated_at = new Date().toISOString()
        return { status: 200, body: { ...found } }
      }

      case 'DELETE /api/v1/categories/{category_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const index = categories.findIndex((category) => category.id === wanted)
        if (index === -1) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        const [removed] = categories.splice(index, 1)
        return { status: 200, body: removed }
      }

      case 'GET /api/v1/categories/': {
        return { status: 200, body: categories.slice(0) }
      }

      case 'GET /api/v1/categories/roots': {
        return { status: 200, body: categories.filter((entry) => entry.parent_id === null) }
      }

      case 'GET /api/v1/categories/hierarchy': {
        return { status: 200, body: stubCategoryTree }
      }

      case 'GET /api/v1/categories/{category_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const found = categories.find((category) => category.id === wanted)
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: found }
      }

      case 'GET /api/v1/categories/{category_id}/subcategories': {
        const wanted = idAfter(url.pathname, 'categories')
        return { status: 200, body: categories.filter((entry) => entry.parent_id === wanted) }
      }

      case 'GET /api/v1/categories/{category_id}/with-products': {
        const wanted = idAfter(url.pathname, 'categories')
        const category = categories.find((entry) => entry.id === wanted)
        if (category === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        const listed = products.filter((product) => product.category_id === wanted)
        return {
          status: 200,
          body: { ...category, products: listed, product_count: listed.length },
        }
      }

      case 'GET /api/v1/products/':
      case 'GET /api/v1/products/search':
      case 'POST /api/v1/products/search': {
        return {
          status: 200,
          body: applyProductFilters([...products], productQueryOf(url.searchParams)),
        }
      }

      case 'GET /api/v1/products/featured': {
        return { status: 200, body: products.filter((product) => product.is_featured) }
      }

      case 'GET /api/v1/products/low-stock': {
        const adminOnly = requireAdmin(headers)
        if ('status' in adminOnly) {
          return adminOnly
        }
        return {
          status: 200,
          body: products.filter((product) => product.is_low_stock),
        }
      }

      case 'POST /api/v1/products/': {
        const body = parseBody(request.bodyText)
        for (const field of ['name', 'sku', 'price', 'slug']) {
          if (typeof body[field] !== 'string' || body[field].trim() === '') {
            return validationError(field, 'Field required')
          }
        }
        const price = (body['price'] as string).trim()
        if (!/^\d+\.\d{2}$/.test(price)) {
          return validationError('price', 'Invalid amount, expected NN.NN')
        }
        const categoryId = optionalCount(body['category_id'])
        if (categoryId === undefined || !categories.some((entry) => entry.id === categoryId)) {
          return validationError('category_id', 'Unknown category')
        }
        const created: Product = deriveProduct({
          id: nextProductId++,
          name: (body['name'] as string).trim(),
          slug: (body['slug'] as string).trim(),
          sku: (body['sku'] as string).trim(),
          price,
          sale_price:
            typeof body['sale_price'] === 'string' ? (body['sale_price'] as string) : null,
          description: optionalText(body['description']),
          short_description: optionalText(body['short_description']),
          stock_quantity: optionalCount(body['stock_quantity']) ?? 0,
          min_stock_level: optionalCount(body['min_stock_level']) ?? 0,
          is_active: typeof body['is_active'] === 'boolean' ? body['is_active'] : true,
          is_featured: body['is_featured'] === true,
          images: Array.isArray(body['images']) ? (body['images'] as string[]) : null,
          category_id: categoryId,
          created_at: new Date().toISOString(),
          updated_at: null,
          current_price: price,
          is_in_stock: true,
          is_low_stock: false,
        })
        products.push(created)
        return { status: 200, body: created }
      }

      case 'PUT /api/v1/products/{product_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const found = products.find((product) => product.id === wanted)
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        const body = parseBody(request.bodyText)
        if (typeof body['name'] === 'string' && body['name'].trim() !== '') {
          found.name = body['name'].trim()
        }
        if (typeof body['price'] === 'string') {
          const price = body['price'].trim()
          if (!/^\d+\.\d{2}$/.test(price)) {
            return validationError('price', 'Invalid amount, expected NN.NN')
          }
          found.price = price
        }
        if (typeof body['sale_price'] === 'string' || body['sale_price'] === null) {
          found.sale_price = optionalText(body['sale_price'])
        }
        if (typeof body['description'] === 'string' || body['description'] === null) {
          found.description = optionalText(body['description'])
        }
        const stock = optionalCount(body['stock_quantity'])
        if (stock !== undefined) {
          found.stock_quantity = stock
        }
        const floor = optionalCount(body['min_stock_level'])
        if (floor !== undefined) {
          found.min_stock_level = floor
        }
        const categoryId = optionalCount(body['category_id'])
        if (categoryId !== undefined) {
          found.category_id = categoryId
        }
        if (typeof body['is_active'] === 'boolean') {
          found.is_active = body['is_active']
        }
        if (typeof body['is_featured'] === 'boolean') {
          found.is_featured = body['is_featured']
        }
        found.updated_at = new Date().toISOString()
        Object.assign(found, deriveProduct(found))
        return { status: 200, body: { ...found } }
      }

      case 'DELETE /api/v1/products/{product_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const index = products.findIndex((product) => product.id === wanted)
        if (index === -1) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        const [removed] = products.splice(index, 1)
        return { status: 200, body: removed }
      }

      case 'PUT /api/v1/products/{product_id}/stock': {
        // The id precedes `/stock` (same `idAfter` class as cancel/status).
        const id = idAfter(url.pathname, 'products')
        const found = products.find((product) => product.id === id)
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        const body = parseBody(request.bodyText)
        const quantity = optionalCount(body['quantity'])
        // Only `set` is pinned for v1 (absolute quantity); the snapshot
        // leaves the operation vocabulary untyped.
        if (quantity === undefined || quantity < 0 || body['operation'] !== 'set') {
          return validationError('quantity', 'Send {quantity, operation:"set"}')
        }
        found.stock_quantity = quantity
        found.updated_at = new Date().toISOString()
        Object.assign(found, deriveProduct(found))
        return { status: 200, body: { ...found } }
      }

      case 'GET /api/v1/products/category/{category_id}': {
        const wanted = Number(lastSegment(url.pathname))
        return {
          status: 200,
          body: applyProductFilters([...products], {
            ...productQueryOf(url.searchParams),
            category_id: wanted,
          }),
        }
      }

      case 'GET /api/v1/products/slug/{slug}':
      case 'GET /api/v1/products/sku/{sku}': {
        const wanted = lastSegment(url.pathname).toLowerCase()
        const found = products.find(
          (product) =>
            product.slug.toLowerCase() === wanted || product.sku.toLowerCase() === wanted,
        )
        if (found === undefined) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return {
          status: 200,
          body: {
            ...found,
            category: categories.find((entry) => entry.id === found.category_id) ?? null,
          },
        }
      }

      case 'GET /api/v1/products/{product_id}': {
        const wanted = Number(lastSegment(url.pathname))
        const found = products.find((product) => product.id === wanted) ?? null
        if (found === null) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return {
          status: 200,
          body: {
            ...found,
            category: categories.find((entry) => entry.id === found.category_id) ?? null,
          },
        }
      }

      case 'GET /api/v1/products/{product_id}/similar': {
        const fallback = products[1] ?? products[0] ?? null
        return { status: 200, body: fallback === null ? [] : [fallback] }
      }

      case 'GET /api/v1/cart/': {
        return { status: 200, body: servedCart() }
      }

      case 'GET /api/v1/cart/summary': {
        if (orderPlaced || fullCart === null) {
          return {
            status: 200,
            body: {
              ...stubBackendCartSummary,
              total_items: 0,
              total_amount: '0.00',
              items_count: 0,
            },
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

      // Branch-review C2 divergence (documented, not drift): the snapshot
      // demands Bearer on line update/remove/clear/validate, but the spec
      // requires guests to edit their carts — no client workaround exists
      // (there are no session-scoped variants of those endpoints). The stub
      // therefore serves them anonymously per spec; a live-backend smoke must
      // confirm whether the real backend enforces auth there.
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
        // The snapshot types the param as an integer cart id (review C1);
        // the client resolves the string session id first, so by the time
        // this runs the segment is numeric — still served, still stateless.
        return { status: 200, body: servedCart() }
      }

      case 'POST /api/v1/orders/': {
        if (options.stock === 'blocked' && fullCart !== null) {
          return { status: 409, body: { detail: STUB_ERROR_DETAILS.insufficientStock } }
        }
        orderPlaced = true
        currentOrder = { ...stubOrder, items: [...stubOrder.items] }
        return { status: 200, body: { ...currentOrder } }
      }

      case 'GET /api/v1/orders/': {
        const wanted = url.searchParams.get('status')
        const summaries = [orderSummaryOf(currentOrder)]
        return {
          status: 200,
          body: wanted === null ? summaries : summaries.filter((order) => order.status === wanted),
        }
      }

      case 'GET /api/v1/orders/all': {
        const adminOnly = requireAdmin(headers)
        if ('status' in adminOnly) {
          return adminOnly
        }
        const wanted = url.searchParams.get('status')
        const summaries = [orderSummaryOf(currentOrder)]
        return {
          status: 200,
          body: wanted === null ? summaries : summaries.filter((order) => order.status === wanted),
        }
      }

      case 'GET /api/v1/orders/{order_id}': {
        const wanted = Number(lastSegment(url.pathname))
        if (wanted !== currentOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return { status: 200, body: { ...currentOrder } }
      }

      case 'GET /api/v1/orders/{order_id}/track': {
        const wanted = idAfter(url.pathname, 'orders')
        if (wanted !== currentOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        return {
          status: 200,
          body: {
            order_id: wanted,
            status: currentOrder.status,
            timeline: [{ status: currentOrder.status, at: currentOrder.created_at }],
          },
        }
      }

      case 'POST /api/v1/orders/{order_id}/cancel': {
        const wanted = idAfter(url.pathname, 'orders')
        if (wanted !== currentOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        currentOrder = { ...currentOrder, status: 'cancelled' as OrderStatus }
        return { status: 200, body: { ...currentOrder } }
      }

      case 'PUT /api/v1/orders/{order_id}/status':
      case 'PUT /api/v1/orders/{order_id}/payment-status': {
        // The snapshot defines both transitions as REQUIRED QUERY params
        // with no request body (review C1) — a spec-correct client sends
        // `?new_status=shipped`, never JSON.
        const wanted = idAfter(url.pathname, 'orders')
        if (wanted !== currentOrder.id) {
          return { status: 404, body: { detail: STUB_ERROR_DETAILS.notFound } }
        }
        if (key === 'PUT /api/v1/orders/{order_id}/status') {
          const next = url.searchParams.get('new_status')
          if (next === null || !(ORDER_STATUSES as readonly string[]).includes(next)) {
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
          currentOrder = { ...currentOrder, status: next as OrderStatus }
          return { status: 200, body: { ...currentOrder } }
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
        currentOrder = { ...currentOrder, payment_status: nextPayment as PaymentStatus }
        return { status: 200, body: { ...currentOrder } }
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
