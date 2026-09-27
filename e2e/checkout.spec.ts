import { test, expect } from '@playwright/test'

import { installApiStub, STUB_LOGIN } from './stub'

// Checkout blocking into a numbered order (T008, spec 6 and 7). Every answer
// comes from the deterministic transport stub; no live backend is needed.

async function loginAsCustomer(page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(STUB_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function addTetera(page): Promise<void> {
  await page.goto('/producto/tetera')
  await page.getByRole('button', { name: /a.adir a la cesta/i }).click()
}

test('blocked confirmation cannot create an order (spec 6)', async ({ page }) => {
  await installApiStub(page, { stock: 'blocked' })
  await loginAsCustomer(page)
  await addTetera(page)
  await page.goto('/checkout')
  await expect(page.getByText(/sin disponibilidad/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /confirmar pedido/i })).toBeDisabled()
  await expect(page.getByText(/ORD-/)).toHaveCount(0)
})

test('complete shipping creates a numbered order and resets the cart (spec 7)', async ({
  page,
}) => {
  await installApiStub(page)
  await loginAsCustomer(page)
  await addTetera(page)
  await page.goto('/checkout')
  await page.getByLabel('Dirección de envío', { exact: true }).fill('Calle Falsa 123')
  await page.getByLabel('Ciudad', { exact: true }).fill('Madrid')
  await page.getByLabel('País', { exact: true }).fill('ES')
  await page.getByLabel('Código postal', { exact: true }).fill('28001')
  await page.getByRole('button', { name: /confirmar pedido/i }).click()
  await expect(page.getByText('ORD-0009')).toBeVisible()

  await page.goto('/cesta')
  await expect(page.getByText('Tu cesta está vacía.')).toBeVisible()
})
