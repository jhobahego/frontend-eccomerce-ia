import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  CATALOG_PAGE_SIZE,
  fetchCategories,
  fetchCategory,
  fetchCategoryTree,
  fetchFeaturedProducts,
  fetchProductBySlug,
  fetchProductsByCategory,
  fetchSimilarProducts,
  fetchSubcategories,
  searchProducts,
  type ProductDetail,
  type ProductSearchFilters,
} from '../api/catalog'
import { normalizeError } from '../api/errors'
import type { ApiError, Category, CategoryHierarchy, Page, Product } from '../api/types'

/**
 * Catalog reading store (T006) — one store per domain. Reads only: featured,
 * tree, search pages, category pages, product detail. Totals, stock and
 * prices stay server-issued display strings; nothing is computed here.
 */
export const useCatalogStore = defineStore('catalog', () => {
  const featured = ref<Product[]>([])
  const tree = ref<CategoryHierarchy[]>([])
  const filterCategories = ref<Category[]>([])
  const page = ref<Page<Product>>({ items: [], skip: 0, limit: CATALOG_PAGE_SIZE })
  const hasMore = ref(false)
  const lastFilters = ref<ProductSearchFilters>({})
  const product = ref<ProductDetail | null>(null)
  const similar = ref<Product[]>([])
  const category = ref<Category | null>(null)
  const subcategories = ref<Category[]>([])
  const categoryProducts = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  function fail(unknown: unknown): void {
    error.value = normalizeError(unknown)
  }

  async function loadHome(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [servedFeatured, servedTree] = await Promise.all([
        fetchFeaturedProducts(),
        fetchCategoryTree(),
      ])
      featured.value = servedFeatured
      tree.value = servedTree
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function ensureFilterCategories(): Promise<void> {
    if (filterCategories.value.length > 0) {
      return
    }
    filterCategories.value = await fetchCategories()
  }

  async function search(filters: ProductSearchFilters): Promise<void> {
    lastFilters.value = filters
    const limit = filters.limit ?? CATALOG_PAGE_SIZE
    const skip = filters.skip ?? 0
    loading.value = true
    error.value = null
    try {
      const items = await searchProducts({ ...filters, limit, skip })
      page.value = { items, skip, limit }
      // The API serves bare arrays with no total: a full page hints at more.
      hasMore.value = items.length >= limit
    } catch (unknown) {
      page.value = { items: [], skip, limit }
      hasMore.value = false
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function turnPage(direction: 1 | -1): Promise<void> {
    const limit = lastFilters.value.limit ?? CATALOG_PAGE_SIZE
    const skip = Math.max(0, (lastFilters.value.skip ?? 0) + direction * limit)
    await search({ ...lastFilters.value, skip, limit })
  }

  async function loadProduct(slug: string): Promise<void> {
    loading.value = true
    error.value = null
    product.value = null
    similar.value = []
    try {
      const detail = await fetchProductBySlug(slug)
      product.value = detail
      similar.value = await fetchSimilarProducts(detail.id)
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  async function loadCategory(id: number): Promise<void> {
    loading.value = true
    error.value = null
    category.value = null
    subcategories.value = []
    categoryProducts.value = []
    try {
      const [servedCategory, servedChildren, servedProducts] = await Promise.all([
        fetchCategory(id),
        fetchSubcategories(id),
        fetchProductsByCategory(id),
      ])
      category.value = servedCategory
      subcategories.value = servedChildren
      categoryProducts.value = servedProducts
    } catch (unknown) {
      fail(unknown)
    } finally {
      loading.value = false
    }
  }

  return {
    featured,
    tree,
    filterCategories,
    page,
    hasMore,
    product,
    similar,
    category,
    subcategories,
    categoryProducts,
    loading,
    error,
    loadHome,
    ensureFilterCategories,
    search,
    turnPage,
    loadProduct,
    loadCategory,
  }
})
