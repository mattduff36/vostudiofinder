import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { UserStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email is a string and has valid format
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }
    
    // Validate email length (RFC 5321 limit)
    if (email.length > 254) {
      return NextResponse.json(
        { error: 'Email address is too long' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { canResume: false, message: 'No account found with this email' },
        { status: 200 }
      );
    }

    // If ACTIVE, user already completed signup
    if (user.status === UserStatus.ACTIVE) {
      return NextResponse.json(
        {
          canResume: false,
          error: 'Account already exists. Please sign in instead.',
          isActive: true,
        },
        { status: 400 }
      );
    }

    // If EXPIRED, allow new signup
    if (user.status === UserStatus.EXPIRED) {
      return NextResponse.json(
        { canResume: false, message: 'Previous signup expired. You can create a new account.' },
        { status: 200 }
      );
    }

    // User is PENDING - check if reservation is still valid
    const now = new Date();
    const isExpired = user.reservation_expires_at && user.reservation_expires_at < now;

    if (isExpired) {
      // Mark as EXPIRED
      const expiredUsername = `expired_${user.username}_${Date.now()}_${user.id.substring(0, 4)}`;
      await db.users.update({
        where: { id: user.id },
        data: {
          status: UserStatus.EXPIRED,
          username: expiredUsername,
          updated_at: new Date(),
        },
      });

      return NextResponse.json(
        {
          canResume: false,
          message: 'Your reservation has expired. You can start a new signup.',
        },
        { status: 200 }
      );
    }

    // Reservation still valid - check signup progress
    const hasRealUsername = user.username && !user.username.startsWith('temp_');

    // Check if payment exists
    const payment = await db.payments.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    const hasPayment = payment?.status === 'SUCCEEDED';
    const sessionId = payment?.stripe_checkout_session_id || null;

    // Determine resume step
    let resumeStep: 'username' | 'payment' | 'profile' = 'username';
    if (hasPayment) {
      resumeStep = 'profile';
    } else if (hasRealUsername) {
      resumeStep = 'payment';
    }

    // Calculate time remaining
    const timeRemaining = user.reservation_expires_at
      ? Math.max(0, user.reservation_expires_at.getTime() - now.getTime())
      : 0;

    const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    console.log(`📋 Signup status check: ${email}, step: ${resumeStep}, days remaining: ${daysRemaining}`);

    return NextResponse.json(
      {
        canResume: true,
        resumeStep,
        hasUsername: hasRealUsername,
        hasPayment,
        sessionId, // Include session_id for profile step navigation
        user: {
          id: user.id,
          email: user.email,
          username: hasRealUsername ? user.username : null,
          display_name: user.display_name,
          status: user.status,
          reservation_expires_at: user.reservation_expires_at,
        },
        timeRemaining: {
          days: daysRemaining,
          hours: hoursRemaining,
          total: timeRemaining,
        },
        message: 'You have an incomplete signup. Continue where you left off!',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check signup status error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

