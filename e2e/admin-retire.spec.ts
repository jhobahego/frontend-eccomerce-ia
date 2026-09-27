import { test, expect } from '@playwright/test'

import { installApiStub, STUB_ADMIN_LOGIN } from './stub'

// Explicit confirmation on retire with dependencies (T013, spec 16).
// Categories with products and products with order movements ask twice;
// removals without dependencies stay direct (pinned by admin-catalog).

async function loginAsAdmin(page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(STUB_ADMIN_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_ADMIN_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('removing a category with products requires explicit confirmation', async ({
  page,
}) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/categorias')
  await expect(page.getByRole('heading', { name: /^cocina$/i })).toBeVisible()

  await page.getByRole('button', { name: /^eliminar cocina$/i }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/tiene 1 producto/i)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^cocina$/i })).toBeVisible()

  await page.getByRole('button', { name: /^eliminar cocina$/i }).click()
  await page.getByRole('button', { name: /confirmar eliminaci.n de cocina/i }).click()
  await expect(page.getByRole('heading', { name: /^cocina$/i })).toHaveCount(0)
})

test('removing a product with order movements requires confirmation, others stay direct', async ({
  page,
}) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/productos')
  await expect(page.getByRole('heading', { name: /^tetera$/i })).toBeVisible()

  await page.getByRole('button', { name: /^eliminar tetera$/i }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/aparece en 1 pedido/i)

  await page.getByRole('button', { name: /cancelar/i }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^tetera$/i })).toBeVisible()

  await page.getByRole('button', { name: /^eliminar taza$/i }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^taza$/i })).toHaveCount(0)

  await page.getByRole('button', { name: /^eliminar tetera$/i }).click()
  await page.getByRole('button', { name: /confirmar eliminaci.n de tetera/i }).click()
  await expect(page.getByRole('heading', { name: /^tetera$/i })).toHaveCount(0)
})
