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
import { createPendingUserData, createExpiredUserData, createActiveUserData } from './test-factories';

const prisma = new PrismaClient();

/**
 * Clean up test users by email pattern
 */
export async function cleanupTestUsers(emailPattern: string = 'test_') {
  try {
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
  
  const user = await prisma.users.create({
    data: {
      id: userId,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      username: data.username || `temp_${userId?.substring(0, 8) || 'temp'}`,
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
  const { nanoid } = await import('nanoid');
  const paymentId = nanoid();
  
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

