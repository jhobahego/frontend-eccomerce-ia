import type { RouteRecordRaw } from 'vue-router'

import CartView from '../../views/CartView.vue'

// Route table owned by T007. Guests need the cart too, so it stays public.
export const cartRoutes: RouteRecordRaw[] = [
  { path: '/cesta', name: 'cart', component: CartView, meta: { public: true } },
]
