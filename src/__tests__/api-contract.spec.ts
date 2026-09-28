import { describe, it, expect } from 'vitest'

import snapshot from './fixtures/openapi.snapshot.json'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../api/types'

const schemas = snapshot.components.schemas as Record<string, Record<string, unknown>>

function requiredOf(name: string): string[] {
  const schema = schemas[name] as { required?: string[] }
  return schema.required ?? []
}

describe('api contract snapshot (T002)', () => {
  it('pins the backend contract version', () => {
    expect(snapshot.info.title).toBe('Ecommerce API')
    expect(snapshot.info.version).toBe('1.0.0')
    expect(Object.keys(snapshot.paths).length).toBeGreaterThan(40)
  })

  it('product required set matches exactly (additive drift breaks here on purpose)', () => {
    expect(requiredOf('Product')).toEqual([
      'name',
      'sku',
      'price',
      'category_id',
      'id',
      'slug',
      'created_at',
      'current_price',
      'is_in_stock',
      'is_low_stock',
    ])
    const product = schemas['Product'] as
      { properties?: Record<string, { type?: string }> } | undefined
    expect(product?.properties?.['price']?.type).toBe('string')
  })

  it('order, order-item and cart required sets match exactly', () => {
    expect(requiredOf('Order')).toEqual([
      'shipping_address',
      'shipping_city',
      'shipping_country',
      'shipping_postal_code',
      'id',
      'order_number',
      'user_id',
      'status',
      'payment_status',
      'subtotal',
      'tax_amount',
      'shipping_cost',
      'discount_amount',
      'total_amount',
      'created_at',
      'total_items',
    ])
    expect(requiredOf('OrderItem')).toEqual([
      'product_id',
      'quantity',
      'unit_price',
      'id',
      'order_id',
      'product_name',
      'product_sku',
      'total_price',
      'created_at',
    ])
    expect(requiredOf('CartItem')).toEqual([
      'product_id',
      'quantity',
      'id',
      'cart_id',
      'unit_price',
      'created_at',
      'subtotal',
      'product',
    ])
  })

  it('order and payment lifecycles match the exported constants', () => {
    const orderStatus = schemas['OrderStatus'] as { enum: string[] }
    const paymentStatus = schemas['PaymentStatus'] as { enum: string[] }
    expect([...ORDER_STATUSES]).toEqual(orderStatus.enum)
    expect([...PAYMENT_STATUSES]).toEqual(paymentStatus.enum)
  })

  it('auth and cart shapes match what the client will send', () => {
    expect(requiredOf('UserCreate')).toEqual(
      expect.arrayContaining(['email', 'username', 'first_name', 'last_name', 'password']),
    )
    expect(requiredOf('CartItemCreate')).toEqual(expect.arrayContaining(['product_id', 'quantity']))
    const token = schemas['Token'] as { required?: string[] }
    expect(token.required).toEqual(expect.arrayContaining(['access_token', 'refresh_token']))
  })
})
