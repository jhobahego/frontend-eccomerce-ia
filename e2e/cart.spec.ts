import { test, expect } from '@playwright/test'

import { installApiStub, STUB_LOGIN } from './stub'

// Guest cart with persistence and merge (T007, spec 4 and 15). Every answer
// comes from the deterministic transport stub; no live backend is needed.

test('guest cart survives a return visit in the same browser (spec 15)', async ({
  page,
}) => {
  await installApiStub(page)
  await page.goto('/producto/tetera')
  await page.getByRole('button', { name: /a.adir a la cesta/i }).click()
  await page.goto('/cesta')
  await expect(page.getByRole('heading', { name: /^tetera$/i }).first()).toBeVisible()
  await expect(page.getByText('39.98').first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: /^tetera$/i }).first()).toBeVisible()
  await expect(page.getByText('39.98').first()).toBeVisible()
})

test('guest cart merges into one on login without duplicates (spec 4)', async ({
  page,
}) => {
  await installApiStub(page)
  await page.goto('/producto/tetera')
  await page.getByRole('button', { name: /a.adir a la cesta/i }).click()

  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(STUB_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/cesta')
  await expect(page.getByRole('heading', { name: /^tetera$/i })).toHaveCount(1)
  await expect(page.getByText('39.98').first()).toBeVisible()
})

test('clearing empties the cart with guidance to start over', async ({ page }) => {
  await installApiStub(page)
  await page.goto('/producto/tetera')
  await page.getByRole('button', { name: /a.adir a la cesta/i }).click()
  await page.goto('/cesta')
  await page.getByRole('button', { name: /vaciar cesta/i }).click()
  await expect(page.getByText('Tu cesta está vacía.')).toBeVisible()
  await expect(page.getByRole('link', { name: /cat.logo/i }).first()).toBeVisible()
})
