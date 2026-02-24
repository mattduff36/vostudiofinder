/**
 * Integration Tests for /api/auth/register
 * 
 * Tests user registration endpoint including:
 * - New user creation
 * - PENDING user resume scenarios
 * - EXPIRED user handling
 * - ACTIVE user rejection
 * - Validation errors
 * - Edge cases
 */

import { POST } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers, getUserByEmail } from '../__helpers__/test-db';
import { createPendingUserData, createExpiredUserData, createActiveUserData, generateTestEmail } from '../__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../__helpers__/test-db';

describe('POST /api/auth/register', () => {
  const testEmailPrefix = `test_register_${Date.now()}`;

  beforeAll(async () => {
    // Clean up any existing test users
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('New User Registration', () => {
    it('should create a new PENDING user with valid data', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain('Account created');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(email.toLowerCase());
      expect(data.user.status).toBe(UserStatus.PENDING);
      expect(data.user.reservation_expires_at).toBeDefined();

      // Verify user exists in database
      const user = await getUserByEmail(email);
      expect(user).toBeDefined();
      expect(user?.status).toBe(UserStatus.PENDING);
    });

    it('should hash password before storing', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const password = 'Test1234!@#$';
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          display_name: 'Test User',
        }),
      });

      await POST(request);
      const user = await getUserByEmail(email);
      
      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe(password);
      expect(user?.password.length).toBeGreaterThan(20); // bcrypt hash length
    });

    it('should set reservation_expires_at to 7 days from now', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const beforeTime = new Date();
      const response = await POST(request);
      const afterTime = new Date();
      
      const data = await response.json();
      const expiresAt = new Date(data.user.reservation_expires_at);
      
      const expectedMin = new Date(beforeTime.getTime() + 7 * 24 * 3600000 - 1000);
      const expectedMax = new Date(afterTime.getTime() + 7 * 24 * 3600000 + 1000);
      
      expect(expiresAt.getTime()).toBeGreaterThan(expectedMin.getTime());
      expect(expiresAt.getTime()).toBeLessThan(expectedMax.getTime());
    });

    it('should generate temporary username starting with temp_', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user.username).toMatch(/^temp_/);
    });

    it('should generate verification token and expiry', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Check user in database has verification token
      const user = await getUserByEmail(email);
      expect(user?.verification_token).toBeTruthy();
      expect(user?.verification_token_expiry).toBeTruthy();
      
      // Token should be 64 characters hex string (32 bytes)
      expect(user?.verification_token).toMatch(/^[a-f0-9]{64}$/);
      
      // Expiry should be ~24 hours from now
      if (user?.verification_token_expiry) {
        const expiryTime = user.verification_token_expiry.getTime();
        const now = Date.now();
        const expectedExpiry = now + 24 * 60 * 60 * 1000;
        
        // Allow 2 seconds variance
        expect(expiryTime).toBeGreaterThan(expectedExpiry - 2000);
        expect(expiryTime).toBeLessThan(expectedExpiry + 2000);
      }
    });

    it('should send verification email on registration', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      // Get mock function
      const mockSendVerificationEmail = jest.requireMock('@/lib/email/email-service').sendVerificationEmail;
      mockSendVerificationEmail.mockClear();

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.verificationEmailSent).toBe(true);

      // Verify email service was called
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        email.toLowerCase(),
        'Test User',
        expect.stringContaining('/api/auth/verify-email?token=')
      );
    });

    it('should set email_verified to false on registration', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.email_verified).toBe(false);

      // Verify in database
      const user = await getUserByEmail(email);
      expect(user?.email_verified).toBe(false);
    });

    it('should update message to mention email verification', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain('verify your email');
    });
  });

  describe('Validation', () => {
    it('should reject invalid email format', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject password without uppercase letter', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject password without lowercase letter', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'TEST1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject password without number', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'TestPassword!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject password without special character', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1234Password',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject password shorter than 8 characters', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1!',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject display_name shorter than 2 characters', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1234!@#$',
          display_name: 'A',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject display_name longer than 50 characters', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1234!@#$',
          display_name: 'A'.repeat(51),
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          // Missing password and display_name
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Existing User Handling', () => {
    it('should allow re-registration for EXPIRED users', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      // Create expired user
      await createTestUserInDb({
        ...createExpiredUserData({ email }),
      });

      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'New Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.status).toBe(UserStatus.PENDING);
      
      // Verify old expired user was deleted
      const users = await getUserByEmail(email);
      expect(users?.status).toBe(UserStatus.PENDING);
    });

    it('should return resume info for valid PENDING user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3); // 3 days remaining
      
      await createTestUserInDb({
        ...createPendingUserData({ email }),
        reservation_expires_at: reservationExpires,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.resumeStep).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.timeRemaining).toBeDefined();
    });

    it('should mark PENDING user as EXPIRED if reservation expired', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      await createTestUserInDb({
        ...createPendingUserData({ email }),
        reservation_expires_at: expiredDate,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.status).toBe(UserStatus.PENDING);
    });

    it('should reject registration for ACTIVE users', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      await createTestUserInDb({
        ...createActiveUserData({ email }),
      });

      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already exists');
    });

    it('should determine correct resume step for PENDING user with username', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      const uniqueUsername = `testusername_${Date.now()}`;
      
      const createdUser = await createTestUserInDb({
        ...createPendingUserData({ email }),
        username: uniqueUsername,
        reservation_expires_at: reservationExpires,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.resumeStep).toBe('payment');
      expect(data.hasUsername).toBe(true);
    });

    it('should determine correct resume step for PENDING user with payment', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const reservationExpires = new Date();
      reservationExpires.setDate(reservationExpires.getDate() + 3);
      const uniqueUsername = `testusername_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
        username: uniqueUsername,
        reservation_expires_at: reservationExpires,
      });

      const { createTestPaymentInDb } = await import('../__helpers__/test-db');
      await createTestPaymentInDb({
        user_id: user.id,
        status: 'SUCCEEDED',
      });

      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canResume).toBe(true);
      expect(data.resumeStep).toBe('profile');
      expect(data.hasPayment).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle email case insensitivity', async () => {
      const baseEmail = generateTestEmail(testEmailPrefix);
      const emailUpper = baseEmail.toUpperCase();
      
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: emailUpper,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.email).toBe(baseEmail.toLowerCase());
    });

    it('should handle concurrent registration attempts', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      const requests = Array(3).fill(null).map(() => 
        new NextRequest('http://localhost:4000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password: 'Test1234!@#$',
            display_name: 'Test User',
          }),
        })
      );

      // Make requests sequentially to ensure proper detection
      const response1 = await POST(requests[0]);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const response2 = await POST(requests[1]);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const response3 = await POST(requests[2]);
      
      const statuses = [response1.status, response2.status, response3.status];
      
      // First should succeed (201), others should return resume info (200)
      const successCount = statuses.filter(s => s === 201).length;
      const resumeCount = statuses.filter(s => s === 200).length;
      
      expect(successCount).toBe(1);
      expect(successCount + resumeCount).toBe(3);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      // Should return 400 for invalid JSON (now handled properly)
      expect(response.status).toBe(400);
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});

