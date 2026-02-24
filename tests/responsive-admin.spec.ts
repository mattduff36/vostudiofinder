import { test, expect } from '@playwright/test';

// Test admin interface responsiveness across different screen sizes
test.describe('Admin Interface - Responsive Design', () => {

  test('should load admin signin page responsively', async ({ page }) => {
    await page.goto('http://localhost:4000/auth/signin');
    
    // Check page title
    await expect(page).toHaveTitle(/Sign In - VoiceoverStudioFinder/);
    
    // Check form elements are visible and properly sized
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // Check that form elements are properly sized for the screen
    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();
    const submitBox = await submitButton.boundingBox();
    
    expect(emailBox?.width).toBeGreaterThan(200);
    expect(passwordBox?.width).toBeGreaterThan(200);
    expect(submitBox?.width).toBeGreaterThan(100);
  });

  test('should authenticate admin user responsively', async ({ page }) => {
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

  test('should display admin dashboard responsively', async ({ page }) => {
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
      
      // Check for admin navigation
      await expect(page.locator('nav').first()).toBeVisible();
      
      // Check for dashboard statistics cards
      const statsCards = page.locator('.bg-gradient-to-br');
      await expect(statsCards).toHaveCount(3);
      
      // Check that cards are properly sized for the screen
      const firstCard = statsCards.first();
      const cardBox = await firstCard.boundingBox();
      expect(cardBox?.width).toBeGreaterThan(200);
    });

  test('should handle admin navigation responsively', async ({ page }) => {
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
        
        // Check for admin layout elements
        await expect(page.locator('nav').first()).toBeVisible();
        
        // Check that content is properly sized
        const mainContent = page.locator('main, .main-content, [role="main"]');
        if (await mainContent.count() > 0) {
          const contentBox = await mainContent.first().boundingBox();
          expect(contentBox?.width).toBeGreaterThan(300);
        }
      }
    });

  test('should handle admin forms responsively', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin query page
      await page.goto('http://localhost:4000/admin/query');
      
      // Check for form elements
      const textarea = page.locator('textarea');
      const executeButton = page.locator('button:has-text("Execute")');
      
      await expect(textarea).toBeVisible();
      await expect(executeButton).toBeVisible();
      
      // Check that form elements are properly sized
      const textareaBox = await textarea.boundingBox();
      const buttonBox = await executeButton.boundingBox();
      
      expect(textareaBox?.width).toBeGreaterThan(300);
      expect(buttonBox?.width).toBeGreaterThan(80);
    });

  test('should handle admin tables responsively', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin browse page
      await page.goto('http://localhost:4000/admin/browse');
      
      // Check for table elements
      const tables = page.locator('table');
      if (await tables.count() > 0) {
        const tableBox = await tables.first().boundingBox();
        expect(tableBox?.width).toBeGreaterThan(400);
        
        // Check that table is scrollable on small screens
        const viewport = page.viewportSize();
        if (viewport && viewport.width < 768) {
          const tableContainer = tables.first().locator('..');
          const containerBox = await tableContainer.boundingBox();
          expect(containerBox?.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    });

  test('should handle admin modals responsively', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin dashboard
      await page.goto('http://localhost:4000/admin/dashboard');
      
      // Look for modal triggers
      const modalTriggers = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")');
      
      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().click();
        
        // Check for modal
        const modal = page.locator('[role="dialog"], .modal, .popup');
        if (await modal.count() > 0) {
          const modalBox = await modal.first().boundingBox();
          const viewport = page.viewportSize();
          if (viewport) {
            expect(modalBox?.width).toBeLessThanOrEqual(viewport.width);
            expect(modalBox?.height).toBeLessThanOrEqual(viewport.height);
          }
        }
      }
    });

  test('should handle admin sidebar responsively', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin dashboard
      await page.goto('http://localhost:4000/admin/dashboard');
      
      // Look for sidebar
      const sidebar = page.locator('aside, .sidebar, nav[role="navigation"]');
      
      if (await sidebar.count() > 0) {
        const sidebarBox = await sidebar.first().boundingBox();
        
        // On mobile, sidebar should be collapsible or hidden
        const viewport = page.viewportSize();
        if (viewport && viewport.width < 768) {
          // Sidebar should be hidden or very narrow on mobile
          expect(sidebarBox?.width).toBeLessThan(200);
        } else {
          // On desktop, sidebar should be visible
          expect(sidebarBox?.width).toBeGreaterThan(150);
        }
      }
    });

  test('should handle admin buttons responsively', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin dashboard
      await page.goto('http://localhost:4000/admin/dashboard');
      
      // Check all buttons are properly sized
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const buttonBox = await button.boundingBox();
        
        if (buttonBox) {
          // Buttons should be at least 40px tall for touch accessibility
          expect(buttonBox.height).toBeGreaterThanOrEqual(40);
          // Buttons should be at least 50px wide for readability
          expect(buttonBox.width).toBeGreaterThanOrEqual(50);
        }
      }
    });

  test('should handle admin text responsively', async ({ page }) => {
      // Authenticate first
      await page.goto('http://localhost:4000/auth/signin');
      await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
      await page.fill('input[name="password"]', 'GuyM@tt2025!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      
      // Navigate to admin dashboard
      await page.goto('http://localhost:4000/admin/dashboard');
      
      // Check that text is readable
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      for (let i = 0; i < Math.min(headingCount, 3); i++) {
        const heading = headings.nth(i);
        const headingBox = await heading.boundingBox();
        
        if (headingBox) {
          // Text should be at least 16px tall for readability
          expect(headingBox.height).toBeGreaterThanOrEqual(16);
        }
      }
    });
});
