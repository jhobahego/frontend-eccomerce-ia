import { createRouter, createWebHistory } from 'vue-router'

import { installSessionGuards } from './guards'
import { accountRoutes } from './routes/account'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { baseRoutes } from './routes/base'
import { cartRoutes } from './routes/cart'
import { catalogRoutes } from './routes/catalog'
import { orderRoutes } from './routes/orders'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Domain route tables aggregate here; each task owns its own file and only
  // appends one line here. Matching is score-ranked, so the catch-all inside
  // baseRoutes never shadows the domain paths below.
  routes: [
    ...authRoutes,
    ...catalogRoutes,
    ...cartRoutes,
    ...orderRoutes,
    ...accountRoutes,
    ...adminRoutes,
    ...baseRoutes,
  ],
})

installSessionGuards(router)

export default router
