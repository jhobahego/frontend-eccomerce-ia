import type { RouteRecordRaw } from 'vue-router'

import CatalogView from '../../views/CatalogView.vue'
import CategoryView from '../../views/CategoryView.vue'
import ProductView from '../../views/ProductView.vue'

// Route table owned by T006. Home (`/`) stays in base.ts — T006 only fills
// its component with the storefront home (featured + tree).
export const catalogRoutes: RouteRecordRaw[] = [
  { path: '/catalogo', name: 'catalog', component: CatalogView, meta: { public: true } },
  { path: '/categoria/:id', name: 'category', component: CategoryView, meta: { public: true } },
  { path: '/producto/:slug', name: 'product', component: ProductView, meta: { public: true } },
]
