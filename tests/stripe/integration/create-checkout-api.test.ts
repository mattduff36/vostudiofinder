/**
 * Integration Tests for /api/stripe/create-membership-checkout
 * 
 * Tests Stripe checkout creation including:
 * - Return URL includes email parameter (critical bug fix)
 * - Checkout session creation
 * - Metadata propagation
 * 
 * @jest-environment node
 */

import { POST } from '@/app/api/stripe/create-membership-checkout/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));

describe('POST /api/stripe/create-membership-checkout', () => {
  const testEmailPrefix = `test_checkout_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Email Verification Check (Critical Security)', () => {
    it('should reject checkout for unverified email', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // User is not email_verified (default from createTestUserInDb)

      const request = new NextRequest('http://localhost:4000/api/stripe/create-membership-checkout', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          email: email,
          name: 'Test User',
          username: 'testuser',
        }),
      });

      process.env.NEXTAUTH_URL = 'http://localhost:4000';
      process.env.STRIPE_MEMBERSHIP_PRICE_ID = 'price_test_123';

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Email must be verified');
      expect(data.verified).toBe(false);
    });

    it('should allow checkout for verified email', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const { stripe } = await import('@/lib/stripe');
      const mockCreate = stripe.checkout.sessions.create as jest.Mock;
      
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        client_secret: 'cs_test_secret_123',
      });

      const request = new NextRequest('http://localhost:4000/api/stripe/create-membership-checkout', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          email: email,
          name: 'Test User',
          username: 'testuser',
        }),
      });

      process.env.NEXTAUTH_URL = 'http://localhost:4000';
      process.env.STRIPE_MEMBERSHIP_PRICE_ID = 'price_test_123';

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should return 404 for non-existent user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const fakeUserId = 'non_existent_user_id';

      const request = new NextRequest('http://localhost:4000/api/stripe/create-membership-checkout', {
        method: 'POST',
        body: JSON.stringify({
          userId: fakeUserId,
          email: email,
          name: 'Test User',
          username: 'testuser',
        }),
      });

      process.env.NEXTAUTH_URL = 'http://localhost:4000';
      process.env.STRIPE_MEMBERSHIP_PRICE_ID = 'price_test_123';

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('User not found');
    });
  });

  describe('Return URL Email Parameter (Critical Bug Fix)', () => {
    it('should include email parameter in return URL', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const { stripe } = await import('@/lib/stripe');
      const mockCreate = stripe.checkout.sessions.create as jest.Mock;
      
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        client_secret: 'cs_test_secret_123',
      });

      const request = new NextRequest('http://localhost:4000/api/stripe/create-membership-checkout', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          email: email,
          name: 'Test User',
          username: 'testuser',
        }),
      });

      // Mock environment variables
      process.env.NEXTAUTH_URL = 'http://localhost:4000';
      process.env.STRIPE_MEMBERSHIP_PRICE_ID = 'price_test_123';

      await POST(request);

      // Verify create was called
      expect(mockCreate).toHaveBeenCalled();

      // Get the call arguments
      const createCallArgs = mockCreate.mock.calls[0][0];

      // Verify return_url includes email parameter
      expect(createCallArgs.return_url).toBeDefined();
      expect(createCallArgs.return_url).toContain('session_id={CHECKOUT_SESSION_ID}');
      expect(createCallArgs.return_url).toContain(`email=${encodeURIComponent(email)}`);
      
      // Verify email is properly URL encoded
      const url = new URL(createCallArgs.return_url, 'http://localhost:4000');
      const emailParam = url.searchParams.get('email');
      expect(emailParam).toBe(email);
    });

    it('should properly encode email with special characters in return URL', async () => {
      const email = 'test+user@example.com'; // Email with special character
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const { stripe } = await import('@/lib/stripe');
      const mockCreate = stripe.checkout.sessions.create as jest.Mock;
      
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        client_secret: 'cs_test_secret_123',
      });

      const request = new NextRequest('http://localhost:4000/api/stripe/create-membership-checkout', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          email: email,
          name: 'Test User',
          username: 'testuser',
        }),
      });

      process.env.NEXTAUTH_URL = 'http://localhost:4000';
      process.env.STRIPE_MEMBERSHIP_PRICE_ID = 'price_test_123';

      await POST(request);

      const createCallArgs = mockCreate.mock.calls[0][0];
      
      // Verify email is properly encoded (e.g., + becomes %2B)
      expect(createCallArgs.return_url).toContain(encodeURIComponent(email));
      
      // Verify we can decode it back correctly
      const url = new URL(createCallArgs.return_url, 'http://localhost:4000');
      const emailParam = url.searchParams.get('email');
      expect(emailParam).toBe(email);
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with correct metadata', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const { stripe } = await import('@/lib/stripe');
      const mockCreate = stripe.checkout.sessions.create as jest.Mock;
      
      mockCreate.mockResolvedValue({
        id: 'cs_test_123',
        client_secret: 'cs_test_secret_123',
      });

      const request = new NextRequest('http://localhost:4000/api/stripe/create-membership-checkout', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          email: email,
          name: 'Test User',
          username: 'testuser',
        }),
      });

      process.env.NEXTAUTH_URL = 'http://localhost:4000';
      process.env.STRIPE_MEMBERSHIP_PRICE_ID = 'price_test_123';

      await POST(request);

      const createCallArgs = mockCreate.mock.calls[0][0];

      // Verify metadata
      expect(createCallArgs.metadata).toBeDefined();
      expect(createCallArgs.metadata.user_id).toBe(user.id);
      expect(createCallArgs.metadata.user_email).toBe(email);
      expect(createCallArgs.metadata.user_name).toBe('Test User');
      expect(createCallArgs.metadata.user_username).toBe('testuser');
      expect(createCallArgs.metadata.purpose).toBe('membership');

      // Verify payment intent metadata (for webhook processing)
      expect(createCallArgs.payment_intent_data).toBeDefined();
      expect(createCallArgs.payment_intent_data.metadata).toBeDefined();
      expect(createCallArgs.payment_intent_data.metadata.user_id).toBe(user.id);
      expect(createCallArgs.payment_intent_data.metadata.user_email).toBe(email);
    });
  });
});

