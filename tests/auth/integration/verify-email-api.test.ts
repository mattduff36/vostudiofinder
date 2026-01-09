/**
 * Integration Tests for /api/auth/verify-email
 * 
 * Tests email verification endpoint including:
 * - Token-based verification
 * - Cross-browser verification (stateless)
 * - Expired token handling
 * - Invalid token handling
 * - Already verified users
 * - Redirect behavior
 * 
 * @jest-environment node
 */

import { GET } from '@/app/api/auth/verify-email/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers, getUserByEmail } from '../../signup/__helpers__/test-db';
import { generateTestEmail } from '../../signup/__helpers__/test-factories';
import { UserStatus } from '@prisma/client';
import { disconnectDb } from '../../signup/__helpers__/test-db';
import { randomBytes } from 'crypto';

describe('GET /api/auth/verify-email', () => {
  const testEmailPrefix = `test_verify_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Successful Verification', () => {
    it('should verify email with valid token', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with verification token
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      // Update user with verification token (createTestUserInDb doesn't support this)
      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: {
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );

      const response = await GET(request);

      // Should redirect to payment page with user data
      expect(response.status).toBe(307); // Temporary redirect
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain('/auth/membership');
      expect(redirectUrl).toContain(`userId=${user.id}`);
      expect(redirectUrl).toContain(`email=${encodeURIComponent(email)}`);

      // Verify user is now verified in database
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser?.email_verified).toBe(true);
      expect(updatedUser?.verification_token).toBeNull();
    });

    it('should work across browsers (stateless token)', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      // Simulate cross-browser request (no session cookies)
      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );
      // Don't set any cookies - this simulates a different browser

      const response = await GET(request);

      expect(response.status).toBe(307);
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser?.email_verified).toBe(true);
    });

    it('should redirect to custom URL when redirect param provided', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const customRedirect = '/dashboard';

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
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}&redirect=${encodeURIComponent(customRedirect)}`
      );

      const response = await GET(request);

      expect(response.status).toBe(307);
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain(customRedirect);
    });

    it('should set studio profile to visible after verification', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const { db } = await import('@/lib/db');
      
      // Create studio profile
      await db.studio_profiles.create({
        data: {
          user_id: user.id,
          name: 'Test Studio',
          visible: false, // Initially not visible
        },
      });

      await db.users.update({
        where: { id: user.id },
        data: {
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );

      await GET(request);

      // Check studio profile is now visible
      const studioProfile = await db.studio_profiles.findUnique({
        where: { user_id: user.id },
      });
      expect(studioProfile?.visible).toBe(true);
    });
  });

  describe('Invalid Token Handling', () => {
    it('should reject invalid token', async () => {
      const invalidToken = 'invalid_token_123';
      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${invalidToken}`
      );

      const response = await GET(request);

      expect(response.status).toBe(307);
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain('/auth/verify-email');
      expect(redirectUrl).toContain('error=invalid_token');
    });

    it('should reject missing token', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/verify-email'
      );

      const response = await GET(request);

      expect(response.status).toBe(307);
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain('/auth/verify-email');
      expect(redirectUrl).toContain('error=invalid_token');
    });

    it('should reject expired token', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const expiredTokenExpiry = new Date(Date.now() - 1000); // Expired 1 second ago

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
          verification_token: verificationToken,
          verification_token_expiry: expiredTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );

      const response = await GET(request);

      expect(response.status).toBe(307);
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain('/auth/verify-email');
      expect(redirectUrl).toContain('error=token_expired');
      expect(redirectUrl).toContain(`email=${encodeURIComponent(email)}`);

      // User should still not be verified
      const updatedUser = await getUserByEmail(email);
      expect(updatedUser?.email_verified).toBe(false);
    });
  });

  describe('Already Verified Users', () => {
    it('should handle already verified user gracefully', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        status: UserStatus.PENDING,
      });

      const { db } = await import('@/lib/db');
      
      // Mark user as already verified
      await db.users.update({
        where: { id: user.id },
        data: {
          email_verified: true,
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );

      const response = await GET(request);

      // Should redirect to payment with already_verified param
      expect(response.status).toBe(307);
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain('/auth/membership');
      expect(redirectUrl).toContain('already_verified=true');
    });

    it('should include user data in redirect for already verified user', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const username = `testuser_${Date.now()}`;

      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
        username,
        status: UserStatus.PENDING,
      });

      const { db } = await import('@/lib/db');
      await db.users.update({
        where: { id: user.id },
        data: {
          email_verified: true,
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );

      const response = await GET(request);

      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain(`userId=${user.id}`);
      expect(redirectUrl).toContain(`email=${encodeURIComponent(email)}`);
      expect(redirectUrl).toContain(`name=${encodeURIComponent('Test User')}`);
      expect(redirectUrl).toContain(`username=${username}`);
    });
  });

  describe('Edge Cases', () => {
    it('should not include temp username in redirect', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );

      const response = await GET(request);

      const redirectUrl = response.headers.get('location');
      // User's username starts with temp_, should not be included
      expect(redirectUrl).not.toContain('username=temp_');
    });

    it('should handle verification with verified=true param', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const verificationToken = randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`
      );

      const response = await GET(request);

      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain('verified=true');
    });
  });
});
