import { test, expect } from '@playwright/test'

test.describe('Navigation and Public Routes', () => {
  test('landing page redirects to login', async ({ page }) => {
    await page.goto('/')
    // Root page likely redirects to login for unauthenticated users
    await expect(page).toHaveURL(/.*login/)
  })

  test('login page is accessible', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.status()).toBeLessThan(500)
    await expect(page.getByRole('heading', { name: /Iniciar Sesión/i })).toBeVisible()
  })

  test('register page is accessible', async ({ page }) => {
    const response = await page.goto('/register')
    expect(response?.status()).toBeLessThan(500)
    await expect(page.getByRole('heading', { name: /Crear Cuenta/i })).toBeVisible()
  })

  test('dashboard redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })

  test('courses page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/cursos')
    await expect(page).toHaveURL(/.*login/)
  })

  test('agenda page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/agenda')
    await expect(page).toHaveURL(/.*login/)
  })

  test('settings page redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/configuracion')
    await expect(page).toHaveURL(/.*login/)
  })
})
