import { test, expect } from '@playwright/test'

import { installApiStub } from './stub'

// Catalog reading (T006): home, search with filters, product detail and edges.
// Every answer comes from the deterministic transport stub; no live backend.
// Comments avoid inline patterns on purpose (the spec loader chokes on them).

test('home shows featured and navigable categories (spec 1)', async ({ page }) => {
  await installApiStub(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /destacados/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /tetera/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /categor/i })).toBeVisible()
  const cocina = page.getByRole('link', { name: /cocina/i }).first()
  await expect(cocina).toBeVisible()
  await cocina.click()
  await expect(page).toHaveURL(/categoria/)
})

test('catalog filters, sorts and clears (spec 2)', async ({ page }) => {
  await installApiStub(page)
  await page.goto('/catalogo?query=tetera')
  await expect(page.getByRole('heading', { name: /tetera/i }).first()).toBeVisible()

  await page.goto('/catalogo?query=sin-resultados-xyz')
  await expect(page.getByText(/sin resultados/i)).toBeVisible()
  await page.getByRole('button', { name: /ver todo el cat.logo/i }).click()
  await expect(page).toHaveURL(/catalogo/)
  await expect(page.getByRole('heading', { name: /tetera/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /taza/i }).first()).toBeVisible()
  await expect(page.getByText(/2 productos/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /siguiente/i })).toBeDisabled()
})

test('catalog sorts by price through the server', async ({ page }) => {
  await installApiStub(page)
  await page.goto('/catalogo')
  await page.getByLabel(/orden/i).selectOption('price-asc')
  const firstAsc = await page.getByTestId('product-name').first().textContent()
  expect(firstAsc).toContain('Taza')
  await page.getByLabel(/orden/i).selectOption('price-desc')
  const firstDesc = await page.getByTestId('product-name').first().textContent()
  expect(firstDesc).toContain('Tetera')
})

test('product detail shows price, availability, category and similar (spec 3)', async ({
  page,
}) => {
  await installApiStub(page)
  await page.goto('/producto/tetera')
  await expect(page.getByRole('heading', { name: /^tetera$/i })).toBeVisible()
  await expect(page.getByText('19.99').first()).toBeVisible()
  await expect(page.getByText(/disponible/i).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /cocina/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /similares/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /taza/i }).first()).toBeVisible()
})

test('edges: imageless products show a marker, empty categories guide on', async ({
  page,
}) => {
  await installApiStub(page)
  await page.goto('/producto/tetera')
  await expect(page.getByText(/sin imagen/i)).toBeVisible()

  await page.goto('/categoria/4')
  await expect(page.getByText(/sin productos/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /cat.logo/i }).first()).toBeVisible()
})
