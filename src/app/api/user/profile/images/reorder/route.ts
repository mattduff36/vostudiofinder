import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * PUT /api/user/profile/images/reorder
 * Reorder studio images (for drag-and-drop)
 * 
 * Request body:
 * {
 *   images: Array<{ id: string, sort_order: number }>
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    if (!body.images || !Array.isArray(body.images)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Get user's active studio
    const studio = await db.studio_profiles.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
    });

    if (!studio) {
      return NextResponse.json(
        { success: false, error: 'No active studio found' },
        { status: 404 }
      );
    }

    // Verify all images belong to this studio
    const imageIds = body.images.map((img: any) => img.id);
    const images = await db.studio_images.findMany({
      where: {
        id: { in: imageIds },
        studio_id: studio.id,
      },
    });

    if (images.length !== imageIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some images do not belong to this studio' },
        { status: 403 }
      );
    }

    // Update sort order for each image
    await Promise.all(
      body.images.map((img: any) =>
        db.studio_images.update({
          where: { id: img.id },
          data: { sort_order: img.sort_order },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Images reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder images' },
      { status: 500 }
    );
  }
}

