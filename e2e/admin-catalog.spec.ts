import { test, expect } from '@playwright/test'

import { installApiStub, STUB_ADMIN_LOGIN } from './stub'

// Admin catalog (T010, spec 12 part): category and product CRUD, stock with
// an admin-only low-stock notice, and no reorder action anywhere in v1.
// Every answer comes from the deterministic transport stub.

async function loginAsAdmin(page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill(STUB_ADMIN_LOGIN.username)
  await page.getByLabel(/contraseña/i).fill(STUB_ADMIN_LOGIN.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('categories are created, edited and removed', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/categorias')
  await expect(page.getByRole('heading', { name: /^cocina$/i })).toBeVisible()

  await page.getByLabel(/nombre de la categor.a/i).fill('Bebidas')
  await page.getByLabel(/slug/i).fill('bebidas')
  await page.getByRole('button', { name: /crear categor.a/i }).click()
  await expect(page.getByRole('heading', { name: /^bebidas$/i })).toBeVisible()

  await page.getByRole('button', { name: /editar bebidas/i }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Bebidas frías')
  await page.getByRole('button', { name: /guardar/i }).click()
  await expect(page.getByRole('heading', { name: /^bebidas fr.as$/i })).toBeVisible()

  await page.getByRole('button', { name: /eliminar bebidas fr.as/i }).click()
  await expect(page.getByRole('heading', { name: /^bebidas fr.as$/i })).toHaveCount(0)
})

test('products are created, featured and removed with catalog propagation', async ({
  page,
}) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/productos')
  await page.getByLabel(/nombre del producto/i).fill('Cafetera')
  await page.getByLabel(/slug del producto/i).fill('cafetera')
  await page.getByLabel(/referencia/i).fill('CAF-001')
  await page.getByLabel(/precio$/i).fill('49.99')
  await page.getByLabel(/categor.a/i).selectOption({ index: 1 })
  await page.getByRole('button', { name: /crear producto/i }).click()
  await expect(page.getByRole('heading', { name: /^cafetera$/i })).toBeVisible()

  await page.goto('/catalogo?query=cafetera')
  await expect(page.getByRole('heading', { name: /^cafetera$/i }).first()).toBeVisible()

  await page.goto('/admin/productos')
  await page.getByRole('button', { name: /destacar cafetera/i }).click()
  await expect(
    page.getByRole('button', { name: /quitar destacado de cafetera/i }),
  ).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /^cafetera$/i }).first()).toBeVisible()

  await page.goto('/admin/productos')
  await page.getByRole('button', { name: /eliminar cafetera/i }).click()
  await expect(page.getByRole('heading', { name: /^cafetera$/i })).toHaveCount(0)
  await page.goto('/catalogo?query=cafetera')
  await expect(page.getByText(/sin resultados/i)).toBeVisible()
})

test('stock adjusts with a low-stock notice kept from customers', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/productos')
  await expect(page.getByRole('heading', { name: /stock bajo/i })).toBeVisible()
  await expect(page.getByText(/tetera/i).first()).toBeVisible()

  await page.goto('/producto/tetera')
  await expect(page.getByText(/disponible/i).first()).toBeVisible()
  await expect(page.getByText(/stock bajo/i)).toHaveCount(0)
})

test('v1 ships no reorder action', async ({ page }) => {
  await installApiStub(page, { user: 'admin' })
  await loginAsAdmin(page)
  await page.goto('/admin/categorias')
  await expect(page.getByRole('button', { name: /reorden/i })).toHaveCount(0)
  await expect(page.getByText(/reorden/i)).toHaveCount(0)
  await page.goto('/admin/productos')
  await expect(page.getByText(/reorden/i)).toHaveCount(0)
})
