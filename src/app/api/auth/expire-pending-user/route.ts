import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { UserStatus } from '@prisma/client';

/**
 * API endpoint to expire a PENDING user when they choose to "Start Fresh"
 * This marks their username as expired and updates their status to prevent resume
 */
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
      return NextResponse.json(
        { error: 'Can only expire PENDING accounts' },
        { status: 400 }
      );
    }

    // Mark user as expired by updating username and status
    const expiredUsername = `expired_${user.username}_${Date.now()}`;
    
    await db.users.update({
      where: { id: user.id },
      data: {
        username: expiredUsername,
        status: UserStatus.EXPIRED,
        reservation_expires_at: new Date(), // Set to now to mark as immediately expired
        updated_at: new Date(),
      },
    });

    console.log(`✅ User marked as EXPIRED: ${user.email} (username: ${user.username} -> ${expiredUsername})`);

    return NextResponse.json(
      {
        success: true,
        message: 'Account expired successfully. You can now start a fresh signup.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Expire pending user error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

