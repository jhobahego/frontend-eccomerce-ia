import type { RouteRecordRaw } from 'vue-router'

import AdminView from '../../views/AdminView.vue'
import HomeView from '../../views/HomeView.vue'
import NotFoundView from '../../views/NotFoundView.vue'

// Route table owned by T005. `/admin` is the guarded shell placeholder: the
// guard proving ground for spec #11. T010/T012 add their own `routes/admin.ts`
// sub-paths (catalog, orders, users) without touching this file.
export const baseRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView, meta: { public: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAdmin: true } },
  { path: '/not-found', name: 'not-found', component: NotFoundView, meta: { public: true } },
  // Unknown paths normalize to /not-found (same URL the guard uses for
  // silent denials), so denied and nonexistent are indistinguishable.
  {
    path: '/:pathMatch(.*)*',
    name: 'catch-all',
    redirect: '/not-found',
    meta: { public: true },
  },
]
