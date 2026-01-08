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

    // Delete user and all associated data in a transaction
    // This will cascade delete:
    // - All payment records
    // - All studio profiles and related data (images, types, etc.)
    // - All verification tokens
    // - All reminder email tracking
    await db.$transaction(async (tx) => {
      // 1. Get all payment IDs for this user
      const payments = await tx.payments.findMany({
        where: { user_id: userId },
        select: { id: true },
      });

      const paymentIds = payments.map(p => p.id);

      // 2. Delete refunds first (if any exist)
      if (paymentIds.length > 0) {
        await tx.refunds.deleteMany({
          where: {
            OR: [
              { user_id: userId },
              { payment_id: { in: paymentIds } },
            ],
          },
        });
      }

      // 3. Delete payments
      await tx.payments.deleteMany({
        where: { user_id: userId },
      });

      // 4. Get all studio profiles for this user
      const studioProfiles = await tx.studio_profiles.findMany({
        where: { user_id: userId },
        select: { id: true },
      });

      const studioIds = studioProfiles.map(s => s.id);

      // 5. Delete studio-related data
      if (studioIds.length > 0) {
        // Delete studio types
        await tx.studio_studio_types.deleteMany({
          where: { studio_id: { in: studioIds } },
        });

        // Delete studio images
        await tx.studio_images.deleteMany({
          where: { studio_id: { in: studioIds } },
        });

        // Delete studio profiles
        await tx.studio_profiles.deleteMany({
          where: { id: { in: studioIds } },
        });
      }

      // 6. Finally, delete the user
      await tx.users.delete({
        where: { id: userId },
      });
    });

    console.log(`✅ Admin permanently deleted user ${user.email} (@${user.username}) and all associated data`);

    return NextResponse.json({
      success: true,
      message: 'User reservation deleted permanently. All data and reminder emails removed.',
    });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    );
  }
}

