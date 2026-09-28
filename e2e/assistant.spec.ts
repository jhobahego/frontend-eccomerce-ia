import { test, expect } from '@playwright/test'

import { installApiStub } from './stub'

// Honest AI shell (T011, spec 14): a permanent entry with an honest
// no-availability message plus manual paths, never blocking shopping.

test('assistant slot declares itself with manual paths and shopping continues', async ({
  page,
}) => {
  await installApiStub(page)
  await page.goto('/')
  await page.getByRole('button', { name: /asistente/i }).click()
  await expect(page.getByText(/a.n no est. disponible/i)).toBeVisible()
  await page.getByRole('link', { name: /buscar en el cat.logo/i }).click()
  await expect(page).toHaveURL(/catalogo/)
  await expect(page.getByText(/a.n no est. disponible/i)).toHaveCount(0)

  await page.goto('/producto/tetera')
  await page.getByRole('button', { name: /a.adir a la cesta/i }).click()
  await page.goto('/cesta')
  await expect(page.getByRole('heading', { name: /^tetera$/i }).first()).toBeVisible()
})

test('assistant dialog closes with Escape and returns focus', async ({ page }) => {
  await installApiStub(page)
  await page.goto('/')
  await page.getByRole('button', { name: /asistente/i }).click()
  await expect(page.getByText(/a.n no est. disponible/i)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText(/a.n no est. disponible/i)).toHaveCount(0)
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? '')
  expect(focused).toContain('Asistente')
})
