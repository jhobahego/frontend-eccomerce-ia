import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

import { installApiStub, STUB_ADMIN_LOGIN, STUB_LOGIN } from './stub'

// Accessibility gates (T014, constitution §14): axe with the full rule set —
// including color-contrast — in a real browser over the critical flows. The
// jsdom sample (T001) stays as the fast negative control; this suite is the
// WCAG 2.2 AA backstop the earlier tasks deferred to.
//
// One small test per page group: a full axe analyze costs seconds per page,
// and grouping six pages in one test flirts with the 30 s test timeout under
// parallel load. Small tests fail granularly and stay fast.

async function loginAs(page, username: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(username)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function scanViolations(page, path: string): Promise<unknown[]> {
  await page.goto(path)
  // Audit the painted page, not the loading skeleton: every audited view
  // renders its h1 together with the served data (the stub answers instantly,
  // so this is a paint signal, not a sleep).
  await expect(page.locator('h1').first()).toBeVisible()
  // Vue DevTools nodes are dev-server chrome injected by
  // vite-plugin-vue-devtools (absent from preview/prod builds); they are not
  // shipped content, so the audit excludes those nodes — every project rule,
  // including `region`, stays enabled for our own markup.
  const results = await new AxeBuilder({ page }).exclude('[class*="vue-devtools"]').analyze()
  return results.violations
}

test('storefront home and catalog are axe-clean', async ({ page }) => {
  await installApiStub(page)
  expect(await scanViolations(page, '/'), '/').toEqual([])
  expect(await scanViolations(page, '/catalogo'), '/catalogo').toEqual([])
})

test('storefront product and cart are axe-clean', async ({ page }) => {
  await installApiStub(page)
  expect(await scanViolations(page, '/producto/tetera'), '/producto/tetera').toEqual([])
  expect(await scanViolations(page, '/cesta'), '/cesta').toEqual([])
})

test('login is axe-clean', async ({ page }) => {
  await installApiStub(page)
  expect(await scanViolations(page, '/login'), '/login').toEqual([])
})

test('checkout, history and profile are axe-clean', async ({ page }) => {
  await installApiStub(page)
  await loginAs(page, STUB_LOGIN.username, STUB_LOGIN.password)
  expect(await scanViolations(page, '/checkout'), '/checkout').toEqual([])
  expect(await scanViolations(page, '/pedidos'), '/pedidos').toEqual([])
  expect(await scanViolations(page, '/pedidos/9'), '/pedidos/9').toEqual([])
  expect(await scanViolations(page, '/cuenta'), '/cuenta').toEqual([])
})

test('admin dashboard and catalog are axe-clean', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAs(page, STUB_ADMIN_LOGIN.username, STUB_ADMIN_LOGIN.password)
  expect(await scanViolations(page, '/admin'), '/admin').toEqual([])
  expect(await scanViolations(page, '/admin/categorias'), '/admin/categorias').toEqual([])
  expect(await scanViolations(page, '/admin/productos'), '/admin/productos').toEqual([])
})

test('admin orders and users are axe-clean', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAs(page, STUB_ADMIN_LOGIN.username, STUB_ADMIN_LOGIN.password)
  expect(await scanViolations(page, '/admin/pedidos'), '/admin/pedidos').toEqual([])
  expect(await scanViolations(page, '/admin/usuarios'), '/admin/usuarios').toEqual([])
  expect(await scanViolations(page, '/admin/usuarios/5'), '/admin/usuarios/5').toEqual([])
})
