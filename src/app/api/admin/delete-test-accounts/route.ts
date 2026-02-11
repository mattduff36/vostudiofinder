import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { TEST_EMAIL_DOMAIN } from '@/lib/admin/test-data-generator';

/**
 * Admin-only endpoint to delete all test accounts.
 * Identifies test accounts by the @vostudiofinder-test.com email domain.
 * 
 * DELETE /api/admin/delete-test-accounts
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy';
    if (!session?.user || !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Find all test accounts by email domain
    const testUsers = await db.users.findMany({
      where: {
        email: {
          endsWith: `@${TEST_EMAIL_DOMAIN}`,
        },
      },
      select: { id: true, email: true },
    });

    if (testUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No test accounts found to delete.',
        deletedCount: 0,
      });
    }

    const userIds = testUsers.map(u => u.id);

    console.log(`🧹 Deleting ${testUsers.length} test account(s):`, testUsers.map(u => u.email));

    // Delete users — cascade will handle studio_profiles, studio_studio_types, etc.
    const deleteResult = await db.users.deleteMany({
      where: { id: { in: userIds } },
    });

    console.log(`✅ Deleted ${deleteResult.count} test account(s)`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.count} test account(s).`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('❌ Error deleting test accounts:', error);
    handleApiError(error, 'Delete test accounts failed');

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete test accounts' },
      { status: 500 }
    );
  }
}
