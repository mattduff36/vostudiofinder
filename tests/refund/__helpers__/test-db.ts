/**
 * Test Database Helpers for Refund Tests
 * 
 * Provides utilities for creating test data and cleaning up after tests
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient, UserStatus, PaymentStatus, RefundStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}@test.com`;
}

/**
 * Generate a unique ID
 */
export function generateTestId(): string {
  return randomBytes(12).toString('base64url');
}

/**
 * Create a test user in the database
 */
export async function createTestUserInDb(data: {
  email?: string;
  password?: string;
  display_name?: string;
  username?: string;
  status?: UserStatus;
  role?: string;
}) {
  const email = data.email || generateTestEmail('refund_test');
  const hashedPassword = data.password || '$2b$10$dummy.hash.for.testing.purposes';
  
  return await prisma.users.create({
    data: {
      id: generateTestId(),
      email: email.toLowerCase(),
      password: hashedPassword,
      display_name: data.display_name || 'Test User',
      username: data.username || `testuser_${Date.now()}_${randomBytes(4).toString('hex')}`,
      status: data.status || UserStatus.ACTIVE,
      role: data.role || 'USER',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}

/**
 * Create a test admin user in the database
 */
export async function createTestAdminInDb(data?: {
  email?: string;
  password?: string;
  display_name?: string;
}) {
  return await createTestUserInDb({
    ...data,
    role: 'ADMIN',
    status: UserStatus.ACTIVE,
  });
}

/**
 * Create a test payment in the database
 */
export async function createTestPaymentInDb(data: {
  user_id: string;
  amount?: number;
  currency?: string;
  status?: PaymentStatus;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  refunded_amount?: number;
}) {
  return await prisma.payments.create({
    data: {
      id: generateTestId(),
      user_id: data.user_id,
      amount: data.amount || 10000, // £100.00 in cents
      currency: data.currency || 'gbp',
      status: data.status || PaymentStatus.SUCCEEDED,
      stripe_payment_intent_id: data.stripe_payment_intent_id || `pi_test_${randomBytes(8).toString('hex')}`,
      stripe_checkout_session_id: data.stripe_checkout_session_id || `cs_test_${randomBytes(8).toString('hex')}`,
      refunded_amount: data.refunded_amount || 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}

/**
 * Create a test refund in the database
 */
export async function createTestRefundInDb(data: {
  stripe_refund_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  processed_by: string;
  user_id?: string | null;
  payment_id?: string | null;
  reason?: string | null;
}) {
  return await prisma.refunds.create({
    data: {
      id: generateTestId(),
      stripe_refund_id: data.stripe_refund_id,
      stripe_payment_intent_id: data.stripe_payment_intent_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      processed_by: data.processed_by,
      user_id: data.user_id || null,
      payment_id: data.payment_id || null,
      reason: data.reason || null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}

/**
 * Clean up test users by email prefix
 */
export async function cleanupTestUsers(emailPrefix: string) {
  await prisma.users.deleteMany({
    where: {
      email: {
        startsWith: emailPrefix,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * Clean up test payments by user ID
 */
export async function cleanupTestPayments(userId: string) {
  await prisma.payments.deleteMany({
    where: { user_id: userId },
  });
}

/**
 * Clean up test refunds by payment ID
 */
export async function cleanupTestRefunds(paymentId: string) {
  await prisma.refunds.deleteMany({
    where: { payment_id: paymentId },
  });
}

/**
 * Clean up all test data for a user
 */
export async function cleanupTestUserData(userId: string) {
  // Delete refunds first (they reference payments)
  const payments = await prisma.payments.findMany({
    where: { user_id: userId },
    select: { id: true },
  });
  
  for (const payment of payments) {
    await prisma.refunds.deleteMany({
      where: { payment_id: payment.id },
    });
  }
  
  // Delete payments
  await prisma.payments.deleteMany({
    where: { user_id: userId },
  });
  
  // Delete subscriptions
  await prisma.subscriptions.deleteMany({
    where: { user_id: userId },
  });
  
  // Delete studio profiles
  await prisma.studio_profiles.deleteMany({
    where: { user_id: userId },
  });
  
  // Delete user
  await prisma.users.delete({
    where: { id: userId },
  });
}

/**
 * Disconnect from database
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}

export { prisma };

