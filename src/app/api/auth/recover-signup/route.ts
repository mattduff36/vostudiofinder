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

    // Find PENDING user
    const user = await db.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    if (user.status !== UserStatus.PENDING) {
      if (user.status === UserStatus.ACTIVE) {
        return NextResponse.json(
          { error: 'Account is already active. Please sign in instead.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Cannot recover this account' },
        { status: 400 }
      );
    }

    // Check if reservation is still valid
    const now = new Date();
    const isExpired = user.reservation_expires_at && user.reservation_expires_at < now;

    if (isExpired) {
      return NextResponse.json(
        { error: 'Your reservation has expired. Please start a new signup.' },
        { status: 410 }
      );
    }

    // Check signup progress
    const hasRealUsername = user.username && !user.username.startsWith('temp_');

    const payment = await db.payments.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    const hasPayment = payment?.status === 'SUCCEEDED';

    // Determine recovery URL
    let recoveryUrl = '';
    if (hasPayment) {
      // Go to profile creation
      const sessionId = payment.stripe_checkout_session_id || '';
      recoveryUrl = `/auth/membership/success?session_id=${sessionId}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.display_name)}&username=${encodeURIComponent(user.username)}`;
    } else if (hasRealUsername) {
      // Go to payment
      const params = new URLSearchParams();
      params.set('userId', user.id);
      params.set('email', user.email);
      params.set('name', user.display_name);
      params.set('username', user.username);
      recoveryUrl = `/auth/membership?${params.toString()}`;
    } else {
      // Go to username selection
      recoveryUrl = `/auth/username-selection?display_name=${encodeURIComponent(user.display_name)}`;
    }

    console.log(`🔄 Recovery URL generated for ${user.email}: ${recoveryUrl}`);

    // In production, you would send an email with the recovery link
    // For now, just return the recovery information
    return NextResponse.json(
      {
        success: true,
        message: 'Recovery information retrieved',
        recoveryUrl,
        user: {
          email: user.email,
          display_name: user.display_name,
        },
        nextStep: hasPayment ? 'profile' : hasRealUsername ? 'payment' : 'username',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Recover signup error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

