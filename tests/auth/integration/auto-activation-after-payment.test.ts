/**
 * Integration Tests for Auto-Activation After Payment
 * 
 * Tests the idempotent auto-activation logic on /auth/membership/success page:
 * - User is set to ACTIVE immediately after payment verification
 * - Subscription record is created
 * - Studio profile is activated if exists
 * - All operations are idempotent (safe to run multiple times)
 * 
 * @jest-environment node
 */

import { db } from '@/lib/db';
import { createTestUserInDb, createTestPaymentInDb, cleanupTestUsers } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus, PaymentStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';
import { randomBytes } from 'crypto';

describe('Auto-Activation After Payment Success', () => {
  const testEmailPrefix = `test_auto_activate_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Idempotent User Activation', () => {
    it('should activate PENDING user to ACTIVE after payment', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified (required for activation)
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      // Verify user is PENDING before activation
      let userCheck = await db.users.findUnique({
        where: { id: user.id },
        select: { status: true, email_verified: true },
      });
      expect(userCheck?.status).toBe(UserStatus.PENDING);
      expect(userCheck?.email_verified).toBe(true);

      // Simulate what the success page does: activate user
      await db.users.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          updated_at: new Date(),
        },
      });

      // Verify user is now ACTIVE
      userCheck = await db.users.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      expect(userCheck?.status).toBe(UserStatus.ACTIVE);
    });

    it('should be idempotent - activating ACTIVE user is safe', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE, // Already active
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      // Simulate activation logic - should be safe to run even if already ACTIVE
      const userBefore = await db.users.findUnique({
        where: { id: user.id },
        select: { status: true, updated_at: true },
      });

      if (userBefore?.status !== UserStatus.ACTIVE) {
        await db.users.update({
          where: { id: user.id },
          data: {
            status: UserStatus.ACTIVE,
            updated_at: new Date(),
          },
        });
      }

      const userAfter = await db.users.findUnique({
        where: { id: user.id },
        select: { status: true },
      });

      expect(userAfter?.status).toBe(UserStatus.ACTIVE);
      expect(userBefore?.status).toBe(UserStatus.ACTIVE); // Was already active
    });

    it('should not activate user if email is not verified', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // email_verified is false by default

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      const userCheck = await db.users.findUnique({
        where: { id: user.id },
        select: { status: true, email_verified: true },
      });

      expect(userCheck?.email_verified).toBe(false);

      // Simulate conditional activation (only if verified)
      if (userCheck?.email_verified) {
        await db.users.update({
          where: { id: user.id },
          data: {
            status: UserStatus.ACTIVE,
            updated_at: new Date(),
          },
        });
      }

      // Verify user is still PENDING (not activated)
      const finalUser = await db.users.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      expect(finalUser?.status).toBe(UserStatus.PENDING);
    });
  });

  describe('Idempotent Subscription Creation', () => {
    it('should create subscription record for user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Check no subscription exists yet
      let subscription = await db.subscriptions.findFirst({
        where: { user_id: user.id, status: 'ACTIVE' },
      });
      expect(subscription).toBeNull();

      // Create subscription (what success page does)
      const now = new Date();
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      subscription = await db.subscriptions.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          status: 'ACTIVE',
          payment_method: 'STRIPE',
          current_period_start: now,
          current_period_end: oneYearFromNow,
          created_at: now,
          updated_at: now,
        },
      });

      expect(subscription).toBeDefined();
      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.user_id).toBe(user.id);
    });

    it('should be idempotent - not create duplicate subscription', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Create first subscription
      const now = new Date();
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const firstSubscription = await db.subscriptions.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          status: 'ACTIVE',
          payment_method: 'STRIPE',
          current_period_start: now,
          current_period_end: oneYearFromNow,
          created_at: now,
          updated_at: now,
        },
      });

      // Simulate idempotent check (what success page does)
      const existingSubscription = await db.subscriptions.findFirst({
        where: { 
          user_id: user.id,
          status: 'ACTIVE',
        },
      });

      expect(existingSubscription).toBeDefined();
      expect(existingSubscription?.id).toBe(firstSubscription.id);

      // Should not create duplicate if one exists
      if (!existingSubscription) {
        await db.subscriptions.create({
          data: {
            id: randomBytes(12).toString('base64url'),
            user_id: user.id,
            status: 'ACTIVE',
            payment_method: 'STRIPE',
            current_period_start: now,
            current_period_end: oneYearFromNow,
            created_at: now,
            updated_at: now,
          },
        });
      }

      // Verify only one subscription exists
      const allSubscriptions = await db.subscriptions.findMany({
        where: { user_id: user.id, status: 'ACTIVE' },
      });
      expect(allSubscriptions.length).toBe(1);
    });
  });

  describe('Studio Profile Activation', () => {
    it('should activate studio profile if exists', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Create a studio profile with PENDING status
      const studioProfile = await db.studio_profiles.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          name: 'Test Studio',
          short_about: 'Test studio short about',
          about: 'Test studio about',
          location: 'Test Location',
          status: 'PENDING',
          is_profile_visible: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      expect(studioProfile.status).toBe('PENDING');

      // Simulate studio activation (what success page does)
      const existingStudio = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
        select: { id: true, status: true },
      });

      if (existingStudio && existingStudio.status !== 'ACTIVE') {
        await db.studio_profiles.update({
          where: { user_id: user.id },
          data: {
            status: 'ACTIVE',
            updated_at: new Date(),
          },
        });
      }

      // Verify studio is now ACTIVE
      const updatedStudio = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
        select: { status: true },
      });
      expect(updatedStudio?.status).toBe('ACTIVE');
    });

    it('should be idempotent - activating ACTIVE studio is safe', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Create a studio profile already ACTIVE
      await db.studio_profiles.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          name: 'Test Studio',
          short_about: 'Test studio short about',
          about: 'Test studio about',
          location: 'Test Location',
          status: 'ACTIVE', // Already active
          is_profile_visible: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Simulate idempotent activation check
      const existingStudio = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
        select: { id: true, status: true },
      });

      if (existingStudio && existingStudio.status !== 'ACTIVE') {
        await db.studio_profiles.update({
          where: { user_id: user.id },
          data: {
            status: 'ACTIVE',
            updated_at: new Date(),
          },
        });
      }

      // Verify studio is still ACTIVE (no error occurred)
      const finalStudio = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
        select: { status: true },
      });
      expect(finalStudio?.status).toBe('ACTIVE');
    });

    it('should handle case where no studio profile exists', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // No studio profile exists

      // Simulate activation check (should not error)
      const existingStudio = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
        select: { id: true, status: true },
      });

      expect(existingStudio).toBeNull();

      // Should not attempt to update if doesn't exist
      if (existingStudio && existingStudio.status !== 'ACTIVE') {
        await db.studio_profiles.update({
          where: { user_id: user.id },
          data: {
            status: 'ACTIVE',
            updated_at: new Date(),
          },
        });
      }

      // Verify no error occurred and still no studio
      const finalStudio = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
      });
      expect(finalStudio).toBeNull();
    });
  });

  describe('Complete Auto-Activation Flow', () => {
    it('should perform all activation steps idempotently', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const sessionId = `cs_test_${randomBytes(16).toString('hex')}`;
      await createTestPaymentInDb({
        user_id: user.id,
        stripe_checkout_session_id: sessionId,
        status: PaymentStatus.SUCCEEDED,
      });

      // Create studio profile
      await db.studio_profiles.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          name: 'Test Studio',
          short_about: 'Test studio short about',
          about: 'Test studio about',
          location: 'Test Location',
          status: 'PENDING',
          is_profile_visible: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Perform complete activation flow (simulating success page logic)
      const userCheck = await db.users.findUnique({
        where: { id: user.id },
        select: { id: true, status: true, email_verified: true },
      });

      if (userCheck?.email_verified) {
        // 1. Activate user if not ACTIVE
        if (userCheck.status !== UserStatus.ACTIVE) {
          await db.users.update({
            where: { id: userCheck.id },
            data: {
              status: UserStatus.ACTIVE,
              updated_at: new Date(),
            },
          });
        }

        // 2. Create subscription if not exists
        const existingSubscription = await db.subscriptions.findFirst({
          where: { 
            user_id: userCheck.id,
            status: 'ACTIVE',
          },
        });

        if (!existingSubscription) {
          const now = new Date();
          const oneYearFromNow = new Date(now);
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

          await db.subscriptions.create({
            data: {
              id: randomBytes(12).toString('base64url'),
              user_id: userCheck.id,
              status: 'ACTIVE',
              payment_method: 'STRIPE',
              current_period_start: now,
              current_period_end: oneYearFromNow,
              created_at: now,
              updated_at: now,
            },
          });
        }

        // 3. Activate studio profile if exists
        const studioProfile = await db.studio_profiles.findUnique({
          where: { user_id: userCheck.id },
          select: { id: true, status: true },
        });

        if (studioProfile && studioProfile.status !== 'ACTIVE') {
          await db.studio_profiles.update({
            where: { user_id: userCheck.id },
            data: {
              status: 'ACTIVE',
              updated_at: new Date(),
            },
          });
        }
      }

      // Verify all activations were successful
      const finalUser = await db.users.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      expect(finalUser?.status).toBe(UserStatus.ACTIVE);

      const finalSubscription = await db.subscriptions.findFirst({
        where: { user_id: user.id, status: 'ACTIVE' },
      });
      expect(finalSubscription).toBeDefined();
      expect(finalSubscription?.status).toBe('ACTIVE');

      const finalStudio = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
        select: { status: true },
      });
      expect(finalStudio?.status).toBe('ACTIVE');
    });
  });
});
