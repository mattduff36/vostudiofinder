import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { UserStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'User ID or email is required' },
        { status: 400 }
      );
    }

    // Validate email if provided (not just check if both are missing)
    if (!userId && (!email || typeof email !== 'string' || !email.trim())) {
      return NextResponse.json(
        { error: 'Valid email is required when userId is not provided' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.users.findFirst({
      where: userId
        ? { id: userId }
        : { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check user status
    if (user.status === UserStatus.ACTIVE) {
      return NextResponse.json(
        {
          hasPayment: true,
          paymentStatus: 'succeeded',
          canResume: false,
          message: 'Account is already active',
        },
        { status: 200 }
      );
    }

    if (user.status === UserStatus.EXPIRED) {
      return NextResponse.json(
        {
          hasPayment: false,
          paymentStatus: 'none',
          canResume: false,
          message: 'Reservation expired',
        },
        { status: 200 }
      );
    }

    // User is PENDING - check for payment
    const payment = await db.payments.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    if (!payment) {
      return NextResponse.json(
        {
          hasPayment: false,
          paymentStatus: 'none',
          canResume: true,
          resumeStep: 'payment',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            display_name: user.display_name,
          },
          message: 'No payment found',
        },
        { status: 200 }
      );
    }

    // Payment exists - determine status
    const paymentStatus = payment.status === 'SUCCEEDED'
      ? 'succeeded'
      : payment.status === 'FAILED'
      ? 'failed'
      : 'pending';

    const resumeStep = paymentStatus === 'succeeded' ? 'profile' : 'payment';

    console.log(`💳 Payment status check: ${user.email}, payment: ${paymentStatus}, resume: ${resumeStep}`);

    return NextResponse.json(
      {
        hasPayment: true,
        paymentStatus,
        sessionId: payment.stripe_checkout_session_id,
        canResume: true,
        resumeStep,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
        },
        message: paymentStatus === 'succeeded'
          ? 'Payment succeeded - ready for profile creation'
          : 'Payment pending or failed',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check payment status error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

