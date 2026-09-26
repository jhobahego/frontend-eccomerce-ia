import { createRouter, createWebHistory } from 'vue-router'

import { installSessionGuards } from './guards'
import { authRoutes } from './routes/auth'
import { baseRoutes } from './routes/base'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Domain route tables aggregate here; each task owns its own file and only
  // appends one line here. The catch-all lives last inside baseRoutes.
  routes: [...authRoutes, ...baseRoutes],
})

installSessionGuards(router)

export default router
