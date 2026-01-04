import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { isVisible } = await request.json();

    // Update the studio profile visibility
    const updatedStudio = await db.studio_profiles.update({
      where: { id: params.id },
      data: { is_profile_visible: isVisible },
      select: {
        id: true,
        is_profile_visible: true,
        name: true,
      }
    });

    return NextResponse.json({
      success: true,
      studio: updatedStudio,
      message: `Profile visibility ${isVisible ? 'enabled' : 'disabled'} for ${updatedStudio.name}`
    });

  } catch (error) {
    console.error('Update visibility error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile visibility' },
      { status: 500 }
    );
  }
}

