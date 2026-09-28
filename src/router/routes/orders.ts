import type { RouteRecordRaw } from 'vue-router'

import CheckoutView from '../../views/CheckoutView.vue'
import OrderDetailView from '../../views/OrderDetailView.vue'
import OrdersView from '../../views/OrdersView.vue'

// Route table owned by T008 (checkout), extended by T009 (history/detail).
// T012 adds the admin order routes here without touching other tables.
export const orderRoutes: RouteRecordRaw[] = [
  { path: '/checkout', name: 'checkout', component: CheckoutView, meta: { requiresAuth: true } },
  { path: '/pedidos', name: 'orders', component: OrdersView, meta: { requiresAuth: true } },
  {
    path: '/pedidos/:id',
    name: 'order-detail',
    component: OrderDetailView,
    meta: { requiresAuth: true },
  },
]
