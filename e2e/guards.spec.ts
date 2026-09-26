import { test, expect } from '@playwright/test'

import { installApiStub, STUB_ADMIN_LOGIN, STUB_LOGIN } from './stub'

// Guards by role (T005): silent denial for non-admin plus resume after login.
// The transport stub answers every contract, so no live backend is needed.
// Comments below avoid inline patterns on purpose: the spec loader chokes on
// them, as documented with the stub self-test.

async function loginAs(page, username: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(username)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
}

test('non-admin visitors are denied the admin zone silently (spec 11)', async ({ page }) => {
  await installApiStub(page)
  await loginAs(page, STUB_LOGIN.username, STUB_LOGIN.password)
  await expect(page).toHaveURL(/\/$/)

  await expect(page.getByRole('link', { name: /administraci/i })).toHaveCount(0)

  await page.goto('/admin')
  await expect(page).toHaveURL(/not-found/)
  await expect(page.getByRole('heading', { name: /no existe|no encontrad/i })).toBeVisible()
  await expect(page.getByText(/administraci.n/i).first()).toHaveCount(0)

  // Unknown paths normalize to the same page, so a denied zone and a
  // missing page are indistinguishable from outside.
  await page.goto('/zona-que-no-existe-xyz')
  await expect(page).toHaveURL(/not-found/)
  await expect(page.getByRole('heading', { name: /no existe|no encontrad/i })).toBeVisible()
})

test('admin visitors reach the admin zone and see its entry', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAs(page, STUB_ADMIN_LOGIN.username, STUB_ADMIN_LOGIN.password)
  await expect(page).toHaveURL(/\/$/)

  await expect(page.getByRole('link', { name: /administraci/i })).toBeVisible()

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.getByRole('heading', { name: /administraci/i })).toBeVisible()
})

test('expired visitors resume where they were after login', async ({ page }) => {
  await installApiStub(page, { auth: 'expired' })
  await page.addInitScript(() => {
    window.localStorage.setItem('eia.refresh_token.v1', 'expired-token')
  })
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)

  await page.context().unrouteAll({ behavior: 'wait' })
  await installApiStub(page, { user: 'admin' })

  await page.getByLabel(/correo o usuario/i).fill(STUB_ADMIN_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_ADMIN_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.getByRole('heading', { name: /administraci/i })).toBeVisible()
})
