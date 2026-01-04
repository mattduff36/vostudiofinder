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

    // If trying to feature this studio, check the 6-studio limit
    if (isFeatured) {
      // Get current studio's featured status
      const currentStudio = await db.studio_profiles.findUnique({
        where: { id },
        select: { is_featured: true }
      });

      // Only check limit if studio is not already featured
      if (!currentStudio?.is_featured) {
        const featuredCount = await db.studio_profiles.count({
          where: { is_featured: true }
        });
        
        if (featuredCount >= 6) {
          return NextResponse.json({
            error: 'Maximum of 6 featured studios reached. Please unfeature another studio first.'
          }, { status: 400 });
        }
      }
    }

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

