import { test, expect } from '@playwright/test';

test.describe('Signup Route Guards', () => {
  test.describe('Unauthenticated users', () => {
    test('should be able to access /auth/signup in development', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/signup');
      
      // Should stay on signup page
      await expect(page).toHaveURL(/.*\/auth\/signup/);
      
      // Check for signup form elements
      await expect(page.locator('input[name="displayName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });

    test('should be able to access /auth/username-selection', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/username-selection?display_name=Test');
      
      // Should stay on username selection page
      await expect(page).toHaveURL(/.*\/auth\/username-selection/);
    });

    test('should be redirected from /register to /auth/signup in development', async ({ page }) => {
      await page.goto('http://localhost:3000/register');
      
      // Should redirect to signup
      await page.waitForURL(/.*\/auth\/signup/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*\/auth\/signup/);
    });
  });

  test.describe('Authenticated admin users', () => {
    test.beforeEach(async ({ page }) => {
      // Authenticate as admin
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      
      // Wait for redirect to admin dashboard
      await page.waitForURL(/.*\/admin/, { timeout: 10000 });
    });

    test('should redirect from /auth/signup to /admin', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/signup');
      
      // Should redirect to admin
      await page.waitForURL(/.*\/admin/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*\/admin/);
    });

    test('should redirect from /auth/username-selection to /admin', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/username-selection?display_name=Test');
      
      // Should redirect to admin
      await page.waitForURL(/.*\/admin/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*\/admin/);
    });

    test('should redirect from /register to /admin', async ({ page }) => {
      await page.goto('http://localhost:3000/register');
      
      // Should redirect to admin
      await page.waitForURL(/.*\/admin/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*\/admin/);
    });

    test('should block all signup funnel entry points', async ({ page }) => {
      const signupRoutes = [
        '/auth/signup',
        '/auth/username-selection',
        '/register'
      ];

      for (const route of signupRoutes) {
        await page.goto(`http://localhost:3000${route}`);
        
        // Should redirect to admin for authenticated admin users
        await page.waitForURL(/.*\/admin/, { timeout: 5000 });
        await expect(page).toHaveURL(/.*\/admin/);
      }
    });
  });

  test.describe('Authenticated non-admin users', () => {
    test.beforeEach(async ({ page }) => {
      // First check if we have a test user account, otherwise skip
      // For this test, we'll use the successful payment account created during testing
      // Email: matt.mpdee@gmail.com
      
      // Try to sign in with the test account
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'matt.mpdee@gmail.com');
      await page.fill('input[name="password"]', 'Test123!@#');
      
      // Click submit
      await page.click('button[type="submit"]');
      
      // Wait for navigation - could be dashboard or error
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    });

    test('should redirect from /auth/signup to /dashboard if authenticated', async ({ page }) => {
      // Check if we're authenticated (not on signin page)
      const currentUrl = page.url();
      
      // Only run this test if we successfully authenticated
      if (!currentUrl.includes('/auth/signin')) {
        await page.goto('http://localhost:3000/auth/signup');
        
        // Should redirect to dashboard
        await page.waitForURL(/.*\/dashboard/, { timeout: 5000 });
        await expect(page).toHaveURL(/.*\/dashboard/);
      } else {
        test.skip();
      }
    });

    test('should redirect from /auth/username-selection to /dashboard if authenticated', async ({ page }) => {
      const currentUrl = page.url();
      
      if (!currentUrl.includes('/auth/signin')) {
        await page.goto('http://localhost:3000/auth/username-selection?display_name=Test');
        
        // Should redirect to dashboard
        await page.waitForURL(/.*\/dashboard/, { timeout: 5000 });
        await expect(page).toHaveURL(/.*\/dashboard/);
      } else {
        test.skip();
      }
    });

    test('should redirect from /register to /dashboard if authenticated', async ({ page }) => {
      const currentUrl = page.url();
      
      if (!currentUrl.includes('/auth/signin')) {
        await page.goto('http://localhost:3000/register');
        
        // Should redirect to dashboard
        await page.waitForURL(/.*\/dashboard/, { timeout: 5000 });
        await expect(page).toHaveURL(/.*\/dashboard/);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Session persistence', () => {
    test('should maintain redirect behavior across page reloads', async ({ page }) => {
      // Authenticate as admin
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForURL(/.*\/admin/, { timeout: 10000 });
      
      // Try to access signup after authentication
      await page.goto('http://localhost:3000/auth/signup');
      await page.waitForURL(/.*\/admin/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*\/admin/);
      
      // Reload the page
      await page.reload();
      
      // Try again - should still redirect
      await page.goto('http://localhost:3000/auth/signup');
      await page.waitForURL(/.*\/admin/, { timeout: 5000 });
      await expect(page).toHaveURL(/.*\/admin/);
    });
  });
});

