import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const { isFeatured } = await request.json();

    // Update the studio featured status
    const updatedStudio = await db.studio_profiles.update({
      where: { id },
      data: { is_featured: isFeatured },
      select: {
        id: true,
        is_featured: true,
        name: true,
      }
    });

    return NextResponse.json({
      success: true,
      studio: updatedStudio,
      message: `Studio ${isFeatured ? 'featured' : 'unfeatured'}: ${updatedStudio.name}`
    });

  } catch (error) {
    console.error('Update featured status error:', error);
    return NextResponse.json(
      { error: 'Failed to update featured status' },
      { status: 500 }
    );
  }
}

