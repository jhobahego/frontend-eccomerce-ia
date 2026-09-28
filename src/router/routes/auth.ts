import type { RouteRecordRaw } from 'vue-router'

import LoginView from '../../views/LoginView.vue'
import RegisterView from '../../views/RegisterView.vue'

// Route table owned by T003. `meta.public` is consumed by the T005 role guards:
// public routes never trigger a login redirect.
export const authRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { public: true } },
]
