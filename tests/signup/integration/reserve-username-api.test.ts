/**
 * Integration Tests for /api/auth/reserve-username
 * 
 * Tests username reservation endpoint including:
 * - Successful username reservation
 * - Username validation
 * - Expired reservation handling
 * - Race condition handling
 * - Duplicate username prevention
 */

import { POST } from '@/app/api/auth/reserve-username/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers, getUserByEmail } from '../__helpers__/test-db';
import { createPendingUserData, generateTestEmail, generateTestUsername } from '../__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../__helpers__/test-db';

describe('POST /api/auth/reserve-username', () => {
  const testEmailPrefix = `test_reserve_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Successful Username Reservation', () => {
    it('should reserve username for PENDING user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('reserved successfully');
      expect(data.user.username).toBe(username);

      // Verify username is updated in database
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser?.username).toBe(username);
    });

    it('should update username from temp_ prefix', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
      });

      expect(user.username).toMatch(/^temp_/);

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.username).toBe(username);
      expect(data.user.username).not.toMatch(/^temp_/);
    });
  });

  describe('Username Validation', () => {
    it('should reject username shorter than 3 characters', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username: 'ab',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('3-20 characters');
    });

    it('should reject username longer than 20 characters', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username: 'a'.repeat(21),
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject username with invalid characters', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
      });

      const invalidUsernames = ['test-user', 'test.user', 'test@user', 'test user', 'test/user'];

      for (const username of invalidUsernames) {
        const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            username,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should accept valid username formats', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
      });

      const validUsernames = ['test', 'test123', 'test_user', 'TestUser', 'TEST123', 'a1b2c3'];

      for (const username of validUsernames) {
        const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            username,
          }),
        });

        const response = await POST(request);
        // Should succeed or return 409 if taken, but not 400 for format
        expect([200, 409]).toContain(response.status);
      }
    });
  });

  describe('User Status Validation', () => {
    it('should reject reservation for non-PENDING user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
        status: UserStatus.ACTIVE,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject reservation for non-existent user', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'nonexistent_user_id',
          username: generateTestUsername(),
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe('Expired Reservation Handling', () => {
    it('should reject reservation if user reservation expired', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
        reservation_expires_at: expiredDate,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error).toContain('expired');

      // Verify user was marked as EXPIRED
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser?.status).toBe(UserStatus.EXPIRED);
    });
  });

  describe('Duplicate Username Prevention', () => {
    it('should reject username already taken by ACTIVE user', async () => {
      const email1 = generateTestEmail(testEmailPrefix);
      const email2 = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      
      // Create ACTIVE user with username
      await createTestUserInDb({
        ...createPendingUserData({ email: email1 }),
        username,
        status: UserStatus.ACTIVE,
      });

      // Try to reserve same username for PENDING user
      const user2 = await createTestUserInDb({
        ...createPendingUserData({ email: email2 }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user2.id,
          username,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });

    it('should reject username already taken by PENDING user with valid reservation', async () => {
      const email1 = generateTestEmail(testEmailPrefix);
      const email2 = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      
      // Create PENDING user with username
      await createTestUserInDb({
        ...createPendingUserData({ email: email1 }),
        username,
        reservation_expires_at: futureDate,
      });

      // Try to reserve same username for another PENDING user
      const user2 = await createTestUserInDb({
        ...createPendingUserData({ email: email2 }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user2.id,
          username,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });

    it('should allow username taken by EXPIRED user', async () => {
      const email1 = generateTestEmail(testEmailPrefix);
      const email2 = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      
      // Create EXPIRED user with username (username will be prefixed with expired_)
      const expiredUser = await createTestUserInDb({
        ...createPendingUserData({ email: email1 }),
        username: `expired_${username}_${Date.now()}`,
        status: UserStatus.EXPIRED,
      });

      // Should be able to reserve same base username for PENDING user
      // (EXPIRED users have their usernames prefixed, so the base username is available)
      const user2 = await createTestUserInDb({
        ...createPendingUserData({ email: email2 }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user2.id,
          username, // Use the base username (not the expired_ prefixed one)
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle race condition when username claimed during transaction', async () => {
      const email1 = generateTestEmail(testEmailPrefix);
      const email2 = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      
      // Create two PENDING users without usernames
      const user1 = await createTestUserInDb({
        ...createPendingUserData({ email: email1 }),
      });

      const user2 = await createTestUserInDb({
        ...createPendingUserData({ email: email2 }),
      });

      // Both try to claim the same username simultaneously
      const requests = [
        new NextRequest('http://localhost:3000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: user1.id,
            username,
          }),
        }),
        new NextRequest('http://localhost:3000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: user2.id,
            username,
          }),
        }),
      ];

      const responses = await Promise.all(requests.map(req => POST(req)));
      const statuses = responses.map(r => r.status);
      
      // One should succeed (200), one should fail (409) due to race condition
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);
    });
  });

  describe('Edge Cases', () => {
    it('should reject missing userId', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          username: generateTestUsername(),
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject missing username', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        ...createPendingUserData({ email }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle case-insensitive username checking', async () => {
      const email1 = generateTestEmail(testEmailPrefix);
      const email2 = generateTestEmail(testEmailPrefix);
      const username = generateTestUsername();
      
      // Create user with lowercase username
      await createTestUserInDb({
        ...createPendingUserData({ email: email1 }),
        username: username.toLowerCase(),
        status: UserStatus.ACTIVE,
      });

      // Try to reserve uppercase version
      const user2 = await createTestUserInDb({
        ...createPendingUserData({ email: email2 }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user2.id,
          username: username.toUpperCase(),
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });
  });
});

