import type { RouteRecordRaw } from 'vue-router'

import AdminCategoriesView from '../../views/AdminCategoriesView.vue'
import AdminOrdersView from '../../views/AdminOrdersView.vue'
import AdminProductsView from '../../views/AdminProductsView.vue'
import AdminUserDetailView from '../../views/AdminUserDetailView.vue'
import AdminUsersView from '../../views/AdminUsersView.vue'

// Route table owned by T010 (admin catalog) + T012 (admin orders/users);
// `/admin` itself stays in base.ts as the dashboard shell.
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
  {
    path: '/admin/pedidos',
    name: 'admin-orders',
    component: AdminOrdersView,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/usuarios',
    name: 'admin-users',
    component: AdminUsersView,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/usuarios/:id',
    name: 'admin-user-detail',
    component: AdminUserDetailView,
    meta: { requiresAdmin: true },
  },
]
