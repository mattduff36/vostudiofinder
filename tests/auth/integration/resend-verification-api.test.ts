/**
 * Integration Tests for /api/auth/resend-verification
 * 
 * Tests resend verification email endpoint including:
 * - Successful resend for unverified users
 * - Rejection for already verified users
 * - Security (no email enumeration)
 * - Token regeneration
 * 
 * @jest-environment node
 */

import { POST } from '@/app/api/auth/resend-verification/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers, getUserByEmail } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';
import { randomBytes } from 'crypto';

// Get mocked email service
const mockSendVerificationEmail = jest.requireMock('@/lib/email/email-service').sendVerificationEmail;

describe('POST /api/auth/resend-verification', () => {
  const testEmailPrefix = `test_resend_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockSendVerificationEmail.mockResolvedValue(true);
  });

  describe('Successful Resend', () => {
    it('should resend verification email for unverified user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Verification email sent');

      // Verify email service was called
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        email.toLowerCase(),
        'Test User',
        expect.stringContaining('/api/auth/verify-email?token=')
      );
    });

    it('should generate new verification token', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const oldToken = randomBytes(32).toString('hex');
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Set initial token
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: {
          verification_token: oldToken,
          verification_token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      await POST(request);

      // Verify token was updated
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser?.verification_token).not.toBe(oldToken);
      expect(updatedUser?.verification_token).toBeTruthy();
      expect(updatedUser?.verification_token_expiry).toBeTruthy();

      // Verify new token is in the email URL
      const emailUrl = mockSendVerificationEmail.mock.calls[0][2];
      expect(emailUrl).toContain(updatedUser?.verification_token);
      expect(emailUrl).not.toContain(oldToken);
    });

    it('should update token expiry to 24 hours from now', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Set expired token
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: {
          verification_token: randomBytes(32).toString('hex'),
          verification_token_expiry: new Date(Date.now() - 1000), // Expired
        },
      });

      const beforeTime = new Date();
      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      await POST(request);
      const afterTime = new Date();

      const updatedUser = await getUserByEmail(email);
      const expiryTime = updatedUser?.verification_token_expiry;
      
      expect(expiryTime).toBeTruthy();
      if (expiryTime) {
        const expectedMin = new Date(beforeTime.getTime() + 23.9 * 60 * 60 * 1000);
        const expectedMax = new Date(afterTime.getTime() + 24.1 * 60 * 60 * 1000);
        
        expect(expiryTime.getTime()).toBeGreaterThan(expectedMin.getTime());
        expect(expiryTime.getTime()).toBeLessThan(expectedMax.getTime());
      }
    });
  });

  describe('Already Verified Users', () => {
    it('should reject resend for already verified user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark as verified
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already verified');

      // Email should not be sent
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('Security & Privacy', () => {
    it('should not reveal if email does not exist', async () => {
      const nonExistentEmail = `nonexistent_${Date.now()}@test.example.com`;

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: nonExistentEmail }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should return success to prevent email enumeration
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('If an account exists');

      // Email should not be sent
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email lookup', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const upperEmail = email.toUpperCase();
      
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: upperEmail }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Email should be sent to lowercase version
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        email.toLowerCase(),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Email Service Failures', () => {
    it('should return error if email service fails', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mock email service failure
      mockSendVerificationEmail.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to send verification email');
    });

    it('should still update token even if email fails', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const oldToken = randomBytes(32).toString('hex');
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: {
          verification_token: oldToken,
          verification_token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Mock email service failure
      mockSendVerificationEmail.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      await POST(request);

      // Token should still be updated even though email failed
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser?.verification_token).not.toBe(oldToken);
    });
  });

  describe('Validation', () => {
    it('should reject request without email', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject empty email', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid resend requests', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Make multiple rapid requests
      const requests = Array(3).fill(null).map(() =>
        new NextRequest('http://localhost:4000/api/auth/resend-verification', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }

      // Email service should have been called for each request
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(3);
    });

    it('should handle email with special characters', async () => {
      const email = `test+special_${Date.now()}@test.example.com`;
      
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const request = new NextRequest('http://localhost:4000/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        expect.any(String)
      );
    });
  });
});
