import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProfileVisibilityEligibility } from '@/lib/utils/profile-visibility';

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

    // Prevent enabling visibility unless required fields are complete
    // Exception: legacy profiles (created before 2026-01-01) can enable visibility regardless
    if (isVisible === true) {
      const eligibility = await getProfileVisibilityEligibility(userId);
      if (!eligibility.allRequiredComplete && !eligibility.isLegacyProfile) {
        return NextResponse.json(
          {
            success: false,
            error: 'Complete all required profile fields before making your profile visible.',
            isVisible: false,
            required: eligibility.stats.required,
          },
          { status: 400 }
        );
      }
    }

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
      message: `Profile is now ${updatedProfile.is_profile_visible ? 'visible' : 'hidden'}`
    });

  } catch (error) {
    console.error('Update visibility error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile visibility' },
      { status: 500 }
    );
  }
}
