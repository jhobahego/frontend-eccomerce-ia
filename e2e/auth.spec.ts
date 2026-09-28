import { test, expect } from '@playwright/test'

test('login muestra el error junto al formulario con credenciales inválidas', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Incorrect email or password' }),
    }),
  )
  await page.goto('/login')
  await page.getByLabel(/correo o usuario/i).fill('ana@example.es')
  await page.getByLabel(/contraseña/i).fill('incorrecta')
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password')
  await expect(page).toHaveURL(/\/login/)
})

test('registro duplicado avisa sin perder lo escrito', async ({ page }) => {
  await page.route('**/api/v1/auth/register', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'The user with this email already exists in the system.' }),
    }),
  )
  await page.goto('/register')
  await page.getByLabel(/correo/i).fill('ana@example.es')
  await page.getByLabel(/usuario/i).fill('ana')
  await page.getByLabel(/nombre/i).fill('Ana')
  await page.getByLabel(/apellidos/i).fill('Luz')
  await page.getByLabel(/contraseña/i).fill('s3cret')
  await page.getByRole('button', { name: /crear cuenta/i }).click()
  await expect(page.getByRole('alert')).toContainText('already exists in the system')
  await expect(page.getByLabel(/correo/i)).toHaveValue('ana@example.es')
  await expect(page).toHaveURL(/\/register/)
})
