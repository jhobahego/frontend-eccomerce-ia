import type {
  Cart,
  CartItem,
  Category,
  CategoryHierarchy,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  Token,
  User,
} from '../api/types'

/**
 * Deterministic transport-stub fixtures (T004). Every factory below returns a
 * FULL domain type from `../api/types`, so `pnpm type-check` pins the stub to
 * the same shapes the client consumes — while `stub-contract.spec.ts` pins
 * those shapes to the vendored `openapi.snapshot.json`. If the backend
 * drifts, the contract suite goes red; the stub cannot lie in green.
 *
 * Money rule (constitution, spec clarified): amounts travel as decimal
 * strings exactly as served (`"19.99"`). Nothing here is computed with
 * floats — subtotals are literal strings, and `stubBackend.ts` derives new
 * ones with integer-cents math only.
 */

const STAMP = '2026-09-26T00:00:00Z'

export const stubUser: User = {
  id: 5,
  email: 'ana@example.es',
  username: 'ana',
  first_name: 'Ana',
  last_name: 'Luz',
  phone: null,
  address: null,
  city: null,
  country: null,
  postal_code: null,
  is_active: true,
  is_superuser: false,
  created_at: STAMP,
  updated_at: null,
}

export const stubAdmin: User = {
  ...stubUser,
  id: 1,
  email: 'admin@example.es',
  username: 'admin',
  first_name: 'Admin',
  last_name: 'Tienda',
  is_superuser: true,
}

export const stubToken: Token = {
  access_token: 'stub-access-token',
  refresh_token: 'stub-refresh-token',
  token_type: 'bearer',
}

/** Bearer minted for the admin credential pair (role travels with the token). */
export const STUB_ADMIN_ACCESS_TOKEN = 'stub-access-token-admin'

/** Bearer minted by a successful refresh (rotation the client must adopt). */
export const STUB_ROTATED_ACCESS_TOKEN = 'stub-access-token-rotated'

export const stubCategoryRoots: [Category, Category] = [
  {
    id: 2,
    name: 'Cocina',
    slug: 'cocina',
    description: 'Todo para la cocina',
    is_active: true,
    parent_id: null,
    image_url: null,
    sort_order: 0,
    created_at: STAMP,
    updated_at: null,
  },
  {
    id: 3,
    name: 'Hogar',
    slug: 'hogar',
    description: null,
    is_active: true,
    parent_id: null,
    image_url: null,
    sort_order: 1,
    created_at: STAMP,
    updated_at: null,
  },
]

export const stubChildCategory: Category = {
  id: 4,
  name: 'Teteras',
  slug: 'teteras',
  description: null,
  is_active: true,
  parent_id: 2,
  image_url: null,
  sort_order: 0,
  created_at: STAMP,
  updated_at: null,
}

/** What `GET /categories/` serves: every visible category, roots and child. */
export const stubCategoryList: Category[] = [...stubCategoryRoots, stubChildCategory]

export const stubCategoryTree: CategoryHierarchy[] = [
  {
    ...stubCategoryRoots[0],
    children: [{ ...stubChildCategory, children: [], depth: 1 }],
    depth: 0,
  },
  {
    ...stubCategoryRoots[1],
    children: [],
    depth: 0,
  },
]

export const stubProduct: Product = {
  id: 1,
  name: 'Tetera',
  slug: 'tetera',
  sku: 'TET-001',
  price: '19.99',
  sale_price: null,
  description: 'Tetera de acero inoxidable',
  short_description: null,
  stock_quantity: 4,
  min_stock_level: 5,
  is_active: true,
  is_featured: true,
  images: null,
  category_id: 2,
  created_at: STAMP,
  updated_at: null,
  current_price: '19.99',
  is_in_stock: true,
  is_low_stock: true,
}

export const stubProductList: [Product, Product] = [
  stubProduct,
  {
    ...stubProduct,
    id: 6,
    name: 'Taza',
    slug: 'taza',
    sku: 'TAZ-006',
    price: '9.99',
    current_price: '9.99',
    category_id: 3,
    is_featured: false,
    is_low_stock: false,
    stock_quantity: 40,
  },
]

export const stubCartItem: CartItem = {
  id: 7,
  cart_id: 3,
  product_id: 1,
  quantity: 2,
  unit_price: '19.99',
  subtotal: '39.98',
  created_at: STAMP,
  updated_at: null,
  product: { name: 'Tetera', sku: 'TET-001', price: '19.99', category_id: 2 },
}

export const stubCart: Cart = {
  id: 3,
  user_id: null,
  session_id: 'sess-1',
  is_active: true,
  items: [stubCartItem],
  total_items: 2,
  total_amount: '39.98',
  created_at: STAMP,
  updated_at: null,
}

/**
 * Backend `CartSummary` schema (`{total_items, total_amount, items_count}`).
 * Distinct name on purpose: `types.ts` redefines `CartSummary` as a
 * client-side pick, and T007 authors must not confuse the two (review M8).
 */
export const stubBackendCartSummary = {
  total_items: 2,
  total_amount: '39.98',
  items_count: 1,
}

export const stubOrderItem: OrderItem = {
  product_id: 1,
  quantity: 2,
  unit_price: '19.99',
  id: 11,
  order_id: 9,
  product_name: 'Tetera',
  product_sku: 'TET-001',
  total_price: '39.98',
  created_at: STAMP,
}

export const stubOrder: Order = {
  id: 9,
  order_number: 'ORD-0009',
  user_id: 5,
  status: 'pending' as OrderStatus,
  payment_status: 'pending' as PaymentStatus,
  subtotal: '39.98',
  tax_amount: '0.00',
  shipping_cost: '0.00',
  discount_amount: '0.00',
  total_amount: '39.98',
  total_items: 2,
  shipping_address: 'Calle Falsa 123',
  shipping_city: 'Madrid',
  shipping_country: 'ES',
  shipping_postal_code: '28001',
  shipping_phone: null,
  billing_address: null,
  billing_city: null,
  billing_country: null,
  billing_postal_code: null,
  notes: null,
  payment_method: null,
  tracking_number: null,
  created_at: STAMP,
  updated_at: null,
  items: [stubOrderItem],
}

/** Backend `OrderSummary` schema (list views). */
export const stubOrderSummary = {
  id: 9,
  order_number: 'ORD-0009',
  status: 'pending' as OrderStatus,
  payment_status: 'pending' as PaymentStatus,
  total_amount: '39.98',
  total_items: 2,
  created_at: STAMP,
}

/**
 * Backend-verbatim error details. The typed client classifies by message, so
 * the stub must speak the backend's exact words — pinned here, consumed by
 * `stubBackend.ts`, asserted verbatim by the contract suite. `duplicateUser`
 * and `insufficientStock` are stub-defined (the snapshot gives no error
 * vocabulary); they are pinned as decisions, not backend quotes.
 */
export const STUB_ERROR_DETAILS = {
  badCredentials: 'Incorrect email or password',
  duplicateEmail: 'The user with this email already exists in the system.',
  duplicateUsername: 'The user with this username already exists in the system.',
  invalidRefresh: 'Could not validate credentials',
  notAuthenticated: 'Not authenticated',
  notFound: 'Not found',
  forbidden: 'Not authorized',
  insufficientStock: 'Insufficient stock for one or more items',
} as const
