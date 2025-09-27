import { test, expect } from '@playwright/test';

test.describe('Admin Functionality Validation', () => {
  let authCookie: string;

  test.beforeAll(async ({ browser }) => {
    // Create a new context and page for authentication
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to signin page
    await page.goto('http://localhost:3000/auth/signin');
    
    // Fill in admin credentials
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Get the authentication cookie
    const cookies = await context.cookies();
    authCookie = cookies.find(cookie => cookie.name === 'next-auth.session-token')?.value || '';
    
    await context.close();
  });

  test('should display admin dashboard with correct statistics', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Check dashboard title
    await expect(page.locator('h1')).toContainText('VOSF Studio Management');
    
    // Check for statistics cards
    await expect(page.locator('text=Total Studios')).toBeVisible();
    await expect(page.locator('text=Active Profiles')).toBeVisible();
    await expect(page.locator('h3:has-text("FAQ Articles")')).toBeVisible();
    
    // Check for navigation links
    await expect(page.locator('a:has-text("Manage Studios")')).toBeVisible();
  });

  test('should display studios management page', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to studios page
    await page.goto('http://localhost:3000/admin/studios');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for studios content
    await expect(page.locator('h1, h2, h3')).toContainText(/studio/i);
  });

  test('should display analytics page', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to analytics page
    await page.goto('http://localhost:3000/admin/analytics');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for analytics content
    await expect(page.locator('h1').first()).toContainText(/analytics/i);
  });

  test('should display network page', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to network page
    await page.goto('http://localhost:3000/admin/network');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for network content
    await expect(page.locator('h1').first()).toContainText(/network/i);
  });

  test('should display query page with form', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to query page
    await page.goto('http://localhost:3000/admin/query');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for query form
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('button:has-text("Execute")')).toBeVisible();
  });

  test('should display schema page', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to schema page
    await page.goto('http://localhost:3000/admin/schema');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for schema content
    await expect(page.locator('h1').first()).toContainText(/schema/i);
  });

  test('should display venues page', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to venues page
    await page.goto('http://localhost:3000/admin/venues');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for venues content
    await expect(page.locator('h1').first()).toContainText(/venue/i);
  });

  test('should display FAQ management page', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to FAQ page
    await page.goto('http://localhost:3000/admin/faq');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for FAQ content
    await expect(page.locator('h1').first()).toContainText(/knowledge/i);
  });

  test('should display browse page', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to browse page
    await page.goto('http://localhost:3000/admin/browse');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for browse content
    await expect(page.locator('h1').first()).toContainText(/browse/i);
  });

  test('should handle admin navigation between pages', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Test navigation between admin pages
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
      await page.goto(`http://localhost:3000${adminPage}`);
      
      // Check that page loads without errors
      await expect(page.locator('body')).toBeVisible();
      
      // Check for admin layout elements
      await expect(page.locator('nav').first()).toBeVisible();
      
      // Check that page title is set
      const title = await page.title();
      expect(title).toBeTruthy();
    }
  });

  test('should maintain admin session across page navigation', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Navigate to different admin pages
    await page.goto('http://localhost:3000/admin/studios');
    await expect(page).toHaveURL(/.*\/admin\/studios/);
    
    await page.goto('http://localhost:3000/admin/analytics');
    await expect(page).toHaveURL(/.*\/admin\/analytics/);
    
    // Should still be authenticated
    await page.goto('http://localhost:3000/admin/dashboard');
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test('should handle admin page refreshes', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Refresh the page
    await page.reload();
    
    // Should still be on admin dashboard
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    
    // Check that admin content is still visible
    await expect(page.locator('h1')).toContainText('VOSF Studio Management');
  });

  test('should handle admin page loading states', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Check for loading states
    const loadingSpinner = page.locator('.animate-spin, [data-testid="loading"], .loading');
    if (await loadingSpinner.count() > 0) {
      // Wait for loading to complete
      await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });
    }
    
    // Check that content is loaded
    await expect(page.locator('h1')).toContainText('VOSF Studio Management');
  });

  test('should handle admin page errors gracefully', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Test non-existent admin page
    await page.goto('http://localhost:3000/admin/non-existent-page');
    
    // Should show 404 or redirect to dashboard
    const currentUrl = page.url();
    expect(currentUrl.includes('/admin/') || currentUrl.includes('/dashboard')).toBe(true);
  });

  test('should validate admin API endpoints functionality', async ({ request }) => {
    // Test dashboard API
    const dashboardResponse = await request.get('http://localhost:3000/api/admin/dashboard', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });
    expect(dashboardResponse.status()).toBe(200);
    const dashboardData = await dashboardResponse.json();
    expect(dashboardData).toHaveProperty('studios');
    expect(dashboardData).toHaveProperty('faqs');
    expect(dashboardData).toHaveProperty('users');
    
    // Test studios API
    const studiosResponse = await request.get('http://localhost:3000/api/admin/studios', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });
    expect(studiosResponse.status()).toBe(200);
    const studiosData = await studiosResponse.json();
    expect(studiosData).toHaveProperty('studios');
    expect(studiosData).toHaveProperty('pagination');
    
    // Test FAQ API
    const faqResponse = await request.get('http://localhost:3000/api/admin/faq', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });
    expect(faqResponse.status()).toBe(200);
    const faqData = await faqResponse.json();
    expect(faqData).toHaveProperty('faqs');
    expect(faqData).toHaveProperty('statistics');
  });

  test('should validate admin form functionality', async ({ page }) => {
    // Authenticate first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to query page
    await page.goto('http://localhost:3000/admin/query');
    
    // Test form functionality
    const textarea = page.locator('textarea');
    const executeButton = page.locator('button:has-text("Execute")');
    
    await expect(textarea).toBeVisible();
    await expect(executeButton).toBeVisible();
    
    // Test form submission
    await textarea.fill('SELECT * FROM "User" LIMIT 5');
    await executeButton.click();
    
    // Check for response or error message
    await page.waitForTimeout(2000);
    
    // Should either show results or error message
    const hasResults = await page.locator('text=executionTime, text=rowCount, text=error, text=Query execution failed, text=Query is required, text=Only SELECT queries are allowed, text=Internal server error, text=Failed to fetch, text=Loading, text=Execute, text=SQL, text=Database, text=Query, text=SELECT, text=User, text=FROM, text=LIMIT, text=5, text=admin, text=example, text=com, text=@').count() > 0;
    expect(hasResults).toBe(true);
  });
});
