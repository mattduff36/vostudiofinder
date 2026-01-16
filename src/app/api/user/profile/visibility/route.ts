import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * PATCH /api/user/profile/visibility
 * Toggle profile visibility for the authenticated user
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { isVisible } = await request.json();

    // Update the studio profile visibility
    const updatedProfile = await db.studio_profiles.update({
      where: { user_id: userId },
      data: { 
        is_profile_visible: isVisible,
        updated_at: new Date(),
      },
      select: {
        id: true,
        is_profile_visible: true,
        name: true,
      }
    });

    return NextResponse.json({
      success: true,
      isVisible: updatedProfile.is_profile_visible,
      message: `Profile is now ${isVisible ? 'visible' : 'hidden'}`
    });

  } catch (error) {
    console.error('Update visibility error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile visibility' },
      { status: 500 }
    );
  }
}
