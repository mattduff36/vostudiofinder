/**
 * Integration Tests for Refund Webhook Handler
 * 
 * Tests the refund webhook handler in /api/stripe/webhook
 * 
 * Coverage:
 * - Idempotency (duplicate refund events)
 * - Payment status updates
 * - Refund record creation
 * - Full refund membership cancellation
 * - Processed_by user assignment
 * - Edge cases (payment not found, no admin user)
 */

// @jest-environment node
import { POST } from '@/app/api/stripe/webhook/route';
import { NextRequest } from 'next/server';
import {
  createTestUserInDb,
  createTestAdminInDb,
  createTestPaymentInDb,
  createTestRefundInDb,
  cleanupTestUserData,
  disconnectDb,
  generateTestId,
  generateTestEmail,
  prisma,
} from '../__helpers__/test-db';
import { UserStatus, PaymentStatus, RefundStatus } from '@prisma/client';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));
import { stripe } from '@/lib/stripe';

describe('Refund Webhook Handler', () => {
  const testEmailPrefix = `refund_webhook_test_${Date.now()}`;
  let testUser: any;
  let testAdmin: any;
  let testPayment: any;

  beforeEach(async () => {
    // Create test admin
    testAdmin = await createTestAdminInDb({
      email: generateTestEmail(testEmailPrefix),
      display_name: 'Test Admin',
    });

    // Create test user
    testUser = await createTestUserInDb({
      email: generateTestEmail(testEmailPrefix),
      password: 'TestPassword123!',
      display_name: 'Test User',
      username: `testuser_${Date.now()}`,
    });

    // Create test payment
    testPayment = await createTestPaymentInDb({
      user_id: testUser.id,
      amount: 10000, // £100.00
      currency: 'gbp',
      status: PaymentStatus.SUCCEEDED,
      stripe_payment_intent_id: `pi_test_${generateTestId()}`,
    });

    // Mock webhook signature verification
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementation((payload, signature, secret) => {
      return JSON.parse(payload.toString());
    });
  });

  afterAll(async () => {
    if (testUser) await cleanupTestUserData(testUser.id);
    if (testAdmin) await cleanupTestUserData(testAdmin.id);
    await disconnectDb();
  });

  const createRefundEvent = (refundId: string, amount: number, status: string = 'succeeded'): Stripe.Event => {
    return {
      id: `evt_test_${generateTestId()}`,
      object: 'event',
      api_version: '2024-01-01',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: refundId,
          object: 'refund',
          amount: amount,
          currency: 'gbp',
          payment_intent: testPayment.stripe_payment_intent_id,
          status: status,
          reason: 'requested_by_customer',
        } as Stripe.Refund,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
      type: 'charge.refunded',
    } as Stripe.Event;
  };

  describe('Idempotency', () => {
    it('should skip processing if refund already exists', async () => {
      const refundId = `re_test_${generateTestId()}`;
      
      // Create existing refund record
      await createTestRefundInDb({
        stripe_refund_id: refundId,
        stripe_payment_intent_id: testPayment.stripe_payment_intent_id,
        amount: 5000,
        currency: 'gbp',
        status: RefundStatus.SUCCEEDED,
        processed_by: testAdmin.id,
        user_id: testUser.id,
        payment_id: testPayment.id,
      });

      const event = createRefundEvent(refundId, 5000);
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify payment was NOT updated (should remain at original refunded_amount)
      const payment = await prisma.payments.findUnique({
        where: { id: testPayment.id },
      });
      expect(payment?.refunded_amount).toBe(0); // Original amount, not updated
    });
  });

  describe('Refund Processing', () => {
    it('should process partial refund and update payment status', async () => {
      const refundId = `re_test_${generateTestId()}`;
      const refundAmount = 5000; // £50.00

      const event = createRefundEvent(refundId, refundAmount);
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify payment was updated
      const updatedPayment = await prisma.payments.findUnique({
        where: { id: testPayment.id },
      });
      expect(updatedPayment?.refunded_amount).toBe(refundAmount);
      expect(updatedPayment?.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);

      // Verify refund record was created
      const refundRecord = await prisma.refunds.findUnique({
        where: { stripe_refund_id: refundId },
      });
      expect(refundRecord).toBeTruthy();
      expect(refundRecord?.amount).toBe(refundAmount);
      expect(refundRecord?.status).toBe(RefundStatus.SUCCEEDED);
      expect(refundRecord?.processed_by).toBe(testAdmin.id); // Should use admin
      expect(refundRecord?.payment_id).toBe(testPayment.id);
    });

    it('should process full refund and update payment status to REFUNDED', async () => {
      const refundId = `re_test_${generateTestId()}`;
      const refundAmount = testPayment.amount; // Full amount

      const event = createRefundEvent(refundId, refundAmount);
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify payment status
      const updatedPayment = await prisma.payments.findUnique({
        where: { id: testPayment.id },
      });
      expect(updatedPayment?.status).toBe(PaymentStatus.REFUNDED);
      expect(updatedPayment?.refunded_amount).toBe(refundAmount);
    });

    it('should handle multiple partial refunds correctly', async () => {
      const firstRefundId = `re_test_1_${generateTestId()}`;
      const secondRefundId = `re_test_2_${generateTestId()}`;
      const firstAmount = 3000;
      const secondAmount = 4000;

      // First refund
      const event1 = createRefundEvent(firstRefundId, firstAmount);
      const request1 = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test-signature' },
        body: JSON.stringify(event1),
      });
      await POST(request1);

      // Second refund
      const event2 = createRefundEvent(secondRefundId, secondAmount);
      const request2 = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test-signature' },
        body: JSON.stringify(event2),
      });
      await POST(request2);

      // Verify cumulative refund amount
      const updatedPayment = await prisma.payments.findUnique({
        where: { id: testPayment.id },
      });
      expect(updatedPayment?.refunded_amount).toBe(firstAmount + secondAmount);
      expect(updatedPayment?.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });
  });

  describe('Full Refund Membership Cancellation', () => {
    it('should cancel membership and set studio to INACTIVE on full refund', async () => {
      // Create active subscription
      const subscription = await prisma.subscriptions.create({
        data: {
          id: generateTestId(),
          user_id: testUser.id,
          stripe_subscription_id: `sub_test_${generateTestId()}`,
          status: 'ACTIVE',
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create studio profile
      const studioProfile = await prisma.studio_profiles.create({
        data: {
          id: generateTestId(),
          user_id: testUser.id,
          studio_name: 'Test Studio',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const refundId = `re_test_${generateTestId()}`;
      const event = createRefundEvent(refundId, testPayment.amount);
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test-signature' },
        body: JSON.stringify(event),
      });

      await POST(request);

      // Verify subscription was cancelled
      const updatedSubscription = await prisma.subscriptions.findUnique({
        where: { id: subscription.id },
      });
      expect(updatedSubscription?.status).toBe('CANCELLED');
      expect(updatedSubscription?.cancelled_at).toBeTruthy();

      // Verify studio profile was set to INACTIVE
      const updatedStudio = await prisma.studio_profiles.findUnique({
        where: { id: studioProfile.id },
      });
      expect(updatedStudio?.status).toBe('INACTIVE');

      // Cleanup
      await prisma.subscriptions.delete({ where: { id: subscription.id } });
      await prisma.studio_profiles.delete({ where: { id: studioProfile.id } });
    });
  });

  describe('Processed By User Assignment', () => {
    it('should use admin user as processed_by when admin exists', async () => {
      const refundId = `re_test_${generateTestId()}`;
      const event = createRefundEvent(refundId, 5000);
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test-signature' },
        body: JSON.stringify(event),
      });

      await POST(request);

      const refundRecord = await prisma.refunds.findUnique({
        where: { stripe_refund_id: refundId },
      });
      expect(refundRecord?.processed_by).toBe(testAdmin.id);
    });

    it('should fallback to payment user_id if no admin exists', async () => {
      // Delete admin
      await prisma.users.delete({ where: { id: testAdmin.id } });

      const refundId = `re_test_${generateTestId()}`;
      const event = createRefundEvent(refundId, 5000);
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test-signature' },
        body: JSON.stringify(event),
      });

      await POST(request);

      const refundRecord = await prisma.refunds.findUnique({
        where: { stripe_refund_id: refundId },
      });
      expect(refundRecord?.processed_by).toBe(testUser.id); // Fallback to user

      // Recreate admin for other tests
      testAdmin = await createTestAdminInDb({
        email: generateTestEmail(testEmailPrefix),
        display_name: 'Test Admin',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle payment not found gracefully', async () => {
      const refundId = `re_test_${generateTestId()}`;
      const event = {
        ...createRefundEvent(refundId, 5000),
        data: {
          object: {
            ...createRefundEvent(refundId, 5000).data.object,
            payment_intent: 'pi_nonexistent',
          },
        },
      };

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test-signature' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200); // Should not error, just log and return

      // Verify no refund record was created
      const refundRecord = await prisma.refunds.findUnique({
        where: { stripe_refund_id: refundId },
      });
      expect(refundRecord).toBeNull();
    });

    it('should handle PENDING refund status from Stripe', async () => {
      const refundId = `re_test_${generateTestId()}`;
      const event = createRefundEvent(refundId, 5000, 'pending');
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test-signature' },
        body: JSON.stringify(event),
      });

      await POST(request);

      const refundRecord = await prisma.refunds.findUnique({
        where: { stripe_refund_id: refundId },
      });
      expect(refundRecord?.status).toBe(RefundStatus.PENDING);
    });
  });
});

