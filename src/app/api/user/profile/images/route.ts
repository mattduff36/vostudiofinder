import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadImage } from '@/lib/cloudinary';

/**
 * POST /api/user/profile/images
 * Upload a new studio image
 * 
 * Expects multipart/form-data with:
 * - file: Image file (required)
 * - alt_text: Alt text for accessibility (optional)
 */
export async function POST(request: NextRequest) {
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

    // Check current image count
    const imageCount = await db.studio_images.count({
      where: { studio_id: studio.id },
    });

    if (imageCount >= 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 10 images allowed per studio' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt_text = formData.get('alt_text') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 413 }
      );
    }

    // Upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cloudinaryResult = await uploadImage(buffer, {
      folder: `studios/${studio.id}`,
      transformation: [
        { width: 1200, height: 800, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    // Create database record
    const { randomBytes } = await import('crypto');
    const imageId = randomBytes(12).toString('hex');
    
    const newImage = await db.studio_images.create({
      data: {
        id: imageId,
        studio_id: studio.id,
        image_url: cloudinaryResult.secure_url,
        alt_text: alt_text || '',
        sort_order: imageCount, // Append to end
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        id: newImage.id,
        image_url: newImage.image_url,
        alt_text: newImage.alt_text,
        sort_order: newImage.sort_order,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

