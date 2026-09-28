import { describe, it, expect } from 'vitest'

import type { Cart, CartItem, CategoryHierarchy, Order, Product, Token, User } from '../api/types'

// Compile-time pins: every literal below carries the FULL backend shape for its
// schema (see fixtures/openapi.snapshot.json). If `types.ts` drifts — a missing
// field, a wrong name — `pnpm type-check` fails. That is the point.
const productShape: Product = {
  id: 1,
  name: 'Tetera',
  slug: 'tetera',
  sku: 'TET-001',
  price: '19.99',
  sale_price: null,
  description: null,
  short_description: null,
  stock_quantity: 4,
  min_stock_level: 5,
  is_active: true,
  is_featured: false,
  images: null,
  category_id: 2,
  created_at: '2026-09-26T00:00:00Z',
  current_price: '19.99',
  is_in_stock: true,
  is_low_stock: true,
}

const cartItemShape: CartItem = {
  id: 7,
  cart_id: 3,
  product_id: 1,
  quantity: 2,
  unit_price: '19.99',
  subtotal: '39.98',
  created_at: '2026-09-26T00:00:00Z',
  product: { name: 'Tetera', sku: 'TET-001', price: '19.99', category_id: 2 },
}

const cartShape: Cart = {
  id: 3,
  session_id: 'sess-1',
  is_active: true,
  items: [cartItemShape],
  total_items: 2,
  total_amount: '39.98',
  created_at: '2026-09-26T00:00:00Z',
}

const orderShape: Order = {
  id: 9,
  order_number: 'ORD-0009',
  user_id: 5,
  status: 'pending',
  payment_status: 'pending',
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
  created_at: '2026-09-26T00:00:00Z',
  items: [
    {
      product_id: 1,
      quantity: 2,
      unit_price: '19.99',
      id: 11,
      order_id: 9,
      product_name: 'Tetera',
      product_sku: 'TET-001',
      total_price: '39.98',
      created_at: '2026-09-26T00:00:00Z',
    },
  ],
}

const hierarchyShape: CategoryHierarchy = {
  id: 2,
  name: 'Cocina',
  slug: 'cocina',
  is_active: true,
  sort_order: 0,
  created_at: '2026-09-26T00:00:00Z',
  children: [],
  depth: 0,
}

const tokenShape: Token = { access_token: 'a', refresh_token: 'r' }

const userShape: User = {
  id: 5,
  email: 'a@b.es',
  username: 'ana',
  first_name: 'Ana',
  last_name: 'Luz',
  is_active: true,
  is_superuser: false,
  created_at: '2026-09-26T00:00:00Z',
}

describe('api shapes pinned to snapshot (T002 review I-4/I-5)', () => {
  it('holds full backend shapes behind the domain types', () => {
    expect(cartShape.total_items).toBe(2)
    expect(orderShape.items).toHaveLength(1)
    expect(hierarchyShape.depth).toBe(0)
    expect(tokenShape.token_type ?? 'bearer').toBe('bearer')
    expect(userShape.username).toBe('ana')
    expect(productShape.current_price).toBe('19.99')
  })
})
