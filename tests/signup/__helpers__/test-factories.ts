/**
 * Test Factories for Signup Flow Tests
 * 
 * Provides factory functions to create test data for signup flow testing
 */

import { UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface TestUserData {
  email: string;
  password: string;
  display_name: string;
  username?: string;
}

export interface TestSignupData extends TestUserData {
  userId?: string;
  status?: UserStatus;
  reservation_expires_at?: Date;
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}@test.example.com`;
}

/**
 * Generate a valid test password
 */
export function generateTestPassword(): string {
  return 'Test1234!@#$';
}

/**
 * Generate a valid test username
 */
export function generateTestUsername(prefix: string = 'testuser'): string {
  const timestamp = Date.now();
  const random = randomBytes(3).toString('hex');
  return `${prefix}_${timestamp}_${random}`.substring(0, 20);
}

/**
 * Create test user data
 */
export function createTestUserData(overrides?: Partial<TestUserData>): TestUserData {
  return {
    email: generateTestEmail(),
    password: generateTestPassword(),
    display_name: 'Test User',
    ...overrides,
  };
}

/**
 * Create test signup data with PENDING status
 */
export function createPendingUserData(overrides?: Partial<TestSignupData>): TestSignupData {
  const reservationExpires = new Date();
  reservationExpires.setDate(reservationExpires.getDate() + 7);
  
  return {
    ...createTestUserData(overrides),
    status: UserStatus.PENDING,
    reservation_expires_at: reservationExpires,
    ...overrides,
  };
}

/**
 * Create test signup data with EXPIRED status
 */
export function createExpiredUserData(overrides?: Partial<TestSignupData>): TestSignupData {
  const reservationExpired = new Date();
  reservationExpired.setDate(reservationExpired.getDate() - 1);
  
  return {
    ...createTestUserData(overrides),
    status: UserStatus.EXPIRED,
    reservation_expires_at: reservationExpired,
    username: `expired_${generateTestUsername()}_${Date.now()}`,
    ...overrides,
  };
}

/**
 * Create test signup data with ACTIVE status
 */
export function createActiveUserData(overrides?: Partial<TestSignupData>): TestSignupData {
  return {
    ...createTestUserData(overrides),
    status: UserStatus.ACTIVE,
    username: generateTestUsername(),
    ...overrides,
  };
}

/**
 * Create test studio profile data
 */
export function createTestStudioProfileData(overrides?: any) {
  return {
    studio_name: 'Test Studio',
    short_about: 'A professional voiceover studio',
    about: 'This is a comprehensive description of our professional voiceover studio. We offer state-of-the-art recording facilities.',
    studio_types: ['HOME', 'RECORDING'],
    full_address: '123 Test Street, Test City, TC 12345, United Kingdom',
    abbreviated_address: '123 Test Street, Test City',
    city: 'Test City',
    location: 'United Kingdom',
    website_url: 'https://teststudio.example.com',
    connections: {
      connection1: true,
      connection5: true,
    },
    images: [
      { url: 'https://example.com/image1.jpg', alt_text: 'Studio image 1' },
    ],
    ...overrides,
  };
}

/**
 * Create test payment data
 */
export function createTestPaymentData(overrides?: any) {
  return {
    status: 'SUCCEEDED',
    stripe_checkout_session_id: `cs_test_${randomBytes(16).toString('hex')}`,
    amount: 2500, // £25.00 in pence
    currency: 'gbp',
    ...overrides,
  };
}

