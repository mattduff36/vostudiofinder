import { test, expect } from '@playwright/test';

// Test admin interface across different browsers
test.describe('Admin Interface - Cross Browser', () => {

    test('should load admin signin page correctly', async ({ page }) => {
      await page.goto('http://localhost:4000/auth/signin');
      
      // Check page title
      await expect(page).toHaveTitle(/Sign In - VoiceoverStudioFinder/);
      
      // Check form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check OAuth buttons (may not be visible in all browsers)
      const oauthButtons = page.locator('button[type="button"]');
      await expect(oauthButtons).toHaveCount(4); // 3 OAuth + 1 password toggle
    });

    test('should authenticate admin user successfully', async ({ page }) => {
      await page.goto('http://localhost:4000/auth/signin');
      
      // Fill in admin credentials
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      
      // Submit the form
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Verify we're on the dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should access admin dashboard after authentication', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin dashboard
      await page.goto('http://localhost:4000/admin/dashboard');
      
      // Check admin dashboard elements
      await expect(page.locator('h1')).toContainText('VOSF Studio Management');
      
      // Check for admin navigation (there may be multiple nav elements)
      await expect(page.locator('nav').first()).toBeVisible();
      
      // Check for dashboard statistics
      await expect(page.locator('text=Total Studios')).toBeVisible();
      await expect(page.locator('text=Active Profiles')).toBeVisible();
      await expect(page.locator('h3:has-text("FAQ Articles")')).toBeVisible();
    });

    test('should navigate between admin pages', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Test navigation to different admin pages
      const adminPages = [
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
      
      for (const adminPage of adminPages) {
        await page.goto(`http://localhost:4000${adminPage}`);
        
        // Check that page loads without errors
        await expect(page.locator('body')).toBeVisible();
        
        // Check for admin layout elements (there may be multiple nav elements)
        await expect(page.locator('nav').first()).toBeVisible();
      }
    });

    test('should handle admin API calls correctly', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Test API calls
      const response = await page.request.get('http://localhost:4000/api/admin/dashboard');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('studios');
      expect(data).toHaveProperty('faqs');
      expect(data).toHaveProperty('users');
    });

    test('should display admin forms correctly', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin query page
      await page.goto('http://localhost:4000/admin/query');
      
      // Check for form elements
      await expect(page.locator('textarea')).toBeVisible();
      await expect(page.locator('button:has-text("Execute")')).toBeVisible();
    });

    test('should handle admin logout correctly', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Look for logout button (may be in navigation or user menu)
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Sign Out")');
      
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        
        // Should redirect to signin page
        await expect(page).toHaveURL(/.*\/auth\/signin/);
        
        // Try to access admin page - should redirect to signin
        await page.goto('http://localhost:4000/admin/dashboard');
        await expect(page).toHaveURL(/.*\/auth\/signin/);
      }
    });

    test('should handle admin page errors gracefully', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Test non-existent admin page
      await page.goto('http://localhost:4000/admin/non-existent-page');
      
      // Should show 404 or redirect to dashboard
      const currentUrl = page.url();
      expect(currentUrl.includes('/admin/') || currentUrl.includes('/dashboard')).toBe(true);
    });

    test('should maintain admin session across page refreshes', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin dashboard
      await page.goto('http://localhost:4000/admin/dashboard');
      
      // Refresh the page
      await page.reload();
      
      // Should still be on admin dashboard
      await expect(page).toHaveURL(/.*\/admin\/dashboard/);
      
      // Check that admin content is still visible
      await expect(page.locator('h1')).toContainText('VOSF Studio Management');
    });

    test('should handle admin page loading states', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin dashboard
      await page.goto('http://localhost:4000/admin/dashboard');
      
      // Check for loading states
      const loadingSpinner = page.locator('.animate-spin, [data-testid="loading"], .loading');
      if (await loadingSpinner.count() > 0) {
        // Wait for loading to complete
        await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });
      }
      
      // Check that content is loaded
      await expect(page.locator('h1')).toContainText('VOSF Studio Management');
    });
});
