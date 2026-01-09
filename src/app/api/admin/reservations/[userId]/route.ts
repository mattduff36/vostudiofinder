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
  _request: NextRequest,
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
    // Order matters to avoid foreign key constraint violations
    await db.$transaction(async (tx) => {
      // 1. Get studio profiles first (needed for reviews deletion)
      const studioProfiles = await tx.studio_profiles.findMany({
        where: { user_id: userId },
        select: { id: true },
      });
      const studioIds = studioProfiles.map(s => s.id);

      // 2. Delete review responses (they reference reviews)
      await tx.review_responses.deleteMany({
        where: { author_id: userId },
      });

      // 3. Delete reviews (as reviewer or owner, or for user's studios)
      if (studioIds.length > 0) {
        await tx.reviews.deleteMany({
          where: {
            OR: [
              { reviewer_id: userId },
              { owner_id: userId },
              { studio_id: { in: studioIds } },
            ],
          },
        });
      } else {
        await tx.reviews.deleteMany({
          where: {
            OR: [
              { reviewer_id: userId },
              { owner_id: userId },
            ],
          },
        });
      }

      // 4. Delete content reports (as reporter, reported user, or reviewer)
      await tx.content_reports.deleteMany({
        where: {
          OR: [
            { reporter_id: userId },
            { reported_user_id: userId },
            { reviewed_by_id: userId },
          ],
        },
      });

      // 5. Delete messages (as sender or receiver)
      await tx.messages.deleteMany({
        where: {
          OR: [
            { sender_id: userId },
            { receiver_id: userId },
          ],
        },
      });

      // 6. Delete user connections (as user or connected user)
      await tx.user_connections.deleteMany({
        where: {
          OR: [
            { user_id: userId },
            { connected_user_id: userId },
          ],
        },
      });

      // 7. Delete notifications
      await tx.notifications.deleteMany({
        where: { user_id: userId },
      });

      // 8. Delete subscriptions
      await tx.subscriptions.deleteMany({
        where: { user_id: userId },
      });

      // 9. Delete pending subscriptions
      await tx.pending_subscriptions.deleteMany({
        where: { user_id: userId },
      });

      // 10. Delete saved searches
      await tx.saved_searches.deleteMany({
        where: { user_id: userId },
      });

      // 11. Delete support tickets
      await tx.support_tickets.deleteMany({
        where: { user_id: userId },
      });

      // 12. Delete accounts (OAuth accounts)
      await tx.accounts.deleteMany({
        where: { user_id: userId },
      });

      // 13. Delete sessions
      await tx.sessions.deleteMany({
        where: { user_id: userId },
      });

      // 14. Delete user metadata
      await tx.user_metadata.deleteMany({
        where: { user_id: userId },
      });

      // 15. Get all payment IDs for this user
      const payments = await tx.payments.findMany({
        where: { user_id: userId },
        select: { id: true },
      });
      const paymentIds = payments.map(p => p.id);

      // 16. Delete refunds (by user_id or payment_id)
      // Use OR to catch refunds linked directly to user or via payments
      const refundConditions: Array<{ user_id: string } | { payment_id: { in: string[] } }> = [
        { user_id: userId },
      ];
      if (paymentIds.length > 0) {
        refundConditions.push({ payment_id: { in: paymentIds } });
      }
      await tx.refunds.deleteMany({
        where: {
          OR: refundConditions,
        },
      });

      // 17. Delete payments
      await tx.payments.deleteMany({
        where: { user_id: userId },
      });

      // 18. Delete studio-related data (if not already deleted above)
      if (studioIds.length > 0) {
        // Delete studio services
        await tx.studio_services.deleteMany({
          where: { studio_id: { in: studioIds } },
        });

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

      // 19. Finally, delete the user
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

