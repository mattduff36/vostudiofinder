import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * PUT /api/user/profile/images/[id]
 * Update image alt text
 * 
 * Request body:
 * {
 *   alt_text: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await request.json();

    // Get image and verify ownership
    const image = await db.studio_images.findUnique({
      where: { id },
      include: {
        studios: {
          select: {
            owner_id: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    if (image.studios.owner_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update image
    const updatedImage = await db.studio_images.update({
      where: { id },
      data: {
        alt_text: body.alt_text || '',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Image updated successfully',
      data: {
        id: updatedImage.id,
        image_url: updatedImage.image_url,
        alt_text: updatedImage.alt_text,
        sort_order: updatedImage.sort_order,
      },
    });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile/images/[id]
 * Delete studio image
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    // Get image and verify ownership
    const image = await db.studio_images.findUnique({
      where: { id },
      include: {
        studios: {
          select: {
            id: true,
            owner_id: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    if (image.studios.owner_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete from database
    await db.studio_images.delete({
      where: { id },
    });

    // Note: Cloudinary deletion could be added here
    // await deleteImage(imagePublicId);

    // Reorder remaining images
    const remainingImages = await db.studio_images.findMany({
      where: { studio_id: image.studios.id },
      orderBy: { sort_order: 'asc' },
    });

    // Update sort orders to be sequential
    await Promise.all(
      remainingImages.map((img, index) =>
        db.studio_images.update({
          where: { id: img.id },
          data: { sort_order: index },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}

