/**
 * Integration Tests for Refund API
 * 
 * Tests the POST /api/admin/payments/[id]/refund endpoint
 * 
 * Coverage:
 * - Full refunds
 * - Partial refunds
 * - Validation (amount, authorization, payment existence)
 * - Error handling
 * - Payment status updates
 * - Membership cancellation on full refund
 * - Refund record creation
 */

// @jest-environment node
import { POST } from '@/app/api/admin/payments/[id]/refund/route';
import { NextRequest } from 'next/server';
import {
  createTestUserInDb,
  createTestAdminInDb,
  createTestPaymentInDb,
  createTestRefundInDb,
  cleanupTestUserData,
  disconnectDb,
  generateTestId,
  prisma,
} from '../../__helpers__/test-db';
import { UserStatus, PaymentStatus, RefundStatus } from '@prisma/client';

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
      create: jest.fn(),
    },
  },
}));
import { stripe } from '@/lib/stripe';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));
import { getServerSession } from 'next-auth';

describe('POST /api/admin/payments/[id]/refund', () => {
  const testEmailPrefix = `refund_test_${Date.now()}`;
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

    // Mock admin session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: testAdmin.id,
        email: testAdmin.email,
        role: 'ADMIN',
      },
    });

    // Reset Stripe mock
    (stripe.refunds.create as jest.Mock).mockClear();
  });

  afterAll(async () => {
    // Clean up all test data
    if (testUser) await cleanupTestUserData(testUser.id);
    if (testAdmin) await cleanupTestUserData(testAdmin.id);
    await disconnectDb();
  });

  describe('Authorization', () => {
    it('should return 403 if user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 5000, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: testUser.id,
          email: testUser.email,
          role: 'USER',
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 5000, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Validation', () => {
    it('should return 400 if amount is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Valid refund amount is required');
    });

    it('should return 400 if amount is zero', async () => {
      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 0, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Valid refund amount is required');
    });

    it('should return 400 if amount is negative', async () => {
      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: -1000, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Valid refund amount is required');
    });

    it('should return 404 if payment does not exist', async () => {
      const nonExistentId = generateTestId();
      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${nonExistentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 5000, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: nonExistentId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Payment not found');
    });

    it('should return 400 if payment has no payment intent ID', async () => {
      const paymentWithoutIntent = await createTestPaymentInDb({
        user_id: testUser.id,
        stripe_payment_intent_id: null as any,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${paymentWithoutIntent.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 5000, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: paymentWithoutIntent.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot refund: No payment intent ID');

      // Cleanup
      await prisma.payments.delete({ where: { id: paymentWithoutIntent.id } });
    });

    it('should return 400 if refund amount exceeds available balance', async () => {
      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 15000, reason: 'requested_by_customer' }), // More than payment amount
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Refund amount exceeds available balance');
    });

    it('should return 400 if refund amount exceeds remaining refundable amount', async () => {
      // Create payment with partial refund already applied
      const partiallyRefundedPayment = await createTestPaymentInDb({
        user_id: testUser.id,
        amount: 10000,
        refunded_amount: 3000, // Already refunded £30
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${partiallyRefundedPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 8000, reason: 'requested_by_customer' }), // More than remaining £70
      });

      const response = await POST(request, { params: Promise.resolve({ id: partiallyRefundedPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Refund amount exceeds available balance');

      // Cleanup
      await prisma.payments.delete({ where: { id: partiallyRefundedPayment.id } });
    });
  });

  describe('Partial Refunds', () => {
    it('should successfully process a partial refund', async () => {
      const refundAmount = 5000; // £50.00
      const mockStripeRefund = {
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      };

      (stripe.refunds.create as jest.Mock).mockResolvedValue(mockStripeRefund);

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.refund.amount).toBe(refundAmount);
      expect(data.refund.is_full_refund).toBe(false);
      expect(data.payment.status).toBe('PARTIALLY_REFUNDED');
      expect(data.payment.refunded_amount).toBe(refundAmount);

      // Verify Stripe was called correctly
      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: testPayment.stripe_payment_intent_id,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          admin_id: testAdmin.id,
          admin_email: testAdmin.email,
          payment_id: testPayment.id,
        },
      });

      // Verify payment was updated in database
      const updatedPayment = await prisma.payments.findUnique({
        where: { id: testPayment.id },
      });
      expect(updatedPayment?.refunded_amount).toBe(refundAmount);
      expect(updatedPayment?.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);

      // Verify refund record was created
      const refundRecord = await prisma.refunds.findFirst({
        where: { stripe_refund_id: mockStripeRefund.id },
      });
      expect(refundRecord).toBeTruthy();
      expect(refundRecord?.amount).toBe(refundAmount);
      expect(refundRecord?.status).toBe(RefundStatus.SUCCEEDED);
      expect(refundRecord?.processed_by).toBe(testAdmin.id);
      expect(refundRecord?.payment_id).toBe(testPayment.id);
    });

    it('should handle multiple partial refunds', async () => {
      const firstRefund = 3000; // £30.00
      const secondRefund = 4000; // £40.00

      // First refund
      (stripe.refunds.create as jest.Mock).mockResolvedValueOnce({
        id: `re_test_1_${generateTestId()}`,
        status: 'succeeded',
        amount: firstRefund,
      });

      const request1 = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: firstRefund, reason: 'duplicate' }),
      });

      const response1 = await POST(request1, { params: Promise.resolve({ id: testPayment.id }) });
      expect(response1.status).toBe(200);

      // Second refund
      (stripe.refunds.create as jest.Mock).mockResolvedValueOnce({
        id: `re_test_2_${generateTestId()}`,
        status: 'succeeded',
        amount: secondRefund,
      });

      const request2 = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: secondRefund, reason: 'requested_by_customer' }),
      });

      const response2 = await POST(request2, { params: Promise.resolve({ id: testPayment.id }) });
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.payment.refunded_amount).toBe(firstRefund + secondRefund);
      expect(data2.payment.status).toBe('PARTIALLY_REFUNDED'); // Still partial, not full

      // Verify final payment state
      const finalPayment = await prisma.payments.findUnique({
        where: { id: testPayment.id },
      });
      expect(finalPayment?.refunded_amount).toBe(firstRefund + secondRefund);
    });
  });

  describe('Full Refunds', () => {
    it('should successfully process a full refund', async () => {
      const refundAmount = testPayment.amount; // Full amount
      const mockStripeRefund = {
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      };

      (stripe.refunds.create as jest.Mock).mockResolvedValue(mockStripeRefund);

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.refund.is_full_refund).toBe(true);
      expect(data.payment.status).toBe('REFUNDED');
      expect(data.payment.refunded_amount).toBe(refundAmount);

      // Verify payment status
      const updatedPayment = await prisma.payments.findUnique({
        where: { id: testPayment.id },
      });
      expect(updatedPayment?.status).toBe(PaymentStatus.REFUNDED);
    });

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

      const refundAmount = testPayment.amount;
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      expect(response.status).toBe(200);

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

    it('should not cancel membership if user_id is PENDING', async () => {
      // Create payment with PENDING user_id (legacy case)
      const pendingPayment = await createTestPaymentInDb({
        user_id: 'PENDING' as any,
        amount: 10000,
      });

      const refundAmount = pendingPayment.amount;
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${pendingPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: pendingPayment.id }) });
      expect(response.status).toBe(200);

      // Verify refund was still processed
      const data = await response.json();
      expect(data.success).toBe(true);

      // Cleanup
      await prisma.payments.delete({ where: { id: pendingPayment.id } });
    });
  });

  describe('Refund Reasons', () => {
    it('should accept requested_by_customer reason', async () => {
      const refundAmount = 5000;
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      expect(response.status).toBe(200);

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'requested_by_customer',
        })
      );
    });

    it('should accept duplicate reason', async () => {
      const refundAmount = 5000;
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'duplicate' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      expect(response.status).toBe(200);

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'duplicate',
        })
      );
    });

    it('should accept fraudulent reason', async () => {
      const refundAmount = 5000;
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'fraudulent' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      expect(response.status).toBe(200);

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'fraudulent',
        })
      );
    });

    it('should default to requested_by_customer if reason is not provided', async () => {
      const refundAmount = 5000;
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: `re_test_${generateTestId()}`,
        status: 'succeeded',
        amount: refundAmount,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      expect(response.status).toBe(200);

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'requested_by_customer',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors', async () => {
      const stripeError = new Error('Stripe API error');
      (stripeError as any).type = 'StripeInvalidRequestError';
      (stripe.refunds.create as jest.Mock).mockRejectedValue(stripeError);

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 5000, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });

    it('should handle generic errors', async () => {
      (stripe.refunds.create as jest.Mock).mockRejectedValue(new Error('Generic error'));

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: 5000, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to issue refund');
    });

    it('should handle PENDING refund status from Stripe', async () => {
      const refundAmount = 5000;
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: `re_test_${generateTestId()}`,
        status: 'pending', // Stripe returns pending status
        amount: refundAmount,
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/payments/${testPayment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: refundAmount, reason: 'requested_by_customer' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testPayment.id }) });
      expect(response.status).toBe(200);

      // Verify refund record has PENDING status
      const refundRecord = await prisma.refunds.findFirst({
        where: { payment_id: testPayment.id },
        orderBy: { created_at: 'desc' },
      });
      expect(refundRecord?.status).toBe(RefundStatus.PENDING);
    });
  });
});

