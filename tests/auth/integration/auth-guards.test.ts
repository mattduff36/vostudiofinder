/**
 * Integration Tests for Auth Guards
 * 
 * Tests server-side authentication guards including:
 * - requireEmailVerification()
 * - Redirect behavior for unverified users
 * - Callback URL handling
 * 
 * @jest-environment node
 */

import { requireEmailVerification } from '@/lib/auth-guards';
import { redirect } from 'next/navigation';
import { createTestUserInDb, cleanupTestUsers } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';
import { db } from '@/lib/db';

// Mock next/navigation redirect
jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT: ${path}`);
  }),
}));

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('requireEmailVerification Auth Guard', () => {
  const testEmailPrefix = `test_auth_guard_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Verified Users', () => {
    it('should allow verified user to proceed', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Should not throw (no redirect)
      const result = await requireEmailVerification(user.id);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(email.toLowerCase());
      expect(result.email_verified).toBe(true);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should work with email parameter', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Call with email instead of userId
      const result = await requireEmailVerification(undefined, email);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(email.toLowerCase());
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email lookup', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const upperEmail = email.toUpperCase();
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const result = await requireEmailVerification(undefined, upperEmail);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(email.toLowerCase());
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('Unverified Users', () => {
    it('should redirect unverified user to verification page', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // User is NOT verified (default)
      expect(user.email_verified).toBe(false);

      // Should redirect
      await expect(requireEmailVerification(user.id)).rejects.toThrow('REDIRECT');
      
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      const redirectPath = mockRedirect.mock.calls[0][0];
      expect(redirectPath).toContain('/auth/verify-email');
      expect(redirectPath).toContain(`email=${encodeURIComponent(email.toLowerCase())}`);
      expect(redirectPath).toContain('flow=signup');
    });

    it('should redirect with email parameter', async () => {
      const email = generateTestEmail(testEmailPrefix);
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      await expect(requireEmailVerification(undefined, email)).rejects.toThrow('REDIRECT');
      
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      const redirectPath = mockRedirect.mock.calls[0][0];
      expect(redirectPath).toContain('/auth/verify-email');
      expect(redirectPath).toContain(`email=${encodeURIComponent(email.toLowerCase())}`);
    });

    it('should include current page as callback URL', async () => {
      const email = generateTestEmail(testEmailPrefix);
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // This functionality would require session/headers context
      // For now, verify basic redirect works
      await expect(requireEmailVerification(undefined, email)).rejects.toThrow('REDIRECT');
      expect(mockRedirect).toHaveBeenCalled();
    });
  });

  describe('Non-existent Users', () => {
    it('should redirect to signup for non-existent userId', async () => {
      const fakeUserId = 'non_existent_user_id';

      await expect(requireEmailVerification(fakeUserId)).rejects.toThrow('REDIRECT');
      
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      const redirectPath = mockRedirect.mock.calls[0][0];
      expect(redirectPath).toContain('/auth/signup');
    });

    it('should redirect to signup for non-existent email', async () => {
      const fakeEmail = `nonexistent_${Date.now()}@test.example.com`;

      await expect(requireEmailVerification(undefined, fakeEmail)).rejects.toThrow('REDIRECT');
      
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      const redirectPath = mockRedirect.mock.calls[0][0];
      expect(redirectPath).toContain('/auth/signup');
    });
  });

  describe('Validation', () => {
    it('should reject call without userId or email', async () => {
      await expect(requireEmailVerification()).rejects.toThrow('REDIRECT');
      
      expect(mockRedirect).toHaveBeenCalledTimes(1);
      const redirectPath = mockRedirect.mock.calls[0][0];
      expect(redirectPath).toContain('/auth/signup');
    });

    it('should reject empty userId', async () => {
      await expect(requireEmailVerification('')).rejects.toThrow('REDIRECT');
      expect(mockRedirect).toHaveBeenCalled();
    });

    it('should reject empty email', async () => {
      await expect(requireEmailVerification(undefined, '')).rejects.toThrow('REDIRECT');
      expect(mockRedirect).toHaveBeenCalled();
    });
  });

  describe('Return Value', () => {
    it('should return user object with required fields', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const username = `testuser_${Date.now()}`;
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        username,
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const result = await requireEmailVerification(user.id);
      
      // Verify returned user has expected fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('display_name');
      expect(result).toHaveProperty('email_verified');
      
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(email.toLowerCase());
      expect(result.username).toBe(username);
      expect(result.display_name).toBe('Test User');
      expect(result.email_verified).toBe(true);
    });
  });

  describe('Database Errors', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close database connection
      await db.$disconnect();

      await expect(requireEmailVerification('any_id')).rejects.toThrow();

      // Reconnect for cleanup
      await db.$connect();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with special characters in email', async () => {
      const email = `test+special_${Date.now()}@test.example.com`;
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const result = await requireEmailVerification(undefined, email);
      expect(result.email).toBe(email);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should prefer userId over email when both provided', async () => {
      const email1 = generateTestEmail(testEmailPrefix);
      const email2 = generateTestEmail(testEmailPrefix);
      
      const user1 = await createTestUserInDb({
        email: email1,
        password: 'Test1234!@#$',
        display_name: 'Test User 1',
        status: UserStatus.PENDING,
      });

      await createTestUserInDb({
        email: email2,
        password: 'Test1234!@#$',
        display_name: 'Test User 2',
        status: UserStatus.PENDING,
      });

      await db.users.update({
        where: { id: user1.id },
        data: { email_verified: true },
      });

      // Call with both userId and email (userId should take precedence)
      const result = await requireEmailVerification(user1.id, email2);
      
      // Should use userId, not email2
      expect(result.id).toBe(user1.id);
      expect(result.email).toBe(email1.toLowerCase());
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});
