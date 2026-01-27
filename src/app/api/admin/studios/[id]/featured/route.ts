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
    const { isFeatured, featuredUntil } = await request.json();

    // If trying to feature this studio, validate expiry date and check the 6-studio limit
    if (isFeatured) {
      // Require featured expiry date
      if (!featuredUntil) {
        return NextResponse.json({
          error: 'Featured expiry date is required when featuring a studio'
        }, { status: 400 });
      }

      // Validate expiry date is in the future
      const expiryDate = new Date(featuredUntil);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return NextResponse.json({
          error: 'Featured expiry date must be a valid future date'
        }, { status: 400 });
      }

      // Get current studio's featured status
      const currentStudio = await db.studio_profiles.findUnique({
        where: { id },
        select: { is_featured: true }
      });

      // Only check limit if studio is not already featured
      if (!currentStudio?.is_featured) {
        const now = new Date();
        const featuredCount = await db.studio_profiles.count({
          where: { 
            is_featured: true,
            OR: [
              { featured_until: null },
              { featured_until: { gte: now } }
            ]
          }
        });
        
        if (featuredCount >= 6) {
          return NextResponse.json({
            error: 'Maximum of 6 featured studios reached. Please unfeature another studio first.'
          }, { status: 400 });
        }
      }
    }

    // Update the studio featured status and expiry
    const updateData: any = { is_featured: isFeatured };
    if (isFeatured && featuredUntil) {
      updateData.featured_until = new Date(featuredUntil);
    } else if (!isFeatured) {
      updateData.featured_until = null;
    }

    const updatedStudio = await db.studio_profiles.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        is_featured: true,
        featured_until: true,
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

