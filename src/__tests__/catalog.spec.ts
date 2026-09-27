import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  buildProductSearchParams,
  filtersFromRouteQuery,
  filtersToRouteQuery,
  normalizePriceInput,
  type ProductSearchFilters,
} from '../api/catalog'
import { useCatalogStore } from '../stores/catalog'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const PRODUCT = {
  id: 1,
  name: 'Tetera',
  slug: 'tetera',
  sku: 'TET-001',
  price: '19.99',
  sale_price: null,
  description: 'Tetera de acero',
  short_description: null,
  stock_quantity: 4,
  min_stock_level: 5,
  is_active: true,
  is_featured: true,
  images: null,
  category_id: 2,
  created_at: '2026-09-26T00:00:00Z',
  updated_at: null,
  current_price: '19.99',
  is_in_stock: true,
  is_low_stock: true,
}

const TREE = [
  {
    id: 2,
    name: 'Cocina',
    slug: 'cocina',
    description: 'Todo para la cocina',
    is_active: true,
    parent_id: null,
    image_url: null,
    sort_order: 0,
    created_at: '2026-09-26T00:00:00Z',
    updated_at: null,
    children: [],
    depth: 0,
  },
]

function stubFetch(handler: (url: string) => Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn<(url: string) => Promise<Response>>(async (url) => handler(url)),
  )
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('catalog query contracts (T006)', () => {
  it('builds exact search params for text, category and prices', () => {
    const params = buildProductSearchParams({
      query: 'tetera',
      categoryId: 2,
      minPrice: '10',
      maxPrice: '19.99',
    })
    expect(params.get('query')).toBe('tetera')
    expect(params.get('category_id')).toBe('2')
    expect(params.get('min_price')).toBe('10.00')
    expect(params.get('max_price')).toBe('19.99')
  })

  it('sends flags only when checked and omits everything else', () => {
    const params = buildProductSearchParams({ isFeatured: true, inStock: true })
    expect(params.get('is_featured')).toBe('true')
    expect(params.get('in_stock')).toBe('true')
    const empty = buildProductSearchParams({})
    expect(empty.get('is_featured')).toBeNull()
    expect(empty.get('in_stock')).toBeNull()
    expect(empty.get('query')).toBeNull()
  })

  it('maps sort options to server params, novelty sends no sort', () => {
    expect(buildProductSearchParams({ sort: 'price-asc' }).get('sort_by')).toBe('price')
    expect(buildProductSearchParams({ sort: 'price-asc' }).get('sort_order')).toBe('asc')
    expect(buildProductSearchParams({ sort: 'price-desc' }).get('sort_order')).toBe('desc')
    const novelty = buildProductSearchParams({ sort: 'novelty' })
    expect(novelty.get('sort_by')).toBeNull()
  })

  it('carries pagination window', () => {
    const params = buildProductSearchParams({ skip: 12, limit: 12 })
    expect(params.get('skip')).toBe('12')
    expect(params.get('limit')).toBe('12')
  })

  it('drops malformed price inputs instead of sending them', () => {
    const params = buildProductSearchParams({ minPrice: 'barato', maxPrice: '' })
    expect(params.get('min_price')).toBeNull()
    expect(params.get('max_price')).toBeNull()
  })

  it('normalizes price inputs to two decimals', () => {
    expect(normalizePriceInput('10')).toBe('10.00')
    expect(normalizePriceInput(' 19.9 ')).toBe('19.90')
    expect(normalizePriceInput('')).toBeUndefined()
    expect(normalizePriceInput('barato')).toBeUndefined()
  })

  it('round-trips filters through the route query', () => {
    const filters: ProductSearchFilters = {
      query: 'taza',
      categoryId: 3,
      sort: 'price-desc',
      isFeatured: true,
    }
    const back = filtersFromRouteQuery(filtersToRouteQuery(filters))
    expect(back).toEqual(filters)
  })
})

describe('catalog store (T006)', () => {
  it('loads home with featured and tree in parallel', async () => {
    stubFetch((url) => {
      if (url.includes('/products/featured')) {
        return jsonResponse([PRODUCT])
      }
      return jsonResponse(TREE)
    })
    const catalog = useCatalogStore()
    await catalog.loadHome()
    expect(catalog.featured.map((product) => product.slug)).toEqual(['tetera'])
    expect(catalog.tree.map((node) => node.name)).toEqual(['Cocina'])
    expect(catalog.loading).toBe(false)
    expect(catalog.error).toBeNull()
  })

  it('searches with exact params and flags a short page as complete', async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      return jsonResponse([PRODUCT])
    })
    const catalog = useCatalogStore()
    await catalog.search({ query: 'tetera', limit: 12 })
    expect(catalog.page.items).toHaveLength(1)
    expect(catalog.hasMore).toBe(false)
    const called = seen[0] ?? ''
    expect(called).toContain('query=tetera')
    expect(called).toContain('limit=12')
  })

  it('flags a full page as having more', async () => {
    stubFetch(() => jsonResponse([PRODUCT, { ...PRODUCT, id: 6 }]))
    const catalog = useCatalogStore()
    await catalog.search({ limit: 2 })
    expect(catalog.hasMore).toBe(true)
  })

  it('normalizes search failures without leaking', async () => {
    stubFetch(() => jsonResponse({ detail: 'boom' }, 500))
    const catalog = useCatalogStore()
    await catalog.search({})
    expect(catalog.error?.code).toBe('REQUEST')
    expect(catalog.page.items).toEqual([])
  })

  it('loads product detail with similar', async () => {
    stubFetch((url) => {
      if (url.includes('/similar')) {
        return jsonResponse([{ ...PRODUCT, id: 6, name: 'Taza', slug: 'taza' }])
      }
      return jsonResponse({ ...PRODUCT, category: { id: 2, name: 'Cocina' } })
    })
    const catalog = useCatalogStore()
    await catalog.loadProduct('tetera')
    expect(catalog.product?.slug).toBe('tetera')
    expect(catalog.product?.category?.name).toBe('Cocina')
    expect(catalog.similar.map((product) => product.slug)).toEqual(['taza'])
  })

  it('turns pages by moving the skip window', async () => {
    const seen: string[] = []
    stubFetch((url) => {
      seen.push(url)
      return jsonResponse([PRODUCT, { ...PRODUCT, id: 6 }])
    })
    const catalog = useCatalogStore()
    await catalog.search({ limit: 2 })
    await catalog.turnPage(1)
    const last = seen[seen.length - 1] ?? ''
    expect(last).toContain('skip=2')
    await catalog.turnPage(-1)
    const back = seen[seen.length - 1] ?? ''
    expect(back).toContain('skip=0')
  })

  it('loads filter categories once', async () => {
    let calls = 0
    stubFetch(() => {
      calls += 1
      return jsonResponse([{ id: 2, name: 'Cocina' }])
    })
    const catalog = useCatalogStore()
    await catalog.ensureFilterCategories()
    await catalog.ensureFilterCategories()
    expect(calls).toBe(1)
    expect(catalog.filterCategories.map((node) => node.name)).toEqual(['Cocina'])
  })

  it('loads a category with subcategories and products', async () => {
    stubFetch((url) => {
      if (url.includes('/subcategories')) {
        return jsonResponse([{ id: 4, name: 'Teteras' }])
      }
      if (url.includes('/products/category/')) {
        return jsonResponse([PRODUCT])
      }
      if (url.includes('/categories/2')) {
        return jsonResponse({ id: 2, name: 'Cocina' })
      }
      return jsonResponse([], 404)
    })
    const catalog = useCatalogStore()
    await catalog.loadCategory(2)
    expect(catalog.category?.name).toBe('Cocina')
    expect(catalog.subcategories.map((node) => node.name)).toEqual(['Teteras'])
    expect(catalog.categoryProducts).toHaveLength(1)
  })
})
