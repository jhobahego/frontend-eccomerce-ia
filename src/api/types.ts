export interface ApiError {
  code: string
  message: string
  field?: string
}

export interface Page<T> {
  items: T[]
  skip: number
  limit: number
  total?: number
}

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  postal_code?: string | null
  is_active: boolean
  is_superuser: boolean
  created_at: string
  updated_at?: string | null
}

export interface UserCreate {
  email: string
  username: string
  first_name: string
  last_name: string
  password: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  postal_code?: string | null
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type?: string
}

export interface LoginBody {
  username: string
  password: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string | null
  is_active: boolean
  parent_id?: number | null
  image_url?: string | null
  sort_order: number
  created_at: string
  updated_at?: string | null
}

export interface CategoryHierarchy extends Category {
  children: CategoryHierarchy[]
  depth: number
}

export interface ProductBase {
  name: string
  sku: string
  price: string
  category_id: number
  description?: string | null
}

export interface Product extends ProductBase {
  id: number
  slug: string
  sale_price?: string | null
  short_description?: string | null
  stock_quantity: number
  min_stock_level: number
  is_active: boolean
  is_featured: boolean
  images?: string[] | null
  created_at: string
  updated_at?: string | null
  /** Server-computed display fields. */
  current_price: string
  is_in_stock: boolean
  is_low_stock: boolean
}

export interface CartItem {
  id: number
  cart_id: number
  product_id: number
  quantity: number
  unit_price: string
  subtotal: string
  created_at: string
  updated_at?: string | null
  product: ProductBase
}

export interface CartItemCreate {
  product_id: number
  quantity: number
}

export interface Cart {
  id: number
  user_id?: number | null
  session_id?: string | null
  is_active: boolean
  items: CartItem[]
  total_items: number
  total_amount: string
  created_at: string
  updated_at?: string | null
}

/**
 * Client-side served cart view (plan §3 `CartSummary` contract). NOT the
 * backend `CartSummary` schema (`{total_items, total_amount, items_count}`),
 * which this client never consumes — cart responses arrive as full `Cart`.
 */
export type CartSummary = Pick<Cart, 'items' | 'total_items' | 'total_amount'>

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export interface OrderItem {
  product_id: number
  quantity: number
  unit_price: string
  id: number
  order_id: number
  product_name: string
  product_sku: string
  total_price: string
  created_at: string
}

export interface Order {
  id: number
  order_number: string
  user_id: number
  status: OrderStatus
  payment_status: PaymentStatus
  subtotal: string
  tax_amount: string
  shipping_cost: string
  discount_amount: string
  total_amount: string
  total_items: number
  shipping_address: string
  shipping_city: string
  shipping_country: string
  shipping_postal_code: string
  shipping_phone?: string | null
  billing_address?: string | null
  billing_city?: string | null
  billing_country?: string | null
  billing_postal_code?: string | null
  notes?: string | null
  payment_method?: string | null
  tracking_number?: string | null
  created_at: string
  updated_at?: string | null
  items: OrderItem[]
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: User
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.is_superuser === true
}
