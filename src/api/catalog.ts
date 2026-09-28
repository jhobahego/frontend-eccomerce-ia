import { apiRequest } from './client'
import type { Category, CategoryHierarchy, Product } from './types'

/**
 * Catalog reading layer (T006). Every HTTP call lives here — views and the
 * store call these functions, never `fetch`/`apiRequest` directly
 * (constitution principle 7). Amounts stay display-only strings end to end.
 */

export const CATALOG_PAGE_SIZE = 12

export type ProductSort = 'novelty' | 'price-asc' | 'price-desc'

export interface ProductSearchFilters {
  query?: string
  categoryId?: number
  minPrice?: string
  maxPrice?: string
  isFeatured?: boolean
  inStock?: boolean
  sort?: ProductSort
  skip?: number
  limit?: number
}

/** Product detail as served (`{...product, category}`), pinned by the stub. */
export interface ProductDetail extends Product {
  category: Category | null
}

const PRICE_INPUT = /^\d+(\.\d{1,2})?$/

/** Field-level check for price inputs (branch review): blank means "no filter". */
export function isValidPriceInput(raw: string): boolean {
  const trimmed = raw.trim()
  return trimmed === '' || PRICE_INPUT.test(trimmed)
}

/**
 * Normalizes a user-typed price to the `NN.NN` shape the API prices in.
 * This is input encoding, not amount math: malformed input is dropped
 * (undefined) so it never reaches the server as a 500.
 */
export function normalizePriceInput(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (trimmed === '' || !PRICE_INPUT.test(trimmed)) {
    return undefined
  }
  const parts = trimmed.split('.')
  const euros = parts[0] ?? ''
  const cents = parts[1] ?? ''
  return `${euros}.${(cents + '00').slice(0, 2)}`
}

/** Exact query contract for `GET /products/search` (+ base list paging). */
export function buildProductSearchParams(filters: ProductSearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  const query = filters.query?.trim()
  if (query !== undefined && query !== '') {
    params.set('query', query)
  }
  if (filters.categoryId !== undefined) {
    params.set('category_id', String(filters.categoryId))
  }
  if (filters.minPrice !== undefined) {
    const min = normalizePriceInput(filters.minPrice)
    if (min !== undefined) {
      params.set('min_price', min)
    }
  }
  if (filters.maxPrice !== undefined) {
    const max = normalizePriceInput(filters.maxPrice)
    if (max !== undefined) {
      params.set('max_price', max)
    }
  }
  if (filters.isFeatured === true) {
    params.set('is_featured', 'true')
  }
  if (filters.inStock === true) {
    params.set('in_stock', 'true')
  }
  if (filters.sort === 'price-asc') {
    params.set('sort_by', 'price')
    params.set('sort_order', 'asc')
  } else if (filters.sort === 'price-desc') {
    params.set('sort_by', 'price')
    params.set('sort_order', 'desc')
  }
  if (filters.skip !== undefined) {
    params.set('skip', String(filters.skip))
  }
  if (filters.limit !== undefined) {
    params.set('limit', String(filters.limit))
  }
  return params
}

function firstString(value: string | string[] | null | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : undefined
  }
  return undefined
}

/** Shareable URL form of the filters (raw user values, short keys). */
export function filtersToRouteQuery(filters: ProductSearchFilters): Record<string, string> {
  const out: Record<string, string> = {}
  const query = filters.query?.trim()
  if (query !== undefined && query !== '') {
    out['query'] = query
  }
  if (filters.categoryId !== undefined) {
    out['category'] = String(filters.categoryId)
  }
  if (filters.minPrice !== undefined && filters.minPrice.trim() !== '') {
    out['min'] = filters.minPrice.trim()
  }
  if (filters.maxPrice !== undefined && filters.maxPrice.trim() !== '') {
    out['max'] = filters.maxPrice.trim()
  }
  if (filters.isFeatured === true) {
    out['featured'] = '1'
  }
  if (filters.inStock === true) {
    out['stock'] = '1'
  }
  if (filters.sort !== undefined && filters.sort !== 'novelty') {
    out['sort'] = filters.sort
  }
  if (filters.skip !== undefined && filters.skip > 0) {
    out['skip'] = String(filters.skip)
  }
  return out
}

const SORTS: readonly ProductSort[] = ['novelty', 'price-asc', 'price-desc']

/** Parses the URL back into filters; unknown values fall back to defaults. */
export function filtersFromRouteQuery(
  query: Record<string, string | string[] | null | undefined>,
): ProductSearchFilters {
  const filters: ProductSearchFilters = {}
  const text = firstString(query['query'])?.trim()
  if (text !== undefined && text !== '') {
    filters.query = text
  }
  const category = firstString(query['category'])
  if (category !== undefined && category !== '') {
    const id = Number(category)
    if (Number.isInteger(id)) {
      filters.categoryId = id
    }
  }
  const min = firstString(query['min'])?.trim()
  if (min !== undefined && min !== '') {
    filters.minPrice = min
  }
  const max = firstString(query['max'])?.trim()
  if (max !== undefined && max !== '') {
    filters.maxPrice = max
  }
  if (firstString(query['featured']) === '1') {
    filters.isFeatured = true
  }
  if (firstString(query['stock']) === '1') {
    filters.inStock = true
  }
  const sort = firstString(query['sort'])
  if (sort !== undefined && (SORTS as readonly string[]).includes(sort)) {
    filters.sort = sort as ProductSort
  }
  const skip = firstString(query['skip'])
  if (skip !== undefined && skip !== '') {
    const parsed = Number(skip)
    if (Number.isInteger(parsed) && parsed > 0) {
      filters.skip = parsed
    }
  }
  return filters
}

export function fetchFeaturedProducts(limit = 10): Promise<Product[]> {
  return apiRequest<Product[]>(`/api/v1/products/featured?limit=${limit}`)
}

export function fetchCategoryTree(): Promise<CategoryHierarchy[]> {
  return apiRequest<CategoryHierarchy[]>('/api/v1/categories/hierarchy')
}

export function fetchCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/api/v1/categories/')
}

export function searchProducts(filters: ProductSearchFilters): Promise<Product[]> {
  const serialized = buildProductSearchParams(filters).toString()
  const suffix = serialized === '' ? '' : `?${serialized}`
  return apiRequest<Product[]>(`/api/v1/products/search${suffix}`)
}

export function fetchCategory(id: number): Promise<Category> {
  return apiRequest<Category>(`/api/v1/categories/${id}`)
}

export function fetchSubcategories(id: number): Promise<Category[]> {
  return apiRequest<Category[]>(`/api/v1/categories/${id}/subcategories`)
}

export function fetchProductsByCategory(
  id: number,
  paging?: { skip?: number; limit?: number },
): Promise<Product[]> {
  const params = new URLSearchParams()
  if (paging?.skip !== undefined) {
    params.set('skip', String(paging.skip))
  }
  if (paging?.limit !== undefined) {
    params.set('limit', String(paging.limit))
  }
  const serialized = params.toString()
  const suffix = serialized === '' ? '' : `?${serialized}`
  return apiRequest<Product[]>(`/api/v1/products/category/${id}${suffix}`)
}

export function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/api/v1/products/slug/${encodeURIComponent(slug)}`)
}

export function fetchSimilarProducts(id: number): Promise<Product[]> {
  return apiRequest<Product[]>(`/api/v1/products/${id}/similar`)
}
