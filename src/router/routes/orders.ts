import type { RouteRecordRaw } from 'vue-router'

import CheckoutView from '../../views/CheckoutView.vue'

// Route table owned by T008 (checkout). T009 adds account/history and T012
// the admin order routes here without touching other tables.
export const orderRoutes: RouteRecordRaw[] = [
  { path: '/checkout', name: 'checkout', component: CheckoutView, meta: { requiresAuth: true } },
]
