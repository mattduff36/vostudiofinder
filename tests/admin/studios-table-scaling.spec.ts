import { test, expect } from '@playwright/test';

// Test admin studios table scaling and column visibility
test.describe('Admin Studios Table - Scaling and Column Visibility', () => {
  // Helper to authenticate as admin
  async function authenticateAdmin(page: import('@playwright/test').Page) {
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || '');
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || '');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
  }

  // Helper to clear localStorage before test
  async function clearColumnPreferences(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
      localStorage.removeItem('admin-studios-hidden-columns');
    });
  }

  test.beforeEach(async ({ page }) => {
    await authenticateAdmin(page);
  });

  test.describe('Full Width Viewport (1920px)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should display all columns at 1920px with minimal or no scaling', async ({ page }) => {
      await clearColumnPreferences(page);
      await page.goto('http://localhost:3000/admin/studios');
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500); // Wait for scaling calculation
      
      // Check table is visible
      const table = page.locator('table');
      await expect(table).toBeVisible();
      
      // Check all columns are visible (by checking header cells)
      const expectedColumns = ['Select', 'Studio', 'Type', 'Owner', 'Status', 'Visible', 'Complete', 'Verified', 'Featured', 'Last Login', 'Membership Expires', 'Updated', 'Actions'];
      
      for (const column of expectedColumns) {
        const header = page.locator(`th:has-text("${column}")`);
        await expect(header).toBeVisible();
      }
      
      // At 1920px, if scaling is present it should be minimal (>90%)
      const scaleIndicator = page.locator('text=Table scaled to');
      const isScaled = await scaleIndicator.isVisible();
      if (isScaled) {
        const scaleText = await scaleIndicator.textContent();
        // Extract percentage and verify it's above 90%
        const match = scaleText?.match(/(\d+)%/);
        if (match) {
          const scalePercent = parseInt(match[1]);
          expect(scalePercent).toBeGreaterThanOrEqual(90);
        }
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-1920px-all-columns.png',
        fullPage: true 
      });
    });
  });

  test.describe('Medium Width Viewport (1200px)', () => {
    test.use({ viewport: { width: 1200, height: 800 } });

    test('should scale table to fit at 1200px viewport', async ({ page }) => {
      await clearColumnPreferences(page);
      await page.goto('http://localhost:3000/admin/studios');
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500); // Wait for scaling calculation
      
      // Check table is visible
      const table = page.locator('table');
      await expect(table).toBeVisible();
      
      // Check table container has no horizontal scroll
      const tableContainer = page.locator('div.overflow-hidden').filter({ has: table });
      const containerBox = await tableContainer.first().boundingBox();
      const viewport = page.viewportSize();
      
      if (containerBox && viewport) {
        // Container should not exceed viewport width
        expect(containerBox.width).toBeLessThanOrEqual(viewport.width);
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-1200px-scaled.png',
        fullPage: true 
      });
    });
  });

  test.describe('Narrow Width Viewport (700px)', () => {
    test.use({ viewport: { width: 700, height: 600 } });

    test('should show mobile card view at 700px (below md breakpoint)', async ({ page }) => {
      await clearColumnPreferences(page);
      await page.goto('http://localhost:3000/admin/studios');
      
      // Wait for content to load
      await page.waitForTimeout(1000);
      
      // At 700px (below md:768px), should show mobile card view
      // Look for mobile card elements specifically - these have space-y-4 class
      const mobileCardContainer = page.locator('div.md\\:hidden.space-y-4');
      
      // Mobile cards should be visible at this viewport
      await expect(mobileCardContainer).toBeVisible();
      
      // Verify we can see the mobile card content (studio cards with View/Edit/Delete buttons)
      const mobileCards = mobileCardContainer.locator('.bg-white.rounded-lg');
      const cardCount = await mobileCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-700px-mobile-cards.png',
        fullPage: true 
      });
    });
  });

  test.describe('Desktop Viewport with Column Visibility', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('should hide columns via filter and verify they are removed', async ({ page }) => {
      await clearColumnPreferences(page);
      await page.goto('http://localhost:3000/admin/studios');
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500);
      
      // Take screenshot before hiding columns
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-before-hide-columns.png',
        fullPage: true 
      });
      
      // Open column visibility dropdown
      const columnsButton = page.locator('button:has-text("13")').first();
      await columnsButton.click();
      
      // Wait for dropdown to open
      await page.waitForTimeout(300);
      
      // Take screenshot of dropdown open
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-column-dropdown-open.png',
        fullPage: true 
      });
      
      // Uncheck "Type" column
      const typeCheckbox = page.locator('label:has-text("Type") input[type="checkbox"]');
      await typeCheckbox.click();
      
      // Uncheck "Last Login" column
      const lastLoginCheckbox = page.locator('label:has-text("Last Login") input[type="checkbox"]');
      await lastLoginCheckbox.click();
      
      // Uncheck "Updated" column
      const updatedCheckbox = page.locator('label:has-text("Updated") input[type="checkbox"]');
      await updatedCheckbox.click();
      
      // Close dropdown by clicking outside
      await page.click('h1:has-text("Studio Management")');
      await page.waitForTimeout(300);
      
      // Verify columns are hidden
      const typeHeader = page.locator('th[data-column="type"]');
      const lastLoginHeader = page.locator('th[data-column="lastLogin"]');
      const updatedHeader = page.locator('th[data-column="updated"]');
      
      await expect(typeHeader).not.toBeVisible();
      await expect(lastLoginHeader).not.toBeVisible();
      await expect(updatedHeader).not.toBeVisible();
      
      // Verify protected columns are still visible
      const studioHeader = page.locator('th[data-column="studio"]');
      const actionsHeader = page.locator('th[data-column="actions"]');
      
      await expect(studioHeader).toBeVisible();
      await expect(actionsHeader).toBeVisible();
      
      // Take screenshot after hiding columns
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-after-hide-columns.png',
        fullPage: true 
      });
    });

    test('should persist column preferences across page reloads', async ({ page }) => {
      await clearColumnPreferences(page);
      await page.goto('http://localhost:3000/admin/studios');
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500);
      
      // Open column visibility dropdown and hide Owner column
      const columnsButton = page.locator('button:has-text("13")').first();
      await columnsButton.click();
      await page.waitForTimeout(300);
      
      const ownerCheckbox = page.locator('label:has-text("Owner") input[type="checkbox"]');
      await ownerCheckbox.click();
      
      // Close dropdown
      await page.click('h1:has-text("Studio Management")');
      await page.waitForTimeout(300);
      
      // Verify Owner column is hidden
      const ownerHeader = page.locator('th[data-column="owner"]');
      await expect(ownerHeader).not.toBeVisible();
      
      // Take screenshot before reload
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-before-reload.png',
        fullPage: true 
      });
      
      // Reload the page
      await page.reload();
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500);
      
      // Verify Owner column is still hidden after reload
      const ownerHeaderAfterReload = page.locator('th[data-column="owner"]');
      await expect(ownerHeaderAfterReload).not.toBeVisible();
      
      // Take screenshot after reload
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-after-reload-persisted.png',
        fullPage: true 
      });
    });

    test('should reset columns to default via Reset button', async ({ page }) => {
      // First set some hidden columns via localStorage
      await page.goto('http://localhost:3000/admin/studios');
      await page.evaluate(() => {
        localStorage.setItem('admin-studios-hidden-columns', JSON.stringify(['type', 'owner', 'lastLogin']));
      });
      
      // Reload to apply localStorage preferences
      await page.reload();
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500);
      
      // Verify columns are hidden
      const typeHeader = page.locator('th[data-column="type"]');
      const ownerHeader = page.locator('th[data-column="owner"]');
      await expect(typeHeader).not.toBeVisible();
      await expect(ownerHeader).not.toBeVisible();
      
      // Take screenshot with hidden columns
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-before-reset.png',
        fullPage: true 
      });
      
      // Open column dropdown and click Reset
      const columnsButton = page.locator('button:has-text("/13")').first();
      await columnsButton.click();
      await page.waitForTimeout(300);
      
      const resetButton = page.locator('button:has-text("Reset to Default")');
      await resetButton.click();
      
      // Close dropdown
      await page.click('h1:has-text("Studio Management")');
      await page.waitForTimeout(300);
      
      // Verify all columns are now visible
      const typeHeaderAfterReset = page.locator('th[data-column="type"]');
      const ownerHeaderAfterReset = page.locator('th[data-column="owner"]');
      const lastLoginHeaderAfterReset = page.locator('th[data-column="lastLogin"]');
      
      await expect(typeHeaderAfterReset).toBeVisible();
      await expect(ownerHeaderAfterReset).toBeVisible();
      await expect(lastLoginHeaderAfterReset).toBeVisible();
      
      // Take screenshot after reset
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-after-reset.png',
        fullPage: true 
      });
    });

    test('should prevent hiding protected columns (Studio, Actions)', async ({ page }) => {
      await clearColumnPreferences(page);
      await page.goto('http://localhost:3000/admin/studios');
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500);
      
      // Open column visibility dropdown
      const columnsButton = page.locator('button:has-text("/13")').first();
      await columnsButton.click();
      await page.waitForTimeout(300);
      
      // Verify Studio and Actions checkboxes are disabled (use more specific locators within the dropdown)
      const dropdown = page.locator('.max-h-64');
      const studioCheckbox = dropdown.locator('label:has-text("Studio") input[type="checkbox"]');
      const actionsCheckbox = dropdown.locator('label:has-text("Actions") input[type="checkbox"]');
      
      await expect(studioCheckbox).toBeDisabled();
      await expect(actionsCheckbox).toBeDisabled();
      
      // Verify they show "(required)" label
      const studioLabel = dropdown.locator('label:has-text("Studio")');
      const actionsLabel = dropdown.locator('label:has-text("Actions")');
      
      await expect(studioLabel).toContainText('(required)');
      await expect(actionsLabel).toContainText('(required)');
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-protected-columns.png',
        fullPage: true 
      });
    });
  });

  test.describe('Scaling Verification at Different Widths', () => {
    test('should verify scaling behavior across multiple widths', async ({ page }) => {
      await clearColumnPreferences(page);
      
      const viewportWidths = [1920, 1600, 1400, 1200, 1024];
      
      for (const width of viewportWidths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('http://localhost:3000/admin/studios');
        
        // Wait for table to load
        await page.waitForSelector('table', { timeout: 10000 });
        await page.waitForTimeout(500);
        
        // Check table is visible
        const table = page.locator('table');
        await expect(table).toBeVisible();
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/screenshots/studios-table-${width}px.png`,
          fullPage: true 
        });
        
        // Verify no horizontal scrollbar by checking overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          const container = document.querySelector('div.overflow-hidden');
          if (!container) return false;
          return container.scrollWidth > container.clientWidth;
        });
        
        expect(hasHorizontalScroll).toBe(false);
      }
    });
  });

  test.describe('Column Count Display', () => {
    test.use({ viewport: { width: 1400, height: 900 } });

    test('should update column count in filter button when columns are hidden', async ({ page }) => {
      await clearColumnPreferences(page);
      await page.goto('http://localhost:3000/admin/studios');
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(500);
      
      // Initial count should be 13/13
      const columnsButtonInitial = page.locator('button:has-text("13/13")');
      await expect(columnsButtonInitial).toBeVisible();
      
      // Open dropdown and hide a column
      await columnsButtonInitial.click();
      await page.waitForTimeout(300);
      
      const typeCheckbox = page.locator('label:has-text("Type") input[type="checkbox"]');
      await typeCheckbox.click();
      
      // Close dropdown
      await page.click('h1:has-text("Studio Management")');
      await page.waitForTimeout(300);
      
      // Count should now be 12/13
      const columnsButtonAfter = page.locator('button:has-text("12/13")');
      await expect(columnsButtonAfter).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/screenshots/studios-table-column-count-updated.png',
        fullPage: true 
      });
    });
  });
});
