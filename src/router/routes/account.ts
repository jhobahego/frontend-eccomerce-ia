import type { RouteRecordRaw } from 'vue-router'

import AccountView from '../../views/AccountView.vue'

// Route table owned by T009 (account). Order history lives in routes/orders.
export const accountRoutes: RouteRecordRaw[] = [
  { path: '/cuenta', name: 'account', component: AccountView, meta: { requiresAuth: true } },
]
