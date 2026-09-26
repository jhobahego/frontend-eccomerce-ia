import { createRouter, createWebHistory } from 'vue-router'

import { authRoutes } from './routes/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Domain route tables aggregate here; guards arrive with T005.
  routes: [...authRoutes],
})

export default router
