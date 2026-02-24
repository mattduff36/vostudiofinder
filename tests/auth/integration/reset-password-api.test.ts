/**
 * Integration Tests for /api/auth/reset-password
 * 
 * Tests password reset endpoint including:
 * - Valid password reset with confirmPassword
 * - Missing confirmPassword field (critical bug fix)
 * - Password mismatch validation
 * - Invalid/expired token handling
 * - Password strength validation
 * 
 * @jest-environment node
 */

import { POST } from '@/app/api/auth/reset-password/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers, getUserByEmail } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('POST /api/auth/reset-password', () => {
  const testEmailPrefix = `test_reset_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Password Reset Validation', () => {
    it('should require confirmPassword field (critical bug fix)', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE,
      });

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      await db.users.update({
        where: { id: user.id },
        data: {
          reset_token: resetToken,
          reset_token_expiry: new Date(Date.now() + 3600000), // 1 hour from now
        },
      });

      // Try to reset password WITHOUT confirmPassword (the bug)
      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken,
          password: 'NewPassword123!',
          // confirmPassword is MISSING - this should fail
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      // Should complain about missing confirmPassword
      expect(data.error.toLowerCase()).toMatch(/confirm|password/);
    });

    it('should accept password reset with confirmPassword field', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE,
      });

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      await db.users.update({
        where: { id: user.id },
        data: {
          reset_token: resetToken,
          reset_token_expiry: new Date(Date.now() + 3600000), // 1 hour from now
        },
      });

      const newPassword = 'NewPassword123!@#';
      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword, // ✅ Now included
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('successfully');
      expect(data.email).toBe(email.toLowerCase());

      // Verify password was actually changed
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.reset_token).toBeNull(); // Token should be cleared
    });

    it('should reject password reset when passwords do not match', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE,
      });

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      await db.users.update({
        where: { id: user.id },
        data: {
          reset_token: resetToken,
          reset_token_expiry: new Date(Date.now() + 3600000),
        },
      });

      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken,
          password: 'NewPassword123!@#',
          confirmPassword: 'DifferentPassword123!@#', // ❌ Mismatch
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toMatch(/match|confirm/);
    });

    it('should validate password strength requirements', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE,
      });

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      await db.users.update({
        where: { id: user.id },
        data: {
          reset_token: resetToken,
          reset_token_expiry: new Date(Date.now() + 3600000),
        },
      });

      // Test weak password (no special character)
      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken,
          password: 'WeakPassword123', // Missing special character
          confirmPassword: 'WeakPassword123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.toLowerCase()).toMatch(/special|character/);
    });
  });

  describe('Token Validation', () => {
    it('should reject invalid reset token', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token-12345',
          password: 'NewPassword123!@#',
          confirmPassword: 'NewPassword123!@#',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid or expired');
    });

    it('should reject expired reset token', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'TestPassword123!',
        display_name: 'Test User',
        status: UserStatus.ACTIVE,
      });

      // Generate reset token with expired expiry
      const resetToken = randomBytes(32).toString('hex');
      await db.users.update({
        where: { id: user.id },
        data: {
          reset_token: resetToken,
          reset_token_expiry: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        },
      });

      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken,
          password: 'NewPassword123!@#',
          confirmPassword: 'NewPassword123!@#',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('expired');
    });
  });

  describe('Required Fields', () => {
    it('should require token field', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          // token is missing
          password: 'NewPassword123!@#',
          confirmPassword: 'NewPassword123!@#',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should require password field', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'some-token',
          // password is missing
          confirmPassword: 'NewPassword123!@#',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});

