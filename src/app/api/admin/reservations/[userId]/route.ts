import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';

/**
 * DELETE /api/admin/reservations/[userId]
 * Delete a username reservation and prevent future reminder emails
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find the user
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow deletion of PENDING or EXPIRED users
    if (user.status !== UserStatus.PENDING && user.status !== UserStatus.EXPIRED) {
      return NextResponse.json(
        { error: 'Can only delete PENDING or EXPIRED reservations' },
        { status: 400 }
      );
    }

    // Mark user as EXPIRED and prevent future reminder emails
    // Set email flags to prevent cron job from sending reminders
    const now = new Date();
    const expiredUsername = `expired_${user.username}_${Date.now()}`;

    await db.users.update({
      where: { id: userId },
      data: {
        username: expiredUsername,
        status: UserStatus.EXPIRED,
        reservation_expires_at: now, // Set to now to mark as immediately expired
        // Prevent all future reminder emails by setting these flags
        day2_reminder_sent_at: now, // Mark as sent to prevent Day 2 email
        day5_reminder_sent_at: now, // Mark as sent to prevent Day 5 email
        failed_payment_email_sent_at: now, // Mark as sent to prevent failed payment email
        updated_at: now,
      },
    });

    console.log(`✅ Admin deleted reservation for user ${user.email} (${user.username})`);

    return NextResponse.json({
      success: true,
      message: 'Reservation deleted successfully. Reminder emails have been disabled.',
    });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    );
  }
}

