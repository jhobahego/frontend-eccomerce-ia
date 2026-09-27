import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

import { installApiStub, STUB_ADMIN_LOGIN, STUB_LOGIN } from './stub'

// Accessibility gates (T014, constitution §14): axe with the full rule set —
// including color-contrast — in a real browser over the critical flows. The
// jsdom sample (T001) stays as the fast negative control; this suite is the
// WCAG 2.2 AA backstop the earlier tasks deferred to.

async function loginAs(page, username: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(username)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function expectNoViolations(page, path: string): Promise<void> {
  await page.goto(path)
  // Audit the painted page, not the loading skeleton: every audited view
  // renders its h1 together with the served data (the stub answers instantly,
  // so this is a paint signal, not a sleep).
  await expect(page.locator('h1').first()).toBeVisible()
  // Vue DevTools nodes are dev-server chrome injected by
  // vite-plugin-vue-devtools (absent from preview/prod builds); they are not
  // shipped content, so the audit excludes those nodes — every project rule,
  // including `region`, stays enabled for our own markup.
  const results = await new AxeBuilder({ page })
    .exclude('[class*="vue-devtools"]')
    .analyze()
  expect(results.violations, `${path}: ${JSON.stringify(results.violations, null, 2)}`).toEqual(
    [],
  )
}

test('storefront is axe-clean: home, catalog, product and cart', async ({ page }) => {
  await installApiStub(page)
  for (const path of ['/', '/catalogo', '/producto/tetera', '/cesta']) {
    await expectNoViolations(page, path)
  }
})

test('auth and account are axe-clean: login, checkout, history and profile', async ({
  page,
}) => {
  await installApiStub(page)
  await expectNoViolations(page, '/login')
  await loginAs(page, STUB_LOGIN.username, STUB_LOGIN.password)
  for (const path of ['/checkout', '/pedidos', '/pedidos/9', '/cuenta']) {
    await expectNoViolations(page, path)
  }
})

test('admin is axe-clean: dashboard, catalog, orders and users', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAs(page, STUB_ADMIN_LOGIN.username, STUB_ADMIN_LOGIN.password)
  for (const path of [
    '/admin',
    '/admin/categorias',
    '/admin/productos',
    '/admin/pedidos',
    '/admin/usuarios',
    '/admin/usuarios/5',
  ]) {
    await expectNoViolations(page, path)
  }
})
