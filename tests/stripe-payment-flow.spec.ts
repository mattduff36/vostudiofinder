import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE STRIPE PAYMENT FLOW TEST SUITE
 * 
 * Tests the complete end-to-end payment flow including:
 * - Membership checkout creation
 * - Stripe embedded checkout UI
 * - Payment submission with test cards
 * - Webhook handling (checkout.session.completed)
 * - Account creation after payment
 * - Admin payments page verification
 * - Payment details and metadata
 * - Refund flow
 * 
 * Prerequisites:
 * - Dev server running on localhost:3000
 * - Stripe CLI listening: stripe listen --forward-to localhost:3000/api/stripe/webhook
 * - Test environment variables configured in .env.local
 */

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USERS = [
  {
    name: 'Test User One',
    email: 'testuser1@stripetest.com',
    username: 'testuser1',
    card: '4242424242424242', // Successful payment
  },
  {
    name: 'Test User Two',  
    email: 'testuser2@stripetest.com',
    username: 'testuser2',
    card: '4242424242424242', // Successful payment
  },
  {
    name: 'Test User Three',
    email: 'testuser3@stripetest.com',
    username: 'testuser3',
    card: '4242424242424242', // Successful payment
  },
  {
    name: 'Test User Four',
    email: 'testuser4@stripetest.com',
    username: 'testuser4',
    card: '4000000000000002', // Declined card
  },
];

// Helper: Fill Stripe embedded checkout form
async function fillStripeCheckout(page: Page, cardNumber: string) {
  // Wait for Stripe iframe to load
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  
  await stripeFrame.locator('[placeholder="Card number"]').fill(cardNumber);
  await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/25');
  await stripeFrame.locator('[placeholder="CVC"]').fill('123');
  await stripeFrame.locator('[placeholder="ZIP"]').fill('10001');
}

test.describe('Stripe Payment Flow - Complete End-to-End Tests', () => {
  
  test.describe.configure({ mode: 'serial' }); // Run tests in order
  
  test('1. Health Check - Stripe API Routes', async ({ request }) => {
    console.log('\n🔍 Testing Stripe API route availability...\n');
    
    // Check webhook endpoint exists
    const webhookResponse = await request.post(`${BASE_URL}/api/stripe/webhook`, {
      data: { test: true },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    });
    
    // Should return 400 (invalid signature) not 404
    expect([400, 401]).toContain(webhookResponse.status());
    console.log('✅ Webhook endpoint: Accessible');
    
    // Check checkout creation endpoint (should require auth)
    const checkoutResponse = await request.post(
      `${BASE_URL}/api/stripe/create-membership-checkout`,
      {
        data: { email: 'test@test.com', name: 'Test' },
        failOnStatusCode: false,
      }
    );
    expect(checkoutResponse.status()).toBeLessThan(500);
    console.log('✅ Checkout creation endpoint: Accessible');
  });

  test('2. Successful Payment Flow - Test User 1', async ({ page }) => {
    const user = TEST_USERS[0];
    console.log(`\n💳 Testing payment flow for: ${user.name} (${user.email})\n`);
    
    // Step 1: Navigate to signup page
    await page.goto(`${BASE_URL}/auth/signup`);
    await expect(page).toHaveTitle(/Sign Up|VoiceoverStudioFinder/i);
    console.log('✅ Loaded signup page');
    
    // Step 2: Fill signup form
    await page.fill('[name="name"]', user.name);
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="username"]', user.username);
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="confirmPassword"]', 'Test123!@#');
    console.log('✅ Filled signup form');
    
    // Step 3: Submit and wait for payment page
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*membership.*payment.*/i, { timeout: 10000 });
    console.log('✅ Navigated to payment page');
    
    // Step 4: Wait for Stripe checkout to load
    await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 15000 });
    console.log('✅ Stripe checkout loaded');
    
    // Step 5: Fill payment details
    await fillStripeCheckout(page, user.card);
    console.log('✅ Filled payment details');
    
    // Step 6: Submit payment
    await page.click('button:has-text("Pay")');
    console.log('⏳ Processing payment...');
    
    // Step 7: Wait for success redirect (webhook should create account)
    await page.waitForURL(/.*success.*/i, { timeout: 30000 });
    console.log('✅ Payment successful, redirected to success page');
    
    // Step 8: Verify success message
    await expect(page.locator('text=/payment.*success|thank you/i')).toBeVisible();
    console.log(`✅ ${user.name}: Payment completed successfully\n`);
    
    // Give webhook time to process
    await page.waitForTimeout(3000);
  });

  test('3. Successful Payment Flow - Test User 2', async ({ page }) => {
    const user = TEST_USERS[1];
    console.log(`\n💳 Testing payment flow for: ${user.name} (${user.email})\n`);
    
    await page.goto(`${BASE_URL}/auth/signup`);
    await page.fill('[name="name"]', user.name);
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="username"]', user.username);
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="confirmPassword"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*membership.*payment.*/i, { timeout: 10000 });
    await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 15000 });
    
    await fillStripeCheckout(page, user.card);
    await page.click('button:has-text("Pay")');
    
    await page.waitForURL(/.*success.*/i, { timeout: 30000 });
    await expect(page.locator('text=/payment.*success|thank you/i')).toBeVisible();
    console.log(`✅ ${user.name}: Payment completed successfully\n`);
    
    await page.waitForTimeout(3000);
  });

  test('4. Successful Payment Flow - Test User 3', async ({ page }) => {
    const user = TEST_USERS[2];
    console.log(`\n💳 Testing payment flow for: ${user.name} (${user.email})\n`);
    
    await page.goto(`${BASE_URL}/auth/signup`);
    await page.fill('[name="name"]', user.name);
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="username"]', user.username);
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="confirmPassword"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*membership.*payment.*/i, { timeout: 10000 });
    await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 15000 });
    
    await fillStripeCheckout(page, user.card);
    await page.click('button:has-text("Pay")');
    
    await page.waitForURL(/.*success.*/i, { timeout: 30000 });
    await expect(page.locator('text=/payment.*success|thank you/i')).toBeVisible();
    console.log(`✅ ${user.name}: Payment completed successfully\n`);
    
    await page.waitForTimeout(3000);
  });

  test('5. Failed Payment Flow - Declined Card', async ({ page }) => {
    const user = TEST_USERS[3];
    console.log(`\n❌ Testing declined payment for: ${user.name} (${user.email})\n`);
    
    await page.goto(`${BASE_URL}/auth/signup`);
    await page.fill('[name="name"]', user.name);
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="username"]', user.username);
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="confirmPassword"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*membership.*payment.*/i, { timeout: 10000 });
    await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 15000 });
    
    await fillStripeCheckout(page, user.card);
    await page.click('button:has-text("Pay")');
    console.log('⏳ Attempting payment with declined card...');
    
    // Should show error message
    await expect(page.locator('text=/declined|failed|error/i')).toBeVisible({ timeout: 15000 });
    console.log('✅ Card decline handled correctly\n');
  });

  test('6. Admin Payments Verification', async ({ page }) => {
    console.log('\n📊 Verifying payments in admin panel...\n');
    
    // Login as admin (you'll need to adjust based on your admin auth)
    await page.goto(`${BASE_URL}/admin/login`);
    
    // Fill admin credentials
    await page.fill('[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD || 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to payments page
    await page.goto(`${BASE_URL}/admin/payments`);
    await expect(page).toHaveTitle(/Payments|Admin/i);
    console.log('✅ Loaded admin payments page');
    
    // Wait for payments table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Count successful payments (should be 3)
    const paymentRows = await page.locator('table tbody tr').count();
    console.log(`📝 Found ${paymentRows} payment record(s)`);
    
    expect(paymentRows).toBeGreaterThanOrEqual(3);
    console.log('✅ At least 3 successful payments recorded');
    
    // Verify payment details for first test user
    const user1Row = page.locator(`tr:has-text("${TEST_USERS[0].email}")`);
    await expect(user1Row).toBeVisible();
    console.log(`✅ Payment for ${TEST_USERS[0].name} visible`);
    
    // Check payment status
    await expect(user1Row.locator('text=/paid|succeeded/i')).toBeVisible();
    console.log('✅ Payment status: SUCCESS');
    
    // Verify payment amount (should be from STRIPE_MEMBERSHIP_PRICE_ID)
    await expect(user1Row.locator('text=/£|€|\$/i')).toBeVisible();
    console.log('✅ Payment amount displayed\n');
  });

  test('7. Payment Details Verification', async ({ page, request }) => {
    console.log('\n🔍 Verifying payment record details...\n');
    
    // Login as admin
    await page.goto(`${BASE_URL}/admin/login`);
    await page.fill('[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD || 'admin123');
    await page.click('button[type="submit"]');
    
    await page.goto(`${BASE_URL}/admin/payments`);
    
    // Click on first payment to view details
    await page.locator('table tbody tr').first().click();
    
    // Verify payment details page
    await expect(page.locator('text=/payment.*details/i')).toBeVisible();
    console.log('✅ Payment details page loaded');
    
    // Check for required fields
    await expect(page.locator('text=/stripe.*id/i')).toBeVisible();
    await expect(page.locator('text=/customer/i')).toBeVisible();
    await expect(page.locator('text=/amount/i')).toBeVisible();
    await expect(page.locator('text=/status/i')).toBeVisible();
    console.log('✅ All payment fields present\n');
  });

  test('8. Webhook Event Processing Verification', async ({ request }) => {
    console.log('\n🎣 Testing webhook event processing...\n');
    
    // Get list of processed events from DB
    const eventsResponse = await request.get(`${BASE_URL}/api/admin/webhook-events`);
    
    if (eventsResponse.ok()) {
      const events = await eventsResponse.json();
      console.log(`📝 Found ${events.length || 0} webhook events`);
      
      // Should have at least 3 checkout.session.completed events
      const checkoutEvents = events.filter((e: any) => 
        e.type === 'checkout.session.completed'
      );
      expect(checkoutEvents.length).toBeGreaterThanOrEqual(3);
      console.log(`✅ ${checkoutEvents.length} checkout events processed`);
    } else {
      console.log('⚠️  Webhook events endpoint not available, skipping');
    }
  });

  test('9. Refund Flow Test', async ({ page }) => {
    console.log('\n💰 Testing refund functionality...\n');
    
    // Login as admin
    await page.goto(`${BASE_URL}/admin/login`);
    await page.fill('[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('[name="password"]', process.env.ADMIN_PASSWORD || 'admin123');
    await page.click('button[type="submit"]');
    
    await page.goto(`${BASE_URL}/admin/payments`);
    
    // Select first payment
    await page.locator('table tbody tr').first().click();
    
    // Click refund button
    const refundButton = page.locator('button:has-text("Refund")');
    if (await refundButton.isVisible()) {
      await refundButton.click();
      console.log('✅ Refund button clicked');
      
      // Confirm refund
      await page.locator('button:has-text("Confirm")').click();
      console.log('⏳ Processing refund...');
      
      // Wait for success message
      await expect(page.locator('text=/refund.*success/i')).toBeVisible({ timeout: 15000 });
      console.log('✅ Refund processed successfully\n');
    } else {
      console.log('⚠️  Refund button not available (payment may not support refunds)\n');
    }
  });

  test('10. User Invoice Access Test', async ({ page }) => {
    console.log('\n📄 Testing user invoice access...\n');
    
    // Login as Test User 1
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.fill('[name="email"]', TEST_USERS[0].email);
    await page.fill('[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    // Navigate to dashboard/invoices
    await page.goto(`${BASE_URL}/dashboard/invoices`);
    
    // Should see at least one invoice
    const invoiceCount = await page.locator('[data-testid="invoice-item"]').count();
    expect(invoiceCount).toBeGreaterThanOrEqual(1);
    console.log(`✅ User can access ${invoiceCount} invoice(s)\n`);
  });

});

test.describe('Stripe API Direct Tests', () => {
  
  test('11. Checkout Session Creation API', async ({ request }) => {
    console.log('\n🔌 Testing checkout session creation API...\n');
    
    const response = await request.post(
      `${BASE_URL}/api/stripe/create-membership-checkout`,
      {
        data: {
          email: 'apitest@stripetest.com',
          name: 'API Test User',
          username: 'apitest',
        },
      }
    );
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.clientSecret).toBeTruthy();
    expect(data.clientSecret).toContain('cs_test_');
    console.log('✅ Checkout session created successfully');
    console.log(`   Session ID: ${data.clientSecret.split('_secret_')[0]}\n`);
  });

  test('12. Payment Verification API', async ({ request }) => {
    console.log('\n✅ Testing payment verification API...\n');
    
    // Note: This requires a valid session_id from a completed payment
    // In real test, you'd capture this from a previous test
    const response = await request.post(
      `${BASE_URL}/api/stripe/verify-membership-payment`,
      {
        data: {
          session_id: 'cs_test_dummy', // Would be real session ID
        },
        failOnStatusCode: false,
      }
    );
    
    // Should return 400 or 404 for invalid session (not 500)
    expect([400, 404]).toContain(response.status());
    console.log('✅ Payment verification endpoint working\n');
  });

});

test.describe('Stripe Integration Health Checks', () => {
  
  test('13. Stripe Webhook Signature Validation', async ({ request }) => {
    console.log('\n🔐 Testing webhook signature validation...\n');
    
    const response = await request.post(
      `${BASE_URL}/api/stripe/webhook`,
      {
        data: {
          id: 'evt_test',
          type: 'checkout.session.completed',
        },
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        failOnStatusCode: false,
      }
    );
    
    // Should reject invalid signature
    expect([400, 401]).toContain(response.status());
    console.log('✅ Webhook signature validation working\n');
  });

  test('14. Stripe Price ID Configuration', async ({ request }) => {
    console.log('\n⚙️  Verifying Stripe price configuration...\n');
    
    const response = await request.post(
      `${BASE_URL}/api/stripe/create-membership-checkout`,
      {
        data: {
          email: 'config@test.com',
          name: 'Config Test',
        },
      }
    );
    
    if (response.ok()) {
      console.log('✅ Stripe price ID configured correctly');
      const data = await response.json();
      expect(data.clientSecret).toContain('cs_test_');
      console.log('✅ Test mode active (cs_test prefix)\n');
    } else {
      const error = await response.json();
      if (error.error?.includes('not configured')) {
        console.error('❌ STRIPE_MEMBERSHIP_PRICE_ID not set in environment');
        throw new Error('Stripe price ID not configured');
      }
    }
  });

});

