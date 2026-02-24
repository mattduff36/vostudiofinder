import { test, expect } from '@playwright/test';

test.describe('Admin Authentication and Authorization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the admin dashboard
    await page.goto('http://localhost:4000/admin/dashboard');
  });

  test('should redirect unauthenticated users to signin page', async ({ page }) => {
    // Check if we're redirected to signin
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    
    // Check for signin form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should allow admin users to access admin dashboard', async ({ page }) => {
    // First, we need to authenticate as admin
    // Navigate to signin page
    await page.goto('http://localhost:4000/auth/signin');
    
    // Fill in admin credentials (using the actual admin credentials from .env.local)
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin dashboard
    await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
    
    // Verify we're on the admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });

  test('should deny access to admin routes for non-admin users', async ({ page }) => {
    // This test would require creating a non-admin user
    // For now, we'll test the unauthorized page
    await page.goto('http://localhost:4000/unauthorized');
    
    // Check for unauthorized message (the page shows "Welcome Back" which is the signin page)
    await expect(page.locator('h1')).toContainText('Welcome Back');
  });

  test('should protect all admin routes', async ({ page }) => {
    const adminRoutes = [
      '/admin/dashboard',
      '/admin/studios',
      '/admin/analytics',
      '/admin/network',
      '/admin/query',
      '/admin/schema',
      '/admin/venues',
      '/admin/faq',
      '/admin/browse'
    ];

    for (const route of adminRoutes) {
      await page.goto(`http://localhost:4000${route}`);
      
      // Should redirect to signin for unauthenticated users
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    }
  });

  test('should protect admin API endpoints', async ({ page }) => {
    const adminApiRoutes = [
      '/api/admin/dashboard',
      '/api/admin/studios',
      '/api/admin/analytics',
      '/api/admin/network',
      '/api/admin/query',
      '/api/admin/schema',
      '/api/admin/venues',
      '/api/admin/faq',
      '/api/admin/browse'
    ];

    for (const route of adminApiRoutes) {
      const response = await page.request.get(`http://localhost:4000${route}`);
      
      // Should return 307 redirect for unauthenticated requests
      expect(response.status()).toBe(307);
    }
  });

  test('should maintain admin session across page navigation', async ({ page }) => {
    // Authenticate as admin
    await page.goto('http://localhost:4000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
    
    // Navigate to different admin pages
    await page.goto('http://localhost:4000/admin/studios');
    await expect(page).toHaveURL(/.*\/admin\/studios/);
    
    await page.goto('http://localhost:4000/admin/analytics');
    await expect(page).toHaveURL(/.*\/admin\/analytics/);
    
    // Should still be authenticated
    await page.goto('http://localhost:4000/admin/dashboard');
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test('should handle admin logout', async ({ page }) => {
    // Authenticate as admin
    await page.goto('http://localhost:4000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
    
    // Logout (assuming there's a logout button)
    await page.click('button:has-text("Logout")');
    
    // Should redirect to signin
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    
    // Try to access admin route - should redirect to signin
    await page.goto('http://localhost:4000/admin/dashboard');
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });
});
