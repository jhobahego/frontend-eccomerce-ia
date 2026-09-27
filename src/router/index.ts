import { createRouter, createWebHistory } from 'vue-router'

import { installSessionGuards } from './guards'
import { authRoutes } from './routes/auth'
import { baseRoutes } from './routes/base'
import { catalogRoutes } from './routes/catalog'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Domain route tables aggregate here; each task owns its own file and only
  // appends one line here. Matching is score-ranked, so the catch-all inside
  // baseRoutes never shadows the catalog paths below.
  routes: [...authRoutes, ...catalogRoutes, ...baseRoutes],
})

installSessionGuards(router)

export default router
