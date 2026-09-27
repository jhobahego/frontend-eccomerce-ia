import type { RouteRecordRaw } from 'vue-router'

import AdminCategoriesView from '../../views/AdminCategoriesView.vue'
import AdminProductsView from '../../views/AdminProductsView.vue'

// Route table owned by T010 (admin catalog). T012 adds order/user admin
// routes here; `/admin` itself stays in base.ts as the dashboard shell.
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/categorias',
    name: 'admin-categories',
    component: AdminCategoriesView,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/productos',
    name: 'admin-products',
    component: AdminProductsView,
    meta: { requiresAdmin: true },
  },
]
