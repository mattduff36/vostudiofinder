/**
 * Automated Route Testing Suite using native Node HTTP
 * Tests all public and API routes to ensure no broken links after cleanup
 */

import * as http from 'http';

interface TestResult {
  route: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
}

const results: TestResult[] = [];

// Test configuration
const BASE_URL = 'localhost';
const PORT = 3000;

// Routes to test
const PUBLIC_ROUTES = [
  '/',
  '/studios',
  '/about',
  '/privacy',
  '/terms',
  '/join-waitlist',
  '/auth/signin',
  '/auth/forgot-password',
];

const API_ROUTES_SHOULD_EXIST = [
  '/api/studios/search',
  '/api/user/profile',
  '/api/user/data-export',
  '/api/user/download-data',
  '/api/user/delete-account',
  '/api/user/close-account',
  '/api/admin/studios',
  '/api/consent',
  '/api/stripe/checkout',
  '/api/auth/session',
];

const API_ROUTES_SHOULD_NOT_EXIST = [
  '/api/network',
  '/api/messages',
  '/api/reviews',
  '/api/moderation/reports',
  '/api/user/notifications',
  '/api/user/saved-searches',
  '/api/user/connections',
  '/api/admin/refunds',
];

// Helper to test a route
function testRoute(route: string, shouldExist: boolean = true): Promise<TestResult> {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: route,
      method: 'GET',
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      const statusCode = res.statusCode || 0;

      if (shouldExist) {
        // Routes that should work
        if (statusCode === 200 || statusCode === 401 || statusCode === 405 || statusCode === 302) {
          // 200 = OK, 401 = Unauthorized, 405 = Method Not Allowed, 302 = Redirect
          resolve({ route, status: 'PASS', statusCode });
        } else if (statusCode === 404) {
          resolve({ route, status: 'FAIL', statusCode, error: 'Route should exist but returned 404' });
        } else {
          resolve({ route, status: 'FAIL', statusCode, error: `Unexpected status code: ${statusCode}` });
        }
      } else {
        // Routes that should NOT exist (deleted)
        if (statusCode === 404) {
          resolve({ route, status: 'PASS', statusCode });
        } else {
          resolve({ route, status: 'FAIL', statusCode, error: 'Route should be deleted but still exists' });
        }
      }
    });

    req.on('error', (error) => {
      resolve({ route, status: 'FAIL', error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ route, status: 'FAIL', error: 'Request timeout' });
    });

    req.end();
  });
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Starting Automated Route Test Suite...\n');
  console.log('⚙️  Configuration:');
  console.log(`   Base URL: http://${BASE_URL}:${PORT}\n`);

  // Check server is running
  try {
    const serverCheck = await testRoute('/', true);
    if (serverCheck.statusCode !== 200) {
      console.log('❌ Dev server is not responding correctly.\n');
      process.exit(1);
    }
    console.log('✅ Dev server is running and responding!\n');
  } catch (error) {
    console.log('❌ Could not connect to dev server.\n');
    process.exit(1);
  }

  console.log('─────────────────────────────────────────\n');

  // Test 1: Public routes should exist and load
  console.log('📄 Testing PUBLIC ROUTES (should exist)...\n');
  for (const route of PUBLIC_ROUTES) {
    const result = await testRoute(route, true);
    results.push(result);
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${route.padEnd(30)} - ${result.statusCode || 'N/A'} ${result.error || ''}`);
  }

  console.log('\n─────────────────────────────────────────\n');

  // Test 2: API routes that should exist
  console.log('🔌 Testing API ROUTES (should exist)...\n');
  for (const route of API_ROUTES_SHOULD_EXIST) {
    const result = await testRoute(route, true);
    results.push(result);
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${route.padEnd(30)} - ${result.statusCode || 'N/A'} ${result.error || ''}`);
  }

  console.log('\n─────────────────────────────────────────\n');

  // Test 3: Deleted API routes should return 404
  console.log('🗑️  Testing DELETED ROUTES (should return 404)...\n');
  for (const route of API_ROUTES_SHOULD_NOT_EXIST) {
    const result = await testRoute(route, false);
    results.push(result);
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${route.padEnd(30)} - ${result.statusCode || 'N/A'} ${result.error || ''}`);
  }

  console.log('\n─────────────────────────────────────────\n');

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log('📊 TEST SUMMARY:\n');
  console.log(`   Total Tests: ${total}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   ${r.route}`);
      console.log(`      Status: ${r.statusCode || 'N/A'}`);
      console.log(`      Error: ${r.error || 'Unknown'}\n`);
    });
    console.log('⚠️  Note: Some failures may be expected (e.g., auth-protected routes).\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Site is healthy.\n');
    console.log('🎉 No broken links detected after cleanup!\n');
    process.exit(0);
  }
}

// Run the test suite
runTests().catch((error) => {
  console.error('\n❌ Test suite failed with error:');
  console.error(error);
  process.exit(1);
});

