import { test, expect } from '@playwright/test'

import { installApiStub, STUB_LOGIN } from './stub'

// Account, history, tracking and cancel (T009, spec 9 and 10). Every answer
// comes from the deterministic transport stub; no live backend is needed.

async function loginAsCustomer(page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(STUB_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('profile edits are reflected on reload (spec 9)', async ({ page }) => {
  await installApiStub(page)
  await loginAsCustomer(page)
  await page.goto('/cuenta')
  await expect(page.getByLabel(/nombre/i)).toHaveValue('Ana')
  await page.getByLabel(/nombre/i).fill('Anita')
  await page.getByRole('button', { name: /guardar/i }).click()
  await expect(page.getByText(/perfil actualizado/i)).toBeVisible()

  await page.reload()
  await expect(page.getByLabel(/nombre/i)).toHaveValue('Anita')
})

test('history shows states and amounts with private tracking (spec 10)', async ({
  page,
}) => {
  await installApiStub(page)
  await loginAsCustomer(page)
  await page.goto('/pedidos')
  await expect(page.getByText('ORD-0009')).toBeVisible()
  await expect(page.getByText('39.98').first()).toBeVisible()

  await page.getByRole('link', { name: /ORD-0009/ }).click()
  await expect(page).toHaveURL(/pedidos\/9/)
  await expect(page.getByRole('heading', { name: /ORD-0009/ })).toBeVisible()
  await expect(page.getByText(/pendiente/i).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /seguimiento/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /cancelar pedido/i })).toBeVisible()
})

test('cancel adopts the cancelled state and retires the action', async ({ page }) => {
  await installApiStub(page)
  await loginAsCustomer(page)
  await page.goto('/pedidos/9')
  await page.getByRole('button', { name: /cancelar pedido/i }).click()
  await expect(page.getByText(/cancelado/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /cancelar pedido/i })).toHaveCount(0)
})
