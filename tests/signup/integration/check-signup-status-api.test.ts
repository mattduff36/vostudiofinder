/**
 * Integration Tests for /api/auth/check-signup-status
 * 
 * Tests signup status check endpoint including:
 * - PENDING user status checks
 * - Resume step determination
 * - Expired reservation handling
 * - ACTIVE user handling
 * - EXPIRED user handling
 */

import { POST } from '@/app/api/auth/check-signup-status/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers, getUserByEmail, createTestPaymentInDb } from '../__helpers__/test-db';
import { createPendingUserData, createExpiredUserData, createActiveUserData, generateTestEmail } from '../__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../__helpers__/test-db';

describe('POST /api/auth/check-signup-status', () => {
  const testEmailPrefix = `test_check_status_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Non-existent User', () => {
    it('should return canResume: false for non-existent email', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(false);
      expect(data.message).toContain('No account found');
    });
  });

  describe('PENDING User Status', () => {
    it('should return canResume: true for PENDING user without username', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      
      await createTestUserInDb({
        ...createPendingUserData({ email }),
        reservation_expires_at: reservationExpires,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.resumeStep).toBe('username');
      expect(data.hasUsername).toBe(false);
      expect(data.hasPayment).toBe(false);
      expect(data.timeRemaining).toBeDefined();
      expect(data.timeRemaining.days).toBeGreaterThanOrEqual(0);
    });

    it('should return resumeStep: payment for PENDING user with username', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      const uniqueUsername = `testusername_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      await createTestUserInDb({
        ...createPendingUserData({ email }),
        username: uniqueUsername,
        reservation_expires_at: reservationExpires,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.resumeStep).toBe('payment');
      expect(data.hasUsername).toBe(true);
      expect(data.hasPayment).toBe(false);
    });

    it('should return resumeStep: profile for PENDING user with payment', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      const uniqueUsername = `testusername_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
        username: uniqueUsername,
        reservation_expires_at: reservationExpires,
      });

      await createTestPaymentInDb({
        user_id: user.id,
        status: 'SUCCEEDED',
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.resumeStep).toBe('profile');
      expect(data.hasUsername).toBe(true);
      expect(data.hasPayment).toBe(true);
      expect(data.sessionId).toBeDefined();
    });

    it('should calculate time remaining correctly', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 2);
      reservationExpires.setHours(reservationExpires.getHours() + 12);
      
      await createTestUserInDb({
        ...createPendingUserData({ email }),
        reservation_expires_at: reservationExpires,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeRemaining.days).toBe(2);
      expect(data.timeRemaining.hours).toBeGreaterThanOrEqual(11);
      expect(data.timeRemaining.total).toBeGreaterThan(0);
    });

    it('should mark PENDING user as EXPIRED if reservation expired', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      await createTestUserInDb({
        ...createPendingUserData({ email }),
        reservation_expires_at: expiredDate,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(false);
      expect(data.message).toContain('expired');

      // Verify user was marked as EXPIRED
      const user = await getUserByEmail(email);
      expect(user?.status).toBe(UserStatus.EXPIRED);
    });
  });

  describe('ACTIVE User Handling', () => {
    it('should return canResume: false for ACTIVE user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      await createTestUserInDb({
        ...createActiveUserData({ email }),
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.canResume).toBe(false);
      expect(data.error).toContain('already exists');
      expect(data.isActive).toBe(true);
    });
  });

  describe('EXPIRED User Handling', () => {
    it('should return canResume: false for EXPIRED user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      await createTestUserInDb({
        ...createExpiredUserData({ email }),
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(false);
      expect(data.message).toContain('expired');
    });
  });

  describe('Validation', () => {
    it('should reject missing email', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject empty email string', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email: '',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle email case insensitivity', async () => {
      const baseEmail = generateTestEmail(testEmailPrefix);
      const emailUpper = baseEmail.toUpperCase();
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      
      await createTestUserInDb({
        ...createPendingUserData({ email: baseEmail }),
        reservation_expires_at: reservationExpires,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email: emailUpper,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with temp_ username correctly', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      
      await createTestUserInDb({
        ...createPendingUserData({ email }),
        username: 'temp_abc123',
        reservation_expires_at: reservationExpires,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.resumeStep).toBe('username');
      expect(data.hasUsername).toBe(false); // temp_ username doesn't count
    });

    it('should handle user with multiple payments (return latest)', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      
      const uniqueUsername = `testusername_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
        username: uniqueUsername,
        reservation_expires_at: reservationExpires,
      });

      // Create multiple payments
      await createTestPaymentInDb({
        user_id: user.id,
        status: 'FAILED',
        stripe_checkout_session_id: 'cs_failed_1',
      });

      await createTestPaymentInDb({
        user_id: user.id,
        status: 'SUCCEEDED',
        stripe_checkout_session_id: 'cs_success_1',
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasPayment).toBe(true);
      expect(data.sessionId).toBe('cs_success_1');
    });

    it('should handle user with failed payment (should not count)', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      
      const uniqueUsername = `testusername_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
        username: uniqueUsername,
        reservation_expires_at: reservationExpires,
      });

      await createTestPaymentInDb({
        user_id: user.id,
        status: 'FAILED',
      });

      const request = new NextRequest('http://localhost:4000/api/auth/check-signup-status', {
        method: 'POST',
        body: JSON.stringify({
          email,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.hasPayment).toBe(false);
      expect(data.resumeStep).toBe('payment');
    });
  });
});

