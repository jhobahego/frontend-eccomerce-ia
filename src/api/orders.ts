import { apiRequest } from './client'
import type { Cart, Order, OrderStatus, PaymentStatus } from './types'

/**
 * Order creation layer (T008). Only create-from-cart exists — direct orders
 * were cut from scope (decisions 2026-09-26, the spec never asks for them).
 * The payment method travels as an informative string; there is no gateway.
 */

export interface ShippingForm {
  shipping_address: string
  shipping_city: string
  shipping_country: string
  shipping_postal_code: string
  shipping_phone?: string
  billing_address?: string
  billing_city?: string
  billing_country?: string
  billing_postal_code?: string
  notes?: string
  payment_method?: string
}

export interface OrderCreateBody {
  shipping_address: string
  shipping_city: string
  shipping_country: string
  shipping_postal_code: string
  shipping_phone?: string
  billing_address?: string
  billing_city?: string
  billing_country?: string
  billing_postal_code?: string
  notes?: string
  payment_method?: string
  items: Array<{ product_id: number; quantity: number }>
}

const REQUIRED_MESSAGES: Record<string, string> = {
  shipping_address: 'La dirección es obligatoria.',
  shipping_city: 'La ciudad es obligatoria.',
  shipping_country: 'El país es obligatorio.',
  shipping_postal_code: 'El código postal es obligatorio.',
}

/** Client-side required check; the server 422 stays as backstop. */
export function validateShipping(form: ShippingForm): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
    const value = form[field as keyof ShippingForm]
    if (typeof value !== 'string' || value.trim() === '') {
      errors[field] = message
    }
  }
  return errors
}

function optionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Maps served cart lines to the `items` the API requires (verbatim ids/qtys). */
export function buildOrderCreate(cart: Cart, form: ShippingForm): OrderCreateBody {
  const body: OrderCreateBody = {
    shipping_address: form.shipping_address.trim(),
    shipping_city: form.shipping_city.trim(),
    shipping_country: form.shipping_country.trim(),
    shipping_postal_code: form.shipping_postal_code.trim(),
    items: cart.items.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
  }
  const optionals: Array<
    | 'shipping_phone'
    | 'billing_address'
    | 'billing_city'
    | 'billing_country'
    | 'billing_postal_code'
    | 'notes'
    | 'payment_method'
  > = [
    'shipping_phone',
    'billing_address',
    'billing_city',
    'billing_country',
    'billing_postal_code',
    'notes',
    'payment_method',
  ]
  for (const field of optionals) {
    const value = optionalText(form[field])
    if (value !== undefined) {
      body[field] = value
    }
  }
  return body
}

export function createOrder(body: OrderCreateBody): Promise<Order> {
  return apiRequest<Order>('/api/v1/orders/', { method: 'POST', body })
}

/**
 * Owned history + private tracking (T009). Summaries and timelines are
 * stub-defined shapes (the snapshot leaves them untyped); they are pinned in
 * the contract suite as decisions, like the rest of the stub vocabulary.
 */
export interface OrderSummary {
  id: number
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  total_amount: string
  total_items: number
  created_at: string
}

export interface TrackingEntry {
  status: string
  at: string
}

export interface OrderTracking {
  order_id: number
  status: OrderStatus
  timeline: TrackingEntry[]
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
}

/**
 * Timeline entries are stub-defined loose strings, so labels accept any
 * string and fall back to the raw value instead of throwing on unknowns.
 */
export function orderStatusLabel(status: string): string {
  return (ORDER_STATUS_LABELS as Record<string, string>)[status] ?? status
}

export function paymentStatusLabel(status: string): string {
  return (PAYMENT_STATUS_LABELS as Record<string, string>)[status] ?? status
}

/**
 * Client hint for showing the cancel action. The server stays authoritative:
 * a late cancel is rejected there and mapped to guidance, never assumed.
 */
export function isCancellableStatus(status: string): boolean {
  return status === 'pending' || status === 'confirmed'
}

export function fetchOwnOrders(): Promise<OrderSummary[]> {
  return apiRequest<OrderSummary[]>('/api/v1/orders/')
}

export function fetchOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`/api/v1/orders/${id}`)
}

export function fetchOrderTracking(id: number): Promise<OrderTracking> {
  return apiRequest<OrderTracking>(`/api/v1/orders/${id}/track`)
}

export function cancelOwnOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`/api/v1/orders/${id}/cancel`, { method: 'POST' })
}
