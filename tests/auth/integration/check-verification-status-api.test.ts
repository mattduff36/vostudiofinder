/**
 * Integration Tests for /api/auth/check-verification-status
 * 
 * Tests verification status checking endpoint including:
 * - Verified user status
 * - Unverified user status
 * - Non-existent user handling
 * - Case insensitivity
 * 
 * @jest-environment node
 */

import { POST } from '@/app/api/auth/check-verification-status/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';

describe('POST /api/auth/check-verification-status', () => {
  const testEmailPrefix = `test_check_verify_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Verified Users', () => {
    it('should return true for verified user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Mark user as verified
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.verified).toBe(true);
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

      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email: upperEmail }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.verified).toBe(true);
    });
  });

  describe('Unverified Users', () => {
    it('should return false for unverified user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.verified).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const nonExistentEmail = `nonexistent_${Date.now()}@test.example.com`;

      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email: nonExistentEmail }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.verified).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  describe('Validation', () => {
    it('should reject request without email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject empty email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500); // Should handle gracefully
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with special characters', async () => {
      const email = `test+special_${Date.now()}@test.example.com`;
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.verified).toBe(true);
    });

    it('should handle rapid consecutive checks', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Make multiple rapid requests
      const requests = Array(5).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.verified).toBe(true);
      }
    });

    it('should handle transition from unverified to verified', async () => {
      const email = generateTestEmail(testEmailPrefix);
      
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Check 1: Unverified
      const request1 = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response1 = await POST(request1);
      const data1 = await response1.json();

      expect(data1.isVerified).toBe(false);

      // Verify user
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: { email_verified: true },
      });

      // Check 2: Verified
      const request2 = new NextRequest('http://localhost:3000/api/auth/check-verification-status', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(data2.isVerified).toBe(true);
    });
  });
});
