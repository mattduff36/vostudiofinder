/**
 * Test Database Utilities
 * 
 * Provides utilities for database operations in tests
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient, UserStatus, PaymentStatus } from '@prisma/client';
// Unused test factory imports removed - can be re-added if needed
// import { createPendingUserData, createExpiredUserData, createActiveUserData } from './test-factories';

const prisma = new PrismaClient();

/**
 * Clean up test users by email pattern
 */
export async function cleanupTestUsers(emailPattern: string = 'test_') {
  try {
    // First, find all test users
    const testUsers = await prisma.users.findMany({
      where: {
        email: {
          contains: emailPattern,
        },
      },
      select: { id: true },
    });

    const userIds = testUsers.map(u => u.id);

    if (userIds.length === 0) {
      console.log(`🧹 Cleaned up 0 test users`);
      return 0;
    }

    // Delete related records first (foreign key constraints)
    // 1. Delete subscriptions
    await prisma.subscriptions.deleteMany({
      where: { user_id: { in: userIds } },
    });

    // 2. Delete studio profiles
    await prisma.studio_profiles.deleteMany({
      where: { user_id: { in: userIds } },
    });

    // 3. Delete payments
    await prisma.payments.deleteMany({
      where: { user_id: { in: userIds } },
    });

    // Finally, delete users
    const result = await prisma.users.deleteMany({
      where: {
        email: {
          contains: emailPattern,
        },
      },
    });
    console.log(`🧹 Cleaned up ${result.count} test users`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up test users:', error);
    throw error;
  }
}

/**
 * Create a test user in the database
 */
export async function createTestUserInDb(data: {
  email: string;
  password: string;
  display_name: string;
  username?: string;
  status?: UserStatus;
  reservation_expires_at?: Date;
}) {
  // Dynamic import - @ alias should work via jest.config.cjs moduleNameMapper
  const authUtils = await import('@/lib/auth-utils');
  const { randomBytes } = await import('crypto');
  
  const hashedPassword = await authUtils.hashPassword(data.password);
  // Always generate userId - it's required
  const userId = randomBytes(12).toString('base64url');
  
  // Generate unique username - userId is already unique, use it directly
  let uniqueUsername = data.username;
  
  if (!uniqueUsername || uniqueUsername.startsWith('temp_') || uniqueUsername.startsWith('expired_')) {
    // For temp_ or expired_ usernames, or when no username provided
    // Use userId directly (it's already unique) - format: temp_<userId>
    // userId is base64url (safe chars), so we can use it directly
    const safeUserId = userId.replace(/[^a-zA-Z0-9_]/g, '_');
    uniqueUsername = `temp_${safeUserId}`.substring(0, 20);
  } else {
    // For provided usernames, check if they look like simple test usernames
    // Simple test usernames (like "testuser", "TESTUSER", "TestUser") should be preserved
    // Complex usernames with timestamps/random (from generateTestUsername) will be unique anyway
    // If it's a simple alphanumeric username <= 20 chars, preserve it exactly for case-insensitive tests
    if (data.username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(data.username)) {
      // Check if it's a simple username (no numbers at the end suggesting timestamp/random)
      // Simple usernames like "testuser", "TESTUSER", "TestUser" should be preserved
      // Complex usernames like "testuser_1234567890_abc" are already unique, so preserve them too
      uniqueUsername = data.username;
    } else {
      // Invalid format - append userId to ensure uniqueness
      const safeUserId = userId.substring(0, 10).replace(/[^a-zA-Z0-9_]/g, '_');
      const baseName = uniqueUsername.substring(0, 8); // Keep some of original
      uniqueUsername = `${baseName}_${safeUserId}`.substring(0, 20);
    }
  }
  
  const user = await prisma.users.create({
    data: {
      id: userId,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      username: uniqueUsername,
      display_name: data.display_name,
      status: data.status || UserStatus.PENDING,
      reservation_expires_at: data.reservation_expires_at || new Date(Date.now() + 7 * 24 * 3600000),
      email_verified: false,
      updated_at: new Date(),
    },
  });
  
  return user;
}

/**
 * Create a test payment in the database
 */
export async function createTestPaymentInDb(data: {
  user_id: string;
  status?: PaymentStatus;
  stripe_checkout_session_id?: string;
}) {
  // Use randomBytes instead of nanoid to avoid ES module issues in Jest
  const { randomBytes } = await import('crypto');
  const paymentId = randomBytes(12).toString('base64url');
  
  const payment = await prisma.payments.create({
    data: {
      id: paymentId,
      user_id: data.user_id,
      status: data.status || PaymentStatus.SUCCEEDED,
      stripe_checkout_session_id: data.stripe_checkout_session_id || `cs_test_${Date.now()}`,
      amount: 2500,
      currency: 'gbp',
      updated_at: new Date(),
    },
  });
  
  return payment;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return prisma.users.findUnique({
    where: { email: email.toLowerCase() },
  });
}

/**
 * Get payment by user ID
 */
export async function getPaymentByUserId(userId: string) {
  return prisma.payments.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Disconnect Prisma client
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}

