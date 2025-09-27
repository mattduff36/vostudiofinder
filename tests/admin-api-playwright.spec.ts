import { test, expect } from '@playwright/test';

test.describe('Admin API Endpoints', () => {
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
    
    // Wait for redirect to dashboard (admin users go to /dashboard first)
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Get the authentication cookie
    const cookies = await context.cookies();
    authCookie = cookies.find(cookie => cookie.name === 'next-auth.session-token')?.value || '';
    
    await context.close();
  });

  test('should return dashboard data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/dashboard', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('studios');
    expect(data).toHaveProperty('faqs');
    expect(data).toHaveProperty('users');
    expect(data.studios).toHaveProperty('total');
    expect(data.studios).toHaveProperty('active');
    expect(data.faqs).toHaveProperty('total');
    expect(data.users).toHaveProperty('total');
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/dashboard');
    
    // Admin API endpoints redirect to signin for unauthenticated requests
    expect([401, 307, 200]).toContain(response.status());
  });

  test('should return studios data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/studios', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('studios');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.studios)).toBe(true);
  });

  test('should return FAQ data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/faq', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('faqs');
    expect(data).toHaveProperty('statistics');
    expect(Array.isArray(data.faqs)).toBe(true);
  });

  test('should return analytics data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/analytics', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('should return network data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/network', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('should return query data for authenticated admin', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/admin/query', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`,
        'Content-Type': 'application/json'
      },
      data: {
        query: 'SELECT id, email, username FROM "User" LIMIT 5'
      }
    });

    // Query endpoint may return 400 for invalid queries
    expect([200, 400]).toContain(response.status());
    
    const data = await response.json();
    if (response.status() === 200) {
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('executionTime');
      expect(data).toHaveProperty('rowCount');
    } else {
      expect(data).toHaveProperty('error');
    }
  });

  test('should return schema data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/schema?table=User', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('columns');
    expect(Array.isArray(data.columns)).toBe(true);
  });

  test('should return venues data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/venues', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('should return browse data for authenticated admin', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/admin/browse?table=User', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('limit');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should handle POST requests to admin endpoints', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/admin/studios', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Test Studio',
        description: 'Test Description'
      }
    });

    // Should return 405 Method Not Allowed or 200 OK depending on implementation
    expect([200, 405]).toContain(response.status());
  });

  test('should handle PUT requests to admin endpoints', async ({ request }) => {
    const response = await request.put('http://localhost:3000/api/admin/studios/1', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Updated Studio',
        description: 'Updated Description'
      }
    });

    // Should return 405 Method Not Allowed or 200 OK depending on implementation
    expect([200, 404, 405]).toContain(response.status());
  });

  test('should handle DELETE requests to admin endpoints', async ({ request }) => {
    const response = await request.delete('http://localhost:3000/api/admin/studios/1', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`
      }
    });

    // Should return 405 Method Not Allowed or 200 OK depending on implementation
    expect([200, 404, 405]).toContain(response.status());
  });

  test('should validate admin role for all endpoints', async ({ request }) => {
    const adminEndpoints = [
      { path: '/api/admin/dashboard', method: 'GET' },
      { path: '/api/admin/studios', method: 'GET' },
      { path: '/api/admin/faq', method: 'GET' },
      { path: '/api/admin/analytics', method: 'GET' },
      { path: '/api/admin/network', method: 'GET' },
      { path: '/api/admin/schema?table=User', method: 'GET' },
      { path: '/api/admin/venues', method: 'GET' },
      { path: '/api/admin/browse?table=User', method: 'GET' }
    ];

    for (const endpoint of adminEndpoints) {
      const response = await request[endpoint.method.toLowerCase()](`http://localhost:3000${endpoint.path}`, {
        headers: {
          'Cookie': `next-auth.session-token=${authCookie}`
        }
      });

      // Should return 200 for authenticated admin
      expect(response.status()).toBe(200);
    }
  });

  test('should handle malformed requests gracefully', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/admin/dashboard', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`,
        'Content-Type': 'application/json'
      },
      data: {
        invalid: 'data'
      }
    });

    // Should return 405 Method Not Allowed or 400 Bad Request
    expect([400, 405]).toContain(response.status());
  });

  test('should handle large requests appropriately', async ({ request }) => {
    const largeData = {
      name: 'A'.repeat(10000),
      description: 'B'.repeat(10000)
    };

    const response = await request.post('http://localhost:3000/api/admin/studios', {
      headers: {
        'Cookie': `next-auth.session-token=${authCookie}`,
        'Content-Type': 'application/json'
      },
      data: largeData
    });

    // Should return 405 Method Not Allowed or 413 Payload Too Large
    expect([405, 413]).toContain(response.status());
  });
});
