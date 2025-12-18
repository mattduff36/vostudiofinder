import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * DEV ONLY: Delete a test user and their studio profile
 * This endpoint should be removed or protected in production
 */
export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const username = searchParams.get('username');

    if (!email && !username) {
      return NextResponse.json(
        { error: 'Email or username required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Looking for user: ${email || username}...`);

    // Find the user
    const user = await db.users.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          username ? { username: { equals: username, mode: 'insensitive' } } : undefined,
        ].filter(Boolean) as any
      },
      include: {
        studio_profiles: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found - nothing to delete' },
        { status: 404 }
      );
    }

    console.log(`✅ Found user: ${user.email} (${user.username})`);

    const deletedItems: string[] = [];

    // Delete studio profile and related data if exists
    if (user.studio_profiles) {
      console.log('🗑️  Deleting studio profile...');
      
      // Delete studio images
      const imagesDeleted = await db.studio_images.deleteMany({
        where: { studio_id: user.studio_profiles.id }
      });
      console.log(`  ✅ Deleted ${imagesDeleted.count} studio images`);
      deletedItems.push(`${imagesDeleted.count} images`);

      // Delete studio types
      const typesDeleted = await db.studio_studio_types.deleteMany({
        where: { studio_id: user.studio_profiles.id }
      });
      console.log(`  ✅ Deleted ${typesDeleted.count} studio types`);
      deletedItems.push(`${typesDeleted.count} studio types`);

      // Delete studio profile
      await db.studio_profiles.delete({
        where: { id: user.studio_profiles.id }
      });
      console.log('  ✅ Deleted studio profile');
      deletedItems.push('studio profile');
    }

    // Delete the user (this will cascade delete accounts, sessions, etc.)
    await db.users.delete({
      where: { id: user.id }
    });
    console.log('✅ Deleted user account');
    deletedItems.push('user account');

    console.log('✨ Cleanup complete!');

    return NextResponse.json({
      success: true,
      message: 'User and related data deleted successfully',
      deleted: {
        email: user.email,
        username: user.username,
        items: deletedItems
      }
    });
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}
