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

    const { isVerified } = await request.json();

    // Update the studio profile verified status
    const updatedStudio = await db.studio_profiles.update({
      where: { id: params.id },
      data: { is_verified: isVerified },
      select: {
        id: true,
        is_verified: true,
        name: true,
      }
    });

    return NextResponse.json({
      success: true,
      studio: updatedStudio,
      message: `Studio ${isVerified ? 'verified' : 'unverified'}: ${updatedStudio.name}`
    });

  } catch (error) {
    console.error('Update verified status error:', error);
    return NextResponse.json(
      { error: 'Failed to update verified status' },
      { status: 500 }
    );
  }
}

