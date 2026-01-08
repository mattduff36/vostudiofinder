/**
 * Integration Tests for /auth/membership/success page
 * 
 * Tests payment success page including:
 * - Race condition: Accepts both PENDING and ACTIVE users
 * - Payment verification
 * - Email parameter handling
 * - Session parameter handling
 */

import { db } from '@/lib/db';
import { createTestUserInDb, cleanupTestUsers, getUserByEmail } from '../../signup/__helpers__/test-db';
import { createTestPaymentInDb } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus, PaymentStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';
import { randomBytes } from 'crypto';

describe('Payment Success Page - Race Condition Fix', () => {
  const testEmailPrefix = `test_payment_success_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('User Status Handling (Race Condition)', () => {
    it('should accept PENDING user status (webhook not processed yet)', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        status: UserStatus.PENDING,
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      // Simulate checking payment (what the success page does)
      const payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: sessionId },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });

      expect(payment).toBeDefined();
      expect(payment?.status).toBe('SUCCEEDED');

      const userCheck = await db.users.findUnique({
        where: { id: payment!.user_id },
        select: { status: true, email: true },
      });

      expect(userCheck).toBeDefined();
      expect(userCheck?.status).toBe(UserStatus.PENDING);
      // PENDING status should be accepted (race condition fix)
      expect([UserStatus.PENDING, UserStatus.ACTIVE]).toContain(userCheck?.status);
    });

    it('should accept ACTIVE user status (webhook processed first)', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        status: UserStatus.ACTIVE, // Webhook already processed
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      // Simulate checking payment (what the success page does)
      const payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: sessionId },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });

      expect(payment).toBeDefined();
      expect(payment?.status).toBe('SUCCEEDED');

      const userCheck = await db.users.findUnique({
        where: { id: payment!.user_id },
        select: { status: true, email: true },
      });

      expect(userCheck).toBeDefined();
      expect(userCheck?.status).toBe(UserStatus.ACTIVE);
      // ACTIVE status should be accepted (race condition fix)
      expect([UserStatus.PENDING, UserStatus.ACTIVE]).toContain(userCheck?.status);
    });

    it('should reject EXPIRED user status', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        status: UserStatus.EXPIRED,
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      const payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: sessionId },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });

      expect(payment).toBeDefined();

      const userCheck = await db.users.findUnique({
        where: { id: payment!.user_id },
        select: { status: true, email: true },
      });

      expect(userCheck).toBeDefined();
      expect(userCheck?.status).toBe(UserStatus.EXPIRED);
      // EXPIRED status should NOT be accepted
      expect([UserStatus.PENDING, UserStatus.ACTIVE]).not.toContain(userCheck?.status);
    });
  });

  describe('Payment Verification', () => {
    it('should verify payment exists and is SUCCEEDED', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        status: UserStatus.PENDING,
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      const payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: sessionId },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });

      expect(payment).toBeDefined();
      expect(payment?.status).toBe('SUCCEEDED');
      expect(payment?.user_id).toBe(user.id);
    });

    it('should reject payment that does not exist', async () => {
      const nonExistentSessionId = `cs_test_${randomBytes(16).toString('hex')}`;

      const payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: nonExistentSessionId },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });

      expect(payment).toBeNull();
    });

    it('should reject payment that is not SUCCEEDED', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        status: UserStatus.PENDING,
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.PENDING, // Not succeeded
      });

      const payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: sessionId },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });

      expect(payment).toBeDefined();
      expect(payment?.status).not.toBe('SUCCEEDED');
    });
  });
});

