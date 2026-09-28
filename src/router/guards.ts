import type { Router } from 'vue-router'

import { useSessionStore } from '../stores/session'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

export interface GuardSessionSnapshot {
  isAuthenticated: boolean
  isAdmin: boolean
}

export interface GuardRouteMeta {
  public?: boolean
  requiresAuth?: boolean
  requiresAdmin?: boolean
}

export type GuardDecision = 'allow' | 'to-login' | 'to-not-found'

/**
 * Pure role decision (T005). Kept free of router and store so the unit suite
 * pins the policy itself: admin zones deny silently (to-not-found, never a
 * distinct forbidden), while anonymous visitors on any protected route go to
 * login so they can resume where they were — including as admin.
 *
 * The storefront default is open: routes without `requiresAuth`/`requiresAdmin`
 * allow everyone. `public` is a readability marker owned by each route table
 * (T003 convention); the decision only reads the `requires*` flags.
 */
export function decideAccess(
  session: GuardSessionSnapshot,
  meta?: GuardRouteMeta | null,
): GuardDecision {
  if (meta?.requiresAdmin === true) {
    if (!session.isAuthenticated) {
      return 'to-login'
    }
    if (!session.isAdmin) {
      return 'to-not-found'
    }
    return 'allow'
  }
  if (meta?.requiresAuth === true) {
    if (!session.isAuthenticated) {
      return 'to-login'
    }
    return 'allow'
  }
  return 'allow'
}

/**
 * Wires the pure decision into the router. Anonymous redirects remember the
 * full path in `session.returnTo` so LoginView can resume after login (T003
 * contract); silent denials never remember — resuming into a zone the user
 * may not see would leak its existence.
 */
export function installSessionGuards(router: Router): void {
  router.beforeEach((to) => {
    const session = useSessionStore()
    const decision = decideAccess(
      { isAuthenticated: session.isAuthenticated, isAdmin: session.isAdmin },
      {
        public: to.meta.public,
        requiresAuth: to.meta.requiresAuth,
        requiresAdmin: to.meta.requiresAdmin,
      },
    )
    if (decision === 'to-login') {
      session.setReturnTo(to.fullPath)
      return { name: 'login' }
    }
    if (decision === 'to-not-found') {
      return { name: 'not-found' }
    }
    return true
  })
}
