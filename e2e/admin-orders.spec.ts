import { test, expect } from '@playwright/test'

import { installApiStub, STUB_ADMIN_LOGIN, STUB_LOGIN } from './stub'

// Admin orders/users + propagation (T012, spec 12 remainder + 13). Every
// answer comes from the deterministic transport stub.

async function loginAsAdmin(page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(STUB_ADMIN_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_ADMIN_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function loginAsCustomer(page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(STUB_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function logout(page): Promise<void> {
  await page.getByRole('button', { name: /salir/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('admin lists orders and filters by status', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/pedidos')
  await expect(page.getByRole('heading', { name: 'ORD-0009' })).toBeVisible()

  await page.getByLabel(/filtrar por estado/i).selectOption('shipped')
  await expect(page.getByRole('heading', { name: 'ORD-0009' })).toHaveCount(0)
  await expect(page.getByText(/sin pedidos/i)).toBeVisible()
  await page.getByLabel(/filtrar por estado/i).selectOption('')
  await expect(page.getByRole('heading', { name: 'ORD-0009' })).toBeVisible()
})

test('admin status/payment transitions propagate to customer tracking (spec 13)', async ({
  page,
}) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/pedidos')
  await expect(page.getByRole('heading', { name: 'ORD-0009' })).toBeVisible()

  await page.getByLabel(/nuevo estado de ORD-0009/i).selectOption('shipped')
  await page.getByRole('button', { name: /cambiar estado de ORD-0009/i }).click()
  await expect(page.getByText('Enviado — 39.98')).toBeVisible()

  await page.getByLabel(/nuevo pago de ORD-0009/i).selectOption('paid')
  await page.getByRole('button', { name: /cambiar pago de ORD-0009/i }).click()
  await expect(page.getByText('Pago: Pagado')).toBeVisible()

  await logout(page)
  await loginAsCustomer(page)
  await page.goto('/pedidos/9')
  await expect(page.getByText('Enviado').first()).toBeVisible()
  await expect(page.getByText('Pago: Pagado')).toBeVisible()
})

test('admin lists and reads users', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/usuarios')
  await expect(page.getByText('ana@example.es')).toBeVisible()
  await expect(page.getByText('admin@example.es')).toBeVisible()

  await page.getByRole('link', { name: /ana/i }).click()
  await expect(page).toHaveURL(/admin\/usuarios\/5/)
  await expect(page.getByText('ana@example.es')).toBeVisible()
})

test('order/user admin stays silent without the role', async ({ page }) => {
  await installApiStub(page)
  await loginAsCustomer(page)
  await page.goto('/admin/pedidos')
  await expect(page).toHaveURL(/not-found/)
  await page.goto('/admin/usuarios')
  await expect(page).toHaveURL(/not-found/)
})
