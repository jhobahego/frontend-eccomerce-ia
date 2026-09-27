import { apiRequest } from './client'
import type { Category, Product } from './types'

/**
 * Admin catalog writes (T010). Reads reuse the public catalog layer
 * (`fetchCategories`, `searchProducts`); only mutations live here, always
 * with the admin bearer the client injects from the session.
 */
export interface CategoryCreateInput {
  name: string
  slug: string
  description?: string | null
  parent_id?: number | null
  image_url?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface CategoryUpdateInput {
  name?: string
  description?: string | null
  parent_id?: number | null
  image_url?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface ProductCreateInput {
  name: string
  slug: string
  sku: string
  price: string
  category_id: number
  description?: string | null
  short_description?: string | null
  sale_price?: string | null
  stock_quantity?: number
  min_stock_level?: number
  images?: string[] | null
  is_active?: boolean
  is_featured?: boolean
}

export interface ProductUpdateInput {
  name?: string
  description?: string | null
  short_description?: string | null
  price?: string
  sale_price?: string | null
  stock_quantity?: number
  min_stock_level?: number
  category_id?: number
  images?: string[] | null
  is_active?: boolean
  is_featured?: boolean
}

export function createCategory(input: CategoryCreateInput): Promise<Category> {
  return apiRequest<Category>('/api/v1/categories/', { method: 'POST', body: input })
}

export function updateCategory(id: number, input: CategoryUpdateInput): Promise<Category> {
  return apiRequest<Category>(`/api/v1/categories/${id}`, { method: 'PUT', body: input })
}

export function deleteCategory(id: number): Promise<Category> {
  return apiRequest<Category>(`/api/v1/categories/${id}`, { method: 'DELETE' })
}

export function createProduct(input: ProductCreateInput): Promise<Product> {
  return apiRequest<Product>('/api/v1/products/', { method: 'POST', body: input })
}

export function updateProduct(id: number, input: ProductUpdateInput): Promise<Product> {
  return apiRequest<Product>(`/api/v1/products/${id}`, { method: 'PUT', body: input })
}

export function deleteProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/v1/products/${id}`, { method: 'DELETE' })
}

export function toggleProductFeatured(id: number, featured: boolean): Promise<Product> {
  return apiRequest<Product>(`/api/v1/products/${id}`, {
    method: 'PUT',
    body: { is_featured: featured },
  })
}

/** Absolute stock set (the only operation pinned for v1). */
export function setProductStock(id: number, quantity: number): Promise<Product> {
  return apiRequest<Product>(`/api/v1/products/${id}/stock`, {
    method: 'PUT',
    body: { quantity, operation: 'set' },
  })
}

export function fetchLowStock(): Promise<Product[]> {
  return apiRequest<Product[]>('/api/v1/products/low-stock')
}
