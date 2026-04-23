import { test, expect } from '@playwright/test'

test.describe('Security & Access Control', () => {
  const protectedRoutes = [
    '/dashboard',
    '/cursos',
    '/agenda',
    '/configuracion',
    '/cursos/test-course/alumnos',
    '/cursos/test-course/asistencia',
    '/cursos/test-course/calificaciones',
    '/cursos/test-course/planificaciones',
  ]

  for (const route of protectedRoutes) {
    test(`Route ${route} should redirect to login when unauthenticated`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/.*login/)
    })
  }

  test('Public routes should be accessible', async ({ page }) => {
    const publicRoutes = ['/login', '/register']
    
    for (const route of publicRoutes) {
      await page.goto(route)
      await expect(page).not.toHaveURL(/.*login.*login/) // No infinite redirect
      expect(page.url()).toContain(route)
    }
  })
})
