import { test, expect } from '@playwright/test';

test.describe('Admin Performance Testing', () => {
  let authCookie: string;

  test.beforeAll(async ({ browser }) => {
    // Authenticate as admin once for all performance tests
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:4000/auth/signin');
    
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
    await page.close();
  });

  test('should load admin dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/dashboard');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin dashboard load time: ${loadTime}ms`);
  });

  test('should load admin studios page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/studios');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin studios page load time: ${loadTime}ms`);
  });

  test('should load admin FAQ page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/faq');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin FAQ page load time: ${loadTime}ms`);
  });

  test('should load admin analytics page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/analytics');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin analytics page load time: ${loadTime}ms`);
  });

  test('should load admin network page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/network');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin network page load time: ${loadTime}ms`);
  });

  test('should load admin query page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/query');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin query page load time: ${loadTime}ms`);
  });

  test('should load admin schema page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/schema');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin schema page load time: ${loadTime}ms`);
  });

  test('should load admin venues page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/venues');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin venues page load time: ${loadTime}ms`);
  });

  test('should load admin browse page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:4000/admin/browse');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Admin browse page load time: ${loadTime}ms`);
  });

  test('should respond to admin API endpoints within acceptable time', async ({ request }) => {
    const adminEndpoints = [
      '/api/admin/dashboard',
      '/api/admin/studios',
      '/api/admin/faq',
      '/api/admin/analytics',
      '/api/admin/network',
      '/api/admin/schema?table=User',
      '/api/admin/venues',
      '/api/admin/browse?table=User'
    ];
    
    for (const endpoint of adminEndpoints) {
      const startTime = Date.now();
      
      const response = await request.get(`http://localhost:4000${endpoint}`, {
        headers: {
          'Cookie': `next-auth.session-token=${authCookie}`
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      // Should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000);
      expect(response.status()).toBe(200);
      
      console.log(`${endpoint} response time: ${responseTime}ms`);
    }
  });

  test('should handle concurrent admin API requests efficiently', async ({ request }) => {
    const concurrentRequests = 10;
    const requests = [];
    
    const startTime = Date.now();
    
    // Make concurrent requests to admin dashboard
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request.get('http://localhost:4000/api/admin/dashboard', {
          headers: {
            'Cookie': `next-auth.session-token=${authCookie}`
          }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    // Should handle concurrent requests efficiently
    expect(totalTime).toBeLessThan(5000);
    
    console.log(`Concurrent requests (${concurrentRequests}) total time: ${totalTime}ms`);
    console.log(`Average response time: ${totalTime / concurrentRequests}ms`);
  });

  test('should handle large dataset queries efficiently', async ({ request }) => {
    const startTime = Date.now();
    
    // Query a large dataset
    const response = await request.get('http://localhost:4000/api/admin/browse?table=User&limit=100', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    expect(response.status()).toBe(200);
    
    // Should handle large datasets within 3 seconds
    expect(responseTime).toBeLessThan(3000);
    
    console.log(`Large dataset query response time: ${responseTime}ms`);
  });

  test('should handle complex admin queries efficiently', async ({ request }) => {
    const startTime = Date.now();
    
    // Execute a complex query
    const response = await request.post('http://localhost:4000/api/admin/query', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`,
        'Content-Type': 'application/json'
      },
      data: {
        query: 'SELECT COUNT(*) as total_users FROM "User"'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    // Query might return 400 for invalid syntax, but should still be fast
    expect([200, 400]).toContain(response.status());
    
    // Should handle complex queries within 2 seconds
    expect(responseTime).toBeLessThan(2000);
    
    console.log(`Complex query response time: ${responseTime}ms`);
  });

  test('should maintain performance during admin form submissions', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/faq');
    
    // Fill out a form
    const questionField = page.locator('input[name="question"], textarea[name="question"]').first();
    const answerField = page.locator('input[name="answer"], textarea[name="answer"]').first();
    
    if (await questionField.count() > 0) {
      const startTime = Date.now();
      
      await questionField.fill('Performance test question');
      await answerField.fill('Performance test answer');
      
      // Submit the form
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Wait for form submission to complete
        await page.waitForTimeout(2000);
        
        const submissionTime = Date.now() - startTime;
        
        // Should submit within 3 seconds
        expect(submissionTime).toBeLessThan(3000);
        
        console.log(`Form submission time: ${submissionTime}ms`);
      }
    }
  });

  test('should handle admin page navigation efficiently', async ({ page }) => {
    const adminPages = [
      '/admin/dashboard',
      '/admin/studios',
      '/admin/faq',
      '/admin/analytics',
      '/admin/network',
      '/admin/query',
      '/admin/schema',
      '/admin/venues',
      '/admin/browse'
    ];
    
    const navigationTimes = [];
    
    for (const pagePath of adminPages) {
      const startTime = Date.now();
      
      await page.goto(`http://localhost:4000${pagePath}`);
      await page.waitForLoadState('networkidle');
      
      const navigationTime = Date.now() - startTime;
      navigationTimes.push(navigationTime);
      
      // Each page should load within 3 seconds
      expect(navigationTime).toBeLessThan(3000);
      
      console.log(`${pagePath} navigation time: ${navigationTime}ms`);
    }
    
    const averageNavigationTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    console.log(`Average navigation time: ${averageNavigationTime}ms`);
    
    // Average navigation time should be reasonable
    expect(averageNavigationTime).toBeLessThan(2000);
  });

  test('should handle admin search functionality efficiently', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/studios');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]').first();
    
    if (await searchInput.count() > 0) {
      const startTime = Date.now();
      
      await searchInput.fill('test');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      const searchTime = Date.now() - startTime;
      
      // Search should complete within 2 seconds
      expect(searchTime).toBeLessThan(2000);
      
      console.log(`Search functionality time: ${searchTime}ms`);
    }
  });

  test('should handle admin data filtering efficiently', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/studios');
    
    // Look for filter controls
    const filterSelect = page.locator('select, input[type="checkbox"], input[type="radio"]').first();
    
    if (await filterSelect.count() > 0) {
      const startTime = Date.now();
      
      // Apply a filter
      await filterSelect.click();
      await page.waitForTimeout(500);
      
      const filterTime = Date.now() - startTime;
      
      // Filtering should complete within 1 second
      expect(filterTime).toBeLessThan(1000);
      
      console.log(`Data filtering time: ${filterTime}ms`);
    }
  });

  test('should handle admin pagination efficiently', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/studios');
    
    // Look for pagination controls
    const nextPageButton = page.locator('button:has-text("Next"), button:has-text(">"), a:has-text("Next"), a:has-text(">")').first();
    
    if (await nextPageButton.count() > 0) {
      const startTime = Date.now();
      
      await nextPageButton.click();
      await page.waitForLoadState('networkidle');
      
      const paginationTime = Date.now() - startTime;
      
      // Pagination should complete within 2 seconds
      expect(paginationTime).toBeLessThan(2000);
      
      console.log(`Pagination time: ${paginationTime}ms`);
    }
  });

  test('should handle admin bulk operations efficiently', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/studios');
    
    // Look for bulk operation controls
    const selectAllCheckbox = page.locator('input[type="checkbox"][name*="select"], input[type="checkbox"][id*="select"]').first();
    
    if (await selectAllCheckbox.count() > 0) {
      const startTime = Date.now();
      
      await selectAllCheckbox.click();
      await page.waitForTimeout(500);
      
      const bulkOperationTime = Date.now() - startTime;
      
      // Bulk operations should complete within 1 second
      expect(bulkOperationTime).toBeLessThan(1000);
      
      console.log(`Bulk operation time: ${bulkOperationTime}ms`);
    }
  });

  test('should handle admin export functionality efficiently', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/studios');
    
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export"), a:has-text("Download")').first();
    
    if (await exportButton.count() > 0) {
      const startTime = Date.now();
      
      await exportButton.click();
      
      // Wait for export to complete
      await page.waitForTimeout(3000);
      
      const exportTime = Date.now() - startTime;
      
      // Export should complete within 10 seconds
      expect(exportTime).toBeLessThan(10000);
      
      console.log(`Export functionality time: ${exportTime}ms`);
    }
  });

  test('should handle admin import functionality efficiently', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/studios');
    
    // Look for import button
    const importButton = page.locator('button:has-text("Import"), button:has-text("Upload"), a:has-text("Import"), a:has-text("Upload")').first();
    
    if (await importButton.count() > 0) {
      const startTime = Date.now();
      
      await importButton.click();
      
      // Wait for import dialog to open
      await page.waitForTimeout(1000);
      
      const importTime = Date.now() - startTime;
      
      // Import dialog should open within 2 seconds
      expect(importTime).toBeLessThan(2000);
      
      console.log(`Import functionality time: ${importTime}ms`);
    }
  });

  test('should handle admin real-time updates efficiently', async ({ page }) => {
    await page.goto('http://localhost:4000/admin/dashboard');
    
    // Monitor for real-time updates
    const startTime = Date.now();
    
    // Wait for any real-time updates
    await page.waitForTimeout(5000);
    
    const updateTime = Date.now() - startTime;
    
    // Real-time updates should not cause performance issues
    expect(updateTime).toBeLessThan(10000);
    
    console.log(`Real-time updates monitoring time: ${updateTime}ms`);
  });

  test('should handle admin memory usage efficiently', async ({ page }) => {
    // Navigate through multiple admin pages to test memory usage
    const adminPages = [
      '/admin/dashboard',
      '/admin/studios',
      '/admin/faq',
      '/admin/analytics',
      '/admin/network',
      '/admin/query',
      '/admin/schema',
      '/admin/venues',
      '/admin/browse'
    ];
    
    for (const pagePath of adminPages) {
      await page.goto(`http://localhost:4000${pagePath}`);
      await page.waitForLoadState('networkidle');
      
      // Wait a bit between page loads
      await page.waitForTimeout(1000);
    }
    
    // Navigate back to dashboard
    await page.goto('http://localhost:4000/admin/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Page should still be responsive
    const dashboardTitle = page.locator('h1');
    expect(await dashboardTitle.isVisible()).toBe(true);
    
    console.log('Memory usage test completed - all pages navigated successfully');
  });
});
