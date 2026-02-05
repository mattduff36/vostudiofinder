import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user exists and is in PENDING status
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        membership_tier: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status === UserStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'User is already active' },
        { status: 400 }
      );
    }

    // Update user to ACTIVE status with BASIC tier
    await db.users.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        membership_tier: 'BASIC',
        payment_attempted_at: new Date(),
        reservation_expires_at: null, // Clear reservation
      },
    });

    console.log(`✅ User ${userId} activated with BASIC (free) membership`);

    return NextResponse.json({
      success: true,
      message: 'Basic membership activated successfully',
    });
  } catch (error) {
    console.error('Error completing basic signup:', error);
    return NextResponse.json(
      { error: 'Failed to complete signup' },
      { status: 500 }
    );
  }
}
